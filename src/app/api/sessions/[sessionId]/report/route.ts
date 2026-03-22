import { prisma } from "@/lib/prisma/client";
import { calculateAutoScore } from "@/lib/scoring/autoScore";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const TASK_TITLES: Record<number, string> = {
  1: "Alternating Trail Making",
  2: "Copy Chair",
  3: "Clock Drawing",
  4: "Naming",
  5: "Memory (Immediate)",
  6: "Attention",
  7: "Sentence Repetition",
  8: "Verbal Fluency",
  9: "Abstraction",
  10: "Delayed Recall",
  11: "Orientation",
};

const TASK_PROMPTS: Record<number, string> = {
  1: "Draw a line in order: 1-A-2-B-3-C-4-D-5-E.",
  2: "Copy the chair drawing as accurately as possible.",
  3: "Draw a clock and set the time as instructed.",
  4: "Name each displayed animal.",
  5: "Remember and repeat the word list in two immediate trials.",
  6: "Complete digit span, vigilance and serial subtraction tasks.",
  7: "Repeat each sentence exactly as spoken.",
  8: "Say as many words as possible beginning with the target letter.",
  9: "Explain what each pair of words has in common.",
  10: "Recall the memory words after delay.",
  11: "Answer orientation questions about date and place.",
};

const SEMI_AUTO_TASKS = new Set([2, 3, 7, 9, 11]);
const SEMI_AUTO_NOTE = "Machine-scored; pending further human review.";

interface AIScoreInfo {
  baseScore: number;
  aiScore: number;
  fusedScore: number;
  confidence: number;
  reason: string;
  model: string;
}

interface AudioAIScoreInfo {
  sentence1Score: number;
  sentence2Score: number;
  sentence1Reason: string;
  sentence2Reason: string;
  confidence: number;
  model: string;
  finalScore: number;
}

function extractAIScoring(events: any): AIScoreInfo | null {
  if (!Array.isArray(events)) return null;
  const aiEvent = events.find(
    (e: any) => e?.type === "click" && e?.meta?.action === "ai_vision_scored"
  );
  if (!aiEvent?.meta) return null;
  return {
    baseScore: aiEvent.meta.baseScore ?? 0,
    aiScore: aiEvent.meta.aiScore ?? 0,
    fusedScore: aiEvent.meta.fusedScore ?? 0,
    confidence: aiEvent.meta.confidence ?? 0,
    reason: aiEvent.meta.reason ?? "",
    model: aiEvent.meta.model ?? "",
  };
}

function extractAudioAIScoring(events: any): AudioAIScoreInfo | null {
  if (!Array.isArray(events)) return null;
  const aiEvent = events.find(
    (e: any) => e?.type === "click" && e?.meta?.action === "ai_audio_scored"
  );
  if (!aiEvent?.meta) return null;
  return {
    sentence1Score: aiEvent.meta.sentence1Score ?? 0,
    sentence2Score: aiEvent.meta.sentence2Score ?? 0,
    sentence1Reason: aiEvent.meta.sentence1Reason ?? "",
    sentence2Reason: aiEvent.meta.sentence2Reason ?? "",
    confidence: aiEvent.meta.confidence ?? 0,
    model: aiEvent.meta.model ?? "",
    finalScore: aiEvent.meta.finalScore ?? 0,
  };
}

function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString();
}

function summarizeAnswer(taskNumber: number, raw: any): string {
  if (!raw) return "No response saved.";

  switch (taskNumber) {
    case 1: {
      const path = Array.isArray(raw?.trail?.userPath) ? raw.trail.userPath.join(" -> ") : "-";
      const completed = raw?.trail?.completed ? "yes" : "no";
      const errors = Array.isArray(raw?.trail?.errors) ? raw.trail.errors.length : 0;
      return `Path: ${path}\nCompleted: ${completed}\nErrors: ${errors}`;
    }
    case 2: {
      const strokes = Array.isArray(raw?.drawing?.strokes) ? raw.drawing.strokes.length : 0;
      const chair = raw?.drawing?.prompt?.chairId ?? "-";
      return `Prompt: ${chair}\nStroke count: ${strokes}`;
    }
    case 3: {
      const strokes = Array.isArray(raw?.clock?.strokes) ? raw.clock.strokes.length : 0;
      const target = raw?.clock?.targetTime ?? "-";
      return `Target time: ${target}\nStroke count: ${strokes}`;
    }
    case 4: {
      const naming = Array.isArray(raw?.naming) ? raw.naming : [];
      if (!naming.length) return "No naming answers.";
      return naming
        .map((it: any, idx: number) => `${idx + 1}. (${String(it?.promptId ?? "-")}) ${String(it?.answer ?? "")}`)
        .join("\n");
    }
    case 5: {
      const t1 = Array.isArray(raw?.memoryImmediate?.trial1) ? raw.memoryImmediate.trial1.join(" ") : "-";
      const t2 = Array.isArray(raw?.memoryImmediate?.trial2) ? raw.memoryImmediate.trial2.join(" ") : "-";
      return `Trial 1: ${t1}\nTrial 2: ${t2}`;
    }
    case 6: {
      const df = Array.isArray(raw?.attention?.digitForward?.answer)
        ? raw.attention.digitForward.answer.join(" ")
        : "-";
      const db = Array.isArray(raw?.attention?.digitBackward?.answer)
        ? raw.attention.digitBackward.answer.join(" ")
        : "-";
      const s7 = Array.isArray(raw?.attention?.serial7?.answers)
        ? raw.attention.serial7.answers.join(", ")
        : "-";
      return `Digit forward: ${df}\nDigit backward: ${db}\nSerial 7: ${s7}`;
    }
    case 7: {
      const reps = Array.isArray(raw?.sentenceRepetition) ? raw.sentenceRepetition : [];
      const a = reps.find((x: any) => Number(x?.item) === 1);
      const b = reps.find((x: any) => Number(x?.item) === 2);
      return [
        `Sentence 1: ${a?.audio?.recorded ? "recorded" : "not recorded"}`,
        `Sentence 2: ${b?.audio?.recorded ? "recorded" : "not recorded"}`,
      ].join("\n");
    }
    case 8: {
      const letter = String(raw?.fluency?.letter ?? "-");
      const words = Array.isArray(raw?.fluency?.words)
        ? raw.fluency.words.map((w: any) => String(w?.w ?? "")).filter(Boolean)
        : [];
      return `Letter: ${letter}\nWords: ${words.join(", ") || "-"}`;
    }
    case 9: {
      const abs = Array.isArray(raw?.abstraction) ? raw.abstraction : [];
      if (!abs.length) return "No abstraction answers.";
      return abs
        .map((it: any) => `${String(it?.pair ?? "-")}: ${String(it?.answer ?? "")}`)
        .join("\n");
    }
    case 10: {
      const fr = Array.isArray(raw?.delayedRecall?.freeRecall) ? raw.delayedRecall.freeRecall.join(" ") : "-";
      return `Free recall: ${fr}`;
    }
    case 11: {
      const o = raw?.orientation ?? {};
      return [
        `Year: ${String(o?.year ?? "-")}`,
        `Month: ${String(o?.month ?? "-")}`,
        `Date: ${String(o?.date ?? "-")}`,
        `Day: ${String(o?.dayOfWeek ?? "-")}`,
        `Place: ${String(o?.place ?? "-")}`,
        `City: ${String(o?.city ?? "-")}`,
      ].join("\n");
    }
    default:
      return JSON.stringify(raw, null, 2);
  }
}

function resolveScore(response: any): string {
  if (typeof response?.humanScore === "number") return String(response.humanScore);

  const recalculated = calculateAutoScore(Number(response?.taskNumber), response?.raw);
  if (typeof recalculated === "number") return String(recalculated);

  if (typeof response?.autoScore === "number") return String(response.autoScore);

  return "0";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        participant: true,
        responses: true,
      },
    });

    if (!session) {
      return NextResponse.json({ ok: false, error: "Session not found" }, { status: 404 });
    }

    const byTask = new Map<number, any>();
    for (const r of session.responses ?? []) {
      byTask.set(Number(r.taskNumber), r);
    }

    const lines: string[] = [];
    lines.push("MoCA Personal Report");
    lines.push("===================");
    lines.push(`Participant Code: ${session.participant?.code ?? "-"}`);
    lines.push(`Session ID: ${session.id}`);
    lines.push(`Submitted At: ${formatDateTime(session.submittedAt)}`);
    lines.push(`Generated At: ${new Date().toISOString()}`);
    lines.push("");

    for (let taskNumber = 1; taskNumber <= 11; taskNumber++) {
      const response = byTask.get(taskNumber);
      const aiScoring = extractAIScoring(response?.events);
      const audioAiScoring = extractAudioAIScoring(response?.events);
      const finalScore = taskNumber === 7 ? (audioAiScoring?.finalScore ?? resolveScore(response)) : (aiScoring?.fusedScore ?? resolveScore(response));

      lines.push(`Task ${taskNumber}: ${TASK_TITLES[taskNumber] ?? "Task"}`);
      lines.push(`Question: ${TASK_PROMPTS[taskNumber] ?? "-"}`);
      lines.push(`Answer:`);
      lines.push(summarizeAnswer(taskNumber, response?.raw));
      lines.push("");
      lines.push(`Scoring:`);
      if (audioAiScoring) {
        lines.push(`  Sentence 1 (ChatGPT): ${audioAiScoring.sentence1Score}`);
        if (audioAiScoring.sentence1Reason) {
          lines.push(`    Reason: ${audioAiScoring.sentence1Reason}`);
        }
        lines.push(`  Sentence 2 (ChatGPT): ${audioAiScoring.sentence2Score}`);
        if (audioAiScoring.sentence2Reason) {
          lines.push(`    Reason: ${audioAiScoring.sentence2Reason}`);
        }
        lines.push(`  ChatGPT Model: ${audioAiScoring.model}`);
        lines.push(`  Confidence: ${(audioAiScoring.confidence * 100).toFixed(1)}%`);
        lines.push(`  Final Score: ${audioAiScoring.finalScore}`);
      } else if (aiScoring) {
        lines.push(`  Rule-based Score: ${aiScoring.baseScore}`);
        lines.push(`  ChatGPT Vision Score: ${aiScoring.aiScore}`);
        lines.push(`  ChatGPT Model: ${aiScoring.model}`);
        lines.push(`  Confidence: ${(aiScoring.confidence * 100).toFixed(1)}%`);
        lines.push(`  Reason: ${aiScoring.reason}`);
        lines.push(`  Final Score (fused 20% rule + 80% ChatGPT): ${finalScore}`);
      } else {
        lines.push(`  Score: ${finalScore}`);
        if (SEMI_AUTO_TASKS.has(taskNumber)) {
          lines.push(`  (${SEMI_AUTO_NOTE})`);
        }
      }
      lines.push("");
    }

    const content = lines.join("\n");
    const fileName = `moca-report-${session.participant?.code ?? session.id}.pdf`;

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Courier);

    const pageWidth = 595.28; // A4 width in pt
    const pageHeight = 841.89; // A4 height in pt
    const margin = 48;
    const fontSize = 10;
    const lineHeight = 13;
    const usableWidth = pageWidth - margin * 2;
    const maxLinesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);

    const wrapLine = (line: string): string[] => {
      if (!line) return [""];
      const words = line.split(" ");
      const out: string[] = [];
      let current = "";

      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        const width = font.widthOfTextAtSize(candidate, fontSize);
        if (width <= usableWidth) {
          current = candidate;
          continue;
        }

        if (current) out.push(current);

        // Handle extremely long tokens without spaces.
        let remainder = word;
        while (font.widthOfTextAtSize(remainder, fontSize) > usableWidth) {
          let cut = remainder.length - 1;
          while (cut > 1 && font.widthOfTextAtSize(remainder.slice(0, cut), fontSize) > usableWidth) {
            cut--;
          }
          out.push(remainder.slice(0, cut));
          remainder = remainder.slice(cut);
        }
        current = remainder;
      }

      if (current) out.push(current);
      return out.length ? out : [""];
    };

    const wrappedLines = content
      .split("\n")
      .flatMap((line) => wrapLine(line));

    let lineIndex = 0;
    while (lineIndex < wrappedLines.length) {
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      let y = pageHeight - margin;

      for (let i = 0; i < maxLinesPerPage && lineIndex < wrappedLines.length; i++, lineIndex++) {
        page.drawText(wrappedLines[lineIndex], {
          x: margin,
          y,
          size: fontSize,
          font,
          color: rgb(0.1, 0.1, 0.1),
        });
        y -= lineHeight;
      }
    }

    const bytes = await pdfDoc.save();
    const body = Buffer.from(bytes);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error generating session report:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
