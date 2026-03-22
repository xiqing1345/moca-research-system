import { prisma } from "@/lib/prisma/client";
import { calculateAutoScore } from "@/lib/scoring/autoScore";
import { scoreDrawingWithVision, scoreAudioWithVision } from "@/lib/openai";
import { SaveTaskRequest } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body: SaveTaskRequest = await req.json();

    const {
      taskNumber,
      raw,
      events,
      artifacts,
      startedAt,
      endedAt,
      currentTask,
      needsReview,
    } = body;

    const rawJson = raw !== undefined ? (JSON.parse(JSON.stringify(raw)) as any) : undefined;
    let eventsJson = events !== undefined ? (JSON.parse(JSON.stringify(events)) as any) : undefined;
    const artifactsJson = artifacts !== undefined ? (JSON.parse(JSON.stringify(artifacts)) as any) : undefined;

    // Calculate rule-based score first.
    let autoScore = body.autoScore;
    if (autoScore === undefined && raw) {
      autoScore = calculateAutoScore(taskNumber, raw) ?? undefined;
    }

    // For drawing tasks, try AI vision scoring and blend with rule-based score.
    if ((taskNumber === 2 || taskNumber === 3) && typeof autoScore === "number") {
      try {
        const files = Array.isArray((artifactsJson as any)?.files) ? (artifactsJson as any).files : [];
        const latestImage = [...files]
          .reverse()
          .find((f: any) => f?.kind === "png" && typeof f?.path === "string");

        if (latestImage?.path) {
          const maxScore = taskNumber === 2 ? 1 : 3;
          const ai = await scoreDrawingWithVision({
            taskNumber: taskNumber as 2 | 3,
            baseScore: autoScore,
            maxScore,
            raw,
            artifactPath: String(latestImage.path),
          });

          if (ai && typeof ai.fusedScore === "number") {
            autoScore = ai.fusedScore;
            const existingEvents = Array.isArray(eventsJson) ? eventsJson : [];
            eventsJson = [
              ...existingEvents,
              {
                type: "click",
                t: Date.now(),
                taskNumber,
                meta: {
                  action: "ai_vision_scored",
                  baseScore: ai.baseScore,
                  aiScore: ai.aiScore,
                  fusedScore: ai.fusedScore,
                  confidence: ai.confidence,
                  model: ai.model,
                  reason: ai.reason,
                },
              },
            ];
          }
        }
      } catch (aiError) {
        console.error("AI vision scoring failed, fallback to rule score:", aiError);
      }
    }

    // For Task 7, try AI audio scoring to evaluate sentence repetition.
    if (taskNumber === 7) {
      try {
        const files = Array.isArray((artifactsJson as any)?.files) ? (artifactsJson as any).files : [];
        const audio1 = files.find((f: any) => f?.kind === "audio" && f?.meta?.item === 1 && f?.path);
        const audio2 = files.find((f: any) => f?.kind === "audio" && f?.meta?.item === 2 && f?.path);

        if (audio1?.path && audio2?.path) {
          const audioScore = await scoreAudioWithVision({
            audioPath1: String(audio1.path),
            audioPath2: String(audio2.path),
          });

          if (audioScore) {
            const finalScore = Number(audioScore.sentence1Score) + Number(audioScore.sentence2Score);
            autoScore = finalScore;
            const existingEvents = Array.isArray(eventsJson) ? eventsJson : [];
            eventsJson = [
              ...existingEvents,
              {
                type: "click",
                t: Date.now(),
                taskNumber,
                meta: {
                  action: "ai_audio_scored",
                  sentence1Score: audioScore.sentence1Score,
                  sentence2Score: audioScore.sentence2Score,
                  sentence1Reason: audioScore.sentence1Reason,
                  sentence2Reason: audioScore.sentence2Reason,
                  confidence: audioScore.confidence,
                  model: audioScore.model,
                  finalScore,
                },
              },
            ];
          }
        }
      } catch (aiError) {
        console.error("AI audio scoring failed, fallback to default:", aiError);
      }
    }

    // Upsert task response
    const response = await prisma.taskResponse.upsert({
      where: {
        sessionId_taskNumber: {
          sessionId,
          taskNumber,
        },
      },
      update: {
        raw: rawJson,
        events: eventsJson,
        artifacts: artifactsJson,
        autoScore: autoScore,
        needsReview: needsReview ?? false,
        endedAt: endedAt ? new Date(endedAt) : undefined,
      },
      create: {
        sessionId,
        taskNumber,
        raw: rawJson,
        events: eventsJson,
        artifacts: artifactsJson,
        startedAt: startedAt ? new Date(startedAt) : new Date(),
        endedAt: endedAt ? new Date(endedAt) : undefined,
        autoScore: autoScore,
        needsReview: needsReview ?? false,
      },
    });

    // Update session currentTask if provided
    if (currentTask !== undefined) {
      const existing = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { currentTask: true, status: true },
      });

      const nextCurrent = Math.max(existing?.currentTask ?? 0, currentTask);

      await prisma.session.update({
        where: { id: sessionId },
        data: {
          currentTask: nextCurrent,
          status: existing?.status === "submitted" ? "submitted" : "task",
        },
      });
    }

    // If Task 5 includes memory word list id, persist it on session
    if (taskNumber === 5) {
      const wordListId = (rawJson as any)?.memoryImmediate?.wordListId;
      if (typeof wordListId === "string" && wordListId.length > 0) {
        await prisma.session.update({
          where: { id: sessionId },
          data: {
            memoryWordListId: wordListId,
          },
        });
      }
    }

    return NextResponse.json({
      ok: true,
      taskNumber,
      autoScore,
    });
  } catch (error) {
    console.error("Error saving task response:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to save task response" },
      { status: 500 }
    );
  }
}
