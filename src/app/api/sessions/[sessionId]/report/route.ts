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
  2: "Copy the target chair pattern on the same-size grid.",
  3: "Adjust the preset clock hands to the target time.",
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

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

type ClockHM = { hour: number; minute: number };

function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString();
}

function normalizeMinute(v: number): number {
  return ((Math.round(v) % 60) + 60) % 60;
}

function normalizeHour(v: number): number {
  return ((Math.round(v) - 1 + 12) % 12) + 1;
}

function parseClockTime(timeText: string): ClockHM {
  const m = String(timeText).match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return { hour: 11, minute: 0 };
  return {
    hour: normalizeHour(Number(m[1])),
    minute: normalizeMinute(Number(m[2])),
  };
}

function clockMinuteDiff(aMinute: number, bMinute: number): number {
  const d = Math.abs(normalizeMinute(aMinute) - normalizeMinute(bMinute));
  return Math.min(d, 60 - d);
}

function clockHourAngle(hour: number, minute: number): number {
  return ((normalizeHour(hour) % 12) + normalizeMinute(minute) / 60) * 30;
}

function clockHourAngleDiff(aHour: number, aMinute: number, bHour: number, bMinute: number): number {
  const d = Math.abs(clockHourAngle(aHour, aMinute) - clockHourAngle(bHour, bMinute));
  return Math.min(d, 360 - d);
}

function getTask2Stats(raw: any) {
  const target = new Set<string>(
    Array.isArray(raw?.copyGrid?.targetCells)
      ? raw.copyGrid.targetCells.map((c: unknown) => String(c))
      : []
  );
  const user = new Set<string>(
    Array.isArray(raw?.copyGrid?.userCells)
      ? raw.copyGrid.userCells.map((c: unknown) => String(c))
      : []
  );
  let overlap = 0;
  for (const c of user) {
    if (target.has(c)) overlap++;
  }
  const precision = user.size > 0 ? overlap / user.size : 0;
  const recall = target.size > 0 ? overlap / target.size : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  return {
    targetCount: target.size,
    userCount: user.size,
    overlap,
    precision,
    recall,
    f1,
    targetCells: target,
    userCells: user,
  };
}

function summarizeAnswer(taskNumber: number, raw: any): string[] {
  if (!raw) return ["No response saved."];

  switch (taskNumber) {
    case 1: {
      const path = Array.isArray(raw?.trail?.userPath) ? raw.trail.userPath.join(" -> ") : "-";
      const completed = raw?.trail?.completed ? "yes" : "no";
      const errors = Array.isArray(raw?.trail?.errors) ? raw.trail.errors.length : 0;
      return [`Path: ${path}`, `Completed: ${completed}`, `Errors: ${errors}`];
    }
    case 2: {
      if (raw?.copyGrid?.mode === "grid_copy") {
        const stats = getTask2Stats(raw);
        const size = Number(raw?.copyGrid?.size ?? 0) || 0;
        const chair = raw?.copyGrid?.prompt?.chairId ?? "-";
        return [
          `Prompt: ${chair}`,
          `Grid size: ${size} x ${size}`,
          `Target/User filled cells: ${stats.targetCount} / ${stats.userCount}`,
          `Overlap: ${stats.overlap}`,
          `F1 match: ${(stats.f1 * 100).toFixed(1)}%`,
        ];
      }
      const strokes = Array.isArray(raw?.drawing?.strokes) ? raw.drawing.strokes.length : 0;
      return [`Legacy canvas mode`, `Stroke count: ${strokes}`];
    }
    case 3: {
      const target = raw?.clock?.targetTime ?? "-";
      if (raw?.clock?.mode === "set_hands" && raw?.clock?.answer) {
        const h = String(raw.clock.answer.hour ?? "-").padStart(2, "0");
        const m = String(raw.clock.answer.minute ?? "-").padStart(2, "0");
        return [`Target time: ${target}`, `User set time: ${h}:${m}`, "Mode: preset clock hand adjustment"];
      }
      const strokes = Array.isArray(raw?.clock?.strokes) ? raw.clock.strokes.length : 0;
      return [`Target time: ${target}`, `Legacy draw strokes: ${strokes}`];
    }
    case 4: {
      const naming = Array.isArray(raw?.naming) ? raw.naming : [];
      if (!naming.length) return ["No naming answers."];
      return naming.map((it: any, idx: number) => `${idx + 1}. ${String(it?.promptId ?? "-")}: ${String(it?.answer ?? "")}`);
    }
    case 5: {
      const t1 = Array.isArray(raw?.memoryImmediate?.trial1) ? raw.memoryImmediate.trial1.join(" ") : "-";
      const t2 = Array.isArray(raw?.memoryImmediate?.trial2) ? raw.memoryImmediate.trial2.join(" ") : "-";
      return [`Trial 1 words: ${t1}`, `Trial 2 words: ${t2}`];
    }
    case 6: {
      const df = Array.isArray(raw?.attention?.digitForward?.answer) ? raw.attention.digitForward.answer.join(" ") : "-";
      const db = Array.isArray(raw?.attention?.digitBackward?.answer) ? raw.attention.digitBackward.answer.join(" ") : "-";
      const s7 = Array.isArray(raw?.attention?.serial7?.answers) ? raw.attention.serial7.answers.join(", ") : "-";
      const vig = raw?.attention?.vigilance?.errors;
      return [
        `Digit forward answer: ${df}`,
        `Digit backward answer: ${db}`,
        `Serial 7 answers: ${s7}`,
        `Vigilance errors (false taps/misses): ${Number(vig?.falseTap ?? 0)} / ${Number(vig?.miss ?? 0)}`,
      ];
    }
    case 7: {
      const reps = Array.isArray(raw?.sentenceRepetition) ? raw.sentenceRepetition : [];
      const a = reps.find((x: any) => Number(x?.item) === 1);
      const b = reps.find((x: any) => Number(x?.item) === 2);
      return [
        `Sentence 1 transcript: ${String(a?.transcript?.text ?? "-")}`,
        `Sentence 2 transcript: ${String(b?.transcript?.text ?? "-")}`,
      ];
    }
    case 8: {
      const letter = String(raw?.fluency?.letter ?? "-");
      const words = Array.isArray(raw?.fluency?.words)
        ? raw.fluency.words.map((w: any) => String(w?.w ?? "")).filter(Boolean)
        : [];
      const unique = new Set(words.map((w: string) => w.toLowerCase())).size;
      return [`Target letter: ${letter}`, `Words (${words.length} total, ${unique} unique): ${words.join(", ") || "-"}`];
    }
    case 9: {
      const abs = Array.isArray(raw?.abstraction) ? raw.abstraction : [];
      if (!abs.length) return ["No abstraction answers."];
      return abs.map((it: any) => `${String(it?.pair ?? "-")}: ${String(it?.answer ?? "")}`);
    }
    case 10: {
      const fr = Array.isArray(raw?.delayedRecall?.freeRecall) ? raw.delayedRecall.freeRecall.join(" ") : "-";
      const targets = Array.isArray(raw?.delayedRecall?.targetWords) ? raw.delayedRecall.targetWords.join(" ") : "-";
      return [`Target words: ${targets}`, `Free recall: ${fr}`];
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
      ];
    }
    default:
      return [JSON.stringify(raw, null, 2)];
  }
}

function scoringLogicLines(taskNumber: number, raw: any): string[] {
  switch (taskNumber) {
    case 1: {
      const completed = raw?.trail?.completed === true;
      const errors = Array.isArray(raw?.trail?.errors) ? raw.trail.errors.length : 0;
      return [
        "Rule: score 1 only if completed=true and errors=0; otherwise 0.",
        `Observed: completed=${completed ? "true" : "false"}, errors=${errors}.`,
      ];
    }
    case 2: {
      const stats = getTask2Stats(raw);
      return [
        "Rule: grid-copy score = 1 when F1 >= 0.82, else 0.",
        `Computed: precision=${stats.precision.toFixed(3)}, recall=${stats.recall.toFixed(3)}, F1=${stats.f1.toFixed(3)}.`,
      ];
    }
    case 3: {
      if (raw?.clock?.mode === "set_hands" && raw?.clock?.answer) {
        const target = parseClockTime(String(raw?.clock?.targetTime ?? "11:00"));
        const answer = {
          hour: normalizeHour(Number(raw.clock.answer.hour ?? 11)),
          minute: normalizeMinute(Number(raw.clock.answer.minute ?? 0)),
        };
        const minuteDiff = clockMinuteDiff(answer.minute, target.minute);
        const hourDiff = clockHourAngleDiff(answer.hour, answer.minute, target.hour, target.minute);
        const minuteOk = minuteDiff <= 2;
        const hourOk = hourDiff <= 15;
        return [
          "Rule: minute within 2 min => +1; hour hand within 15 deg => +1; both true => +1 (max 3).",
          `Computed: minute diff=${minuteDiff}, hour-angle diff=${hourDiff.toFixed(1)} deg.`,
          `Checks: minute_ok=${minuteOk ? "yes" : "no"}, hour_ok=${hourOk ? "yes" : "no"}.`,
        ];
      }
      return ["Rule: legacy draw-clock heuristic uses contour, numbers, and hand-like strokes (0-3)."];
    }
    case 4:
      return ["Rule: each animal naming item earns 1 point when answer matches accepted labels (max 3)."];
    case 5:
      return ["Rule: immediate memory learning trials do not contribute points in MoCA total (fixed score 0)."];
    case 6:
      return [
        "Rule: forward span +1, backward span +1, vigilance <=1 total error +1, serial-7 contributes 0-3 (max total 6).",
      ];
    case 7:
      return ["Rule: 2 sentences, each requires near-exact transcript match (ASR-tolerant); each correct sentence +1 (max 2)."];
    case 8:
      return ["Rule: count unique valid words beginning with target letter; score 1 if unique count >= 11, else 0."];
    case 9:
      return ["Rule: each pair gets 1 point when response includes expected abstraction keywords (max 2)."];
    case 10:
      return ["Rule: delayed free recall score equals number of unique target words recalled (max 5)."];
    case 11:
      return [
        "Rule: Year/Month/Date/Day exact current-date checks (+4), plus place/city checks (+2; env exact match if configured, else non-empty).",
      ];
    default:
      return ["No scoring rule available."];
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

    const fileName = `moca-report-${session.participant?.code ?? session.id}.pdf`;

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let cursorY = PAGE_HEIGHT - MARGIN;

    const addPage = () => {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      cursorY = PAGE_HEIGHT - MARGIN;
    };

    const ensureSpace = (heightNeeded: number) => {
      if (cursorY - heightNeeded < MARGIN) addPage();
    };

    const wrapText = (text: string, useFont: any, size: number, maxWidth: number): string[] => {
      const content = String(text ?? "");
      if (!content) return [""];
      const words = content.split(" ");
      const out: string[] = [];
      let current = "";

      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (useFont.widthOfTextAtSize(candidate, size) <= maxWidth) {
          current = candidate;
          continue;
        }

        if (current) out.push(current);
        let rest = word;
        while (useFont.widthOfTextAtSize(rest, size) > maxWidth && rest.length > 1) {
          let cut = rest.length - 1;
          while (cut > 1 && useFont.widthOfTextAtSize(rest.slice(0, cut), size) > maxWidth) {
            cut--;
          }
          out.push(rest.slice(0, cut));
          rest = rest.slice(cut);
        }
        current = rest;
      }

      if (current) out.push(current);
      return out.length ? out : [""];
    };

    const drawLines = (
      lines: string[],
      opts?: { x?: number; size?: number; lineHeight?: number; useBold?: boolean; color?: any }
    ) => {
      const x = opts?.x ?? MARGIN;
      const size = opts?.size ?? 10;
      const lineHeight = opts?.lineHeight ?? Math.round(size * 1.35);
      const useFont = opts?.useBold ? bold : font;
      const color = opts?.color ?? rgb(0.08, 0.08, 0.08);
      const maxWidth = PAGE_WIDTH - x - MARGIN;

      const flattened: string[] = [];
      for (const line of lines) {
        flattened.push(...wrapText(line, useFont, size, maxWidth));
      }

      ensureSpace(flattened.length * lineHeight + 4);
      for (const line of flattened) {
        page.drawText(line, { x, y: cursorY, size, font: useFont, color });
        cursorY -= lineHeight;
      }
    };

    const drawCard = (title: string, lines: string[], x: number, topY: number, width: number, height: number) => {
      const bottomY = topY - height;
      page.drawRectangle({
        x,
        y: bottomY,
        width,
        height,
        borderWidth: 1,
        borderColor: rgb(0.78, 0.82, 0.9),
        color: rgb(0.98, 0.99, 1),
      });
      page.drawText(title, {
        x: x + 8,
        y: topY - 15,
        size: 9,
        font: bold,
        color: rgb(0.15, 0.24, 0.45),
      });

      let y = topY - 30;
      for (const rawLine of lines.slice(0, 8)) {
        const wrapped = wrapText(rawLine, font, 8.5, width - 16);
        for (const line of wrapped) {
          if (y < bottomY + 8) break;
          page.drawText(line, {
            x: x + 8,
            y,
            size: 8.5,
            font,
            color: rgb(0.12, 0.12, 0.12),
          });
          y -= 11;
        }
      }
    };

    const drawGridSnapshot = (
      title: string,
      x: number,
      topY: number,
      width: number,
      height: number,
      size: number,
      cells: Set<string>,
      cellColor: ReturnType<typeof rgb>
    ) => {
      const bottomY = topY - height;
      page.drawRectangle({
        x,
        y: bottomY,
        width,
        height,
        borderWidth: 1,
        borderColor: rgb(0.75, 0.78, 0.84),
        color: rgb(0.99, 0.99, 0.99),
      });
      page.drawText(title, {
        x: x + 8,
        y: topY - 15,
        size: 9,
        font: bold,
        color: rgb(0.12, 0.12, 0.12),
      });

      const gridTop = topY - 28;
      const gridBottom = bottomY + 10;
      const gridHeight = gridTop - gridBottom;
      const gridWidth = width - 20;
      const drawSize = Math.min(gridWidth, gridHeight);
      const cell = drawSize / Math.max(size, 1);
      const gx = x + (width - drawSize) / 2;
      const gy = gridBottom + (gridHeight - drawSize) / 2;

      page.drawRectangle({ x: gx, y: gy, width: drawSize, height: drawSize, borderWidth: 1, borderColor: rgb(0.6, 0.6, 0.6) });

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const key = `${r},${c}`;
          const px = gx + c * cell;
          const py = gy + (size - 1 - r) * cell;

          page.drawRectangle({
            x: px,
            y: py,
            width: cell,
            height: cell,
            borderWidth: 0.35,
            borderColor: rgb(0.85, 0.85, 0.85),
            color: cells.has(key) ? cellColor : rgb(1, 1, 1),
          });
        }
      }
    };

    const drawClockSnapshot = (
      title: string,
      x: number,
      topY: number,
      width: number,
      height: number,
      hour: number,
      minute: number,
      accent: ReturnType<typeof rgb>
    ) => {
      const bottomY = topY - height;
      page.drawRectangle({
        x,
        y: bottomY,
        width,
        height,
        borderWidth: 1,
        borderColor: rgb(0.75, 0.78, 0.84),
        color: rgb(0.99, 0.99, 0.99),
      });
      page.drawText(title, {
        x: x + 8,
        y: topY - 15,
        size: 9,
        font: bold,
        color: rgb(0.12, 0.12, 0.12),
      });

      const cx = x + width / 2;
      const cy = bottomY + height / 2 - 6;
      const radius = Math.min(width, height) * 0.34;

      page.drawCircle({ x: cx, y: cy, size: radius, borderWidth: 1.1, borderColor: rgb(0.1, 0.1, 0.1) });

      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI / 6) * i;
        const x1 = cx + Math.sin(angle) * (radius - 3);
        const y1 = cy + Math.cos(angle) * (radius - 3);
        const x2 = cx + Math.sin(angle) * radius;
        const y2 = cy + Math.cos(angle) * radius;
        page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.8, color: rgb(0.2, 0.2, 0.2) });
      }

      const minuteAngle = (Math.PI / 30) * normalizeMinute(minute);
      const hourAngle = (Math.PI / 6) * (normalizeHour(hour) % 12) + (Math.PI / 360) * normalizeMinute(minute);

      page.drawLine({
        start: { x: cx, y: cy },
        end: { x: cx + Math.sin(hourAngle) * radius * 0.58, y: cy + Math.cos(hourAngle) * radius * 0.58 },
        thickness: 2.2,
        color: rgb(0.15, 0.15, 0.15),
      });

      page.drawLine({
        start: { x: cx, y: cy },
        end: { x: cx + Math.sin(minuteAngle) * radius * 0.82, y: cy + Math.cos(minuteAngle) * radius * 0.82 },
        thickness: 1.2,
        color: accent,
      });

      page.drawCircle({ x: cx, y: cy, size: 2.4, color: rgb(0.1, 0.1, 0.1) });
      page.drawText(`${String(normalizeHour(hour)).padStart(2, "0")}:${String(normalizeMinute(minute)).padStart(2, "0")}`, {
        x: x + 8,
        y: bottomY + 8,
        size: 8.5,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
    };

    const drawTaskVisual = (taskNumber: number, raw: any, answerLines: string[]) => {
      if (taskNumber === 2 && raw?.copyGrid?.mode === "grid_copy") {
        const stats = getTask2Stats(raw);
        const size = Number(raw?.copyGrid?.size ?? 10) || 10;
        const h = 230;
        ensureSpace(h + 10);
        const top = cursorY;
        drawLines(["Visual Snapshot"], { useBold: true, size: 10, color: rgb(0.1, 0.1, 0.1) });
        const panelTop = cursorY + 3;
        const gap = 12;
        const panelW = (CONTENT_WIDTH - gap) / 2;
        const panelH = 195;
        drawGridSnapshot("Prompt Shown to User", MARGIN, panelTop, panelW, panelH, size, stats.targetCells, rgb(0.2, 0.2, 0.2));
        drawGridSnapshot("User Filled Grid", MARGIN + panelW + gap, panelTop, panelW, panelH, size, stats.userCells, rgb(0.1, 0.35, 0.75));
        cursorY = top - h;
        return;
      }

      if (taskNumber === 3 && raw?.clock?.mode === "set_hands" && raw?.clock?.answer) {
        const target = parseClockTime(String(raw?.clock?.targetTime ?? "11:00"));
        const answer = {
          hour: normalizeHour(Number(raw.clock.answer.hour ?? 11)),
          minute: normalizeMinute(Number(raw.clock.answer.minute ?? 0)),
        };
        const h = 230;
        ensureSpace(h + 10);
        const top = cursorY;
        drawLines(["Visual Snapshot"], { useBold: true, size: 10, color: rgb(0.1, 0.1, 0.1) });
        const panelTop = cursorY + 3;
        const gap = 12;
        const panelW = (CONTENT_WIDTH - gap) / 2;
        const panelH = 195;
        drawClockSnapshot("Target Clock (Question)", MARGIN, panelTop, panelW, panelH, target.hour, target.minute, rgb(0.7, 0.1, 0.1));
        drawClockSnapshot("User Final Clock (Answer)", MARGIN + panelW + gap, panelTop, panelW, panelH, answer.hour, answer.minute, rgb(0.1, 0.3, 0.7));
        cursorY = top - h;
        return;
      }

      const h = 132;
      ensureSpace(h + 10);
      const top = cursorY;
      drawLines(["Visual Snapshot"], { useBold: true, size: 10, color: rgb(0.1, 0.1, 0.1) });
      const panelTop = cursorY + 3;
      const gap = 12;
      const panelW = (CONTENT_WIDTH - gap) / 2;
      const panelH = 97;
      drawCard("Prompt Shown to User", [TASK_PROMPTS[taskNumber] ?? "-"], MARGIN, panelTop, panelW, panelH);
      drawCard("User Answer Snapshot", answerLines, MARGIN + panelW + gap, panelTop, panelW, panelH);
      cursorY = top - h;
    };

    drawLines(["MoCA Personal Report"], { useBold: true, size: 17, lineHeight: 21 });
    drawLines([
      `Participant Code: ${session.participant?.code ?? "-"}`,
      `Session ID: ${session.id}`,
      `Submitted At: ${formatDateTime(session.submittedAt)}`,
      `Generated At: ${new Date().toISOString()}`,
    ], { size: 10.5, lineHeight: 14 });
    cursorY -= 6;

    for (let taskNumber = 1; taskNumber <= 11; taskNumber++) {
      const response = byTask.get(taskNumber);
      const score = resolveScore(response);
      const answerLines = summarizeAnswer(taskNumber, response?.raw);
      const scoreLines = scoringLogicLines(taskNumber, response?.raw);

      ensureSpace(120);
      drawLines([`Task ${taskNumber}: ${TASK_TITLES[taskNumber] ?? "Task"}`], {
        useBold: true,
        size: 13,
        lineHeight: 18,
        color: rgb(0.08, 0.1, 0.22),
      });

      drawLines([`Question: ${TASK_PROMPTS[taskNumber] ?? "-"}`], { size: 10, lineHeight: 14 });
      drawTaskVisual(taskNumber, response?.raw, answerLines);

      drawLines(["Answer Summary:"], { useBold: true, size: 10.5, lineHeight: 14 });
      drawLines(answerLines, { x: MARGIN + 10, size: 9.5, lineHeight: 13 });

      drawLines(["Scoring Logic and Evidence:"], { useBold: true, size: 10.5, lineHeight: 14 });
      drawLines(scoreLines, { x: MARGIN + 10, size: 9.5, lineHeight: 13 });

      drawLines([`Final Score: ${score}`], {
        useBold: true,
        size: 10.5,
        lineHeight: 14,
        color: rgb(0.08, 0.35, 0.15),
      });

      if (SEMI_AUTO_TASKS.has(taskNumber)) {
        drawLines([SEMI_AUTO_NOTE], {
          size: 9,
          lineHeight: 12,
          color: rgb(0.5, 0.15, 0.15),
        });
      }

      cursorY -= 12;
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
