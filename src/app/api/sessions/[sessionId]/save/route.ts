import { prisma } from "@/lib/prisma/client";
import { calculateAutoScore, evaluateTask9Raw } from "@/lib/scoring/autoScore";
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
    const eventsJson = events !== undefined ? (JSON.parse(JSON.stringify(events)) as any) : undefined;
    const artifactsJson = artifacts !== undefined ? (JSON.parse(JSON.stringify(artifacts)) as any) : undefined;

    // Local rule-based auto scoring only.
    let autoScore = body.autoScore;
    if (autoScore === undefined && raw) {
      autoScore = calculateAutoScore(taskNumber, raw) ?? undefined;
    }

    const task9NeedsReview =
      taskNumber === 9 && rawJson
        ? evaluateTask9Raw(rawJson as any).some((x) => x.needs_review)
        : false;

    const finalNeedsReview = Boolean(needsReview ?? task9NeedsReview);

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
        needsReview: finalNeedsReview,
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
        needsReview: finalNeedsReview,
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
