import {
  Task2Raw,
  Task3Raw,
  Task4Raw,
  Task5Raw,
  Task6Raw,
  Task7Raw,
  Task8Raw,
  Task9Raw,
  Task10Raw,
  Task11Raw,
} from "../types";

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z\s-]/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeToken(s: string): string {
  return normalizeText(s).replace(/\s+/g, "");
}

function normalizeMonth(input: string): string {
  const v = normalizeText(input);
  const aliases: Record<string, string> = {
    jan: "january",
    january: "january",
    feb: "february",
    february: "february",
    mar: "march",
    march: "march",
    apr: "april",
    april: "april",
    may: "may",
    jun: "june",
    june: "june",
    jul: "july",
    july: "july",
    aug: "august",
    august: "august",
    sep: "september",
    sept: "september",
    september: "september",
    oct: "october",
    october: "october",
    nov: "november",
    november: "november",
    dec: "december",
    december: "december",
  };
  return aliases[v] ?? v;
}

function normalizeWeekday(input: string): string {
  const v = normalizeText(input);
  const aliases: Record<string, string> = {
    mon: "monday",
    monday: "monday",
    tue: "tuesday",
    tues: "tuesday",
    tuesday: "tuesday",
    wed: "wednesday",
    wednesday: "wednesday",
    thu: "thursday",
    thur: "thursday",
    thurs: "thursday",
    thursday: "thursday",
    fri: "friday",
    friday: "friday",
    sat: "saturday",
    saturday: "saturday",
    sun: "sunday",
    sunday: "sunday",
  };
  return aliases[v] ?? v;
}

function numericValue(input: string): number | null {
  const v = normalizeText(input);
  const m = v.match(/\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}

function similarityRatio(a: string, b: string): number {
  if (!a && !b) return 1;
  const dist = levenshteinDistance(a, b);
  return 1 - dist / Math.max(a.length, b.length, 1);
}

type DrawPoint = { x: number; y: number };
type DrawStroke = { points: DrawPoint[] };

function getStrokeLength(stroke: DrawStroke): number {
  let len = 0;
  for (let i = 1; i < stroke.points.length; i++) {
    const a = stroke.points[i - 1];
    const b = stroke.points[i];
    len += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return len;
}

function getDistance(a: DrawPoint, b: DrawPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getBoundingBox(points: DrawPoint[]) {
  if (!points.length) return null;
  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
  };
}

function getAllPoints(strokes: DrawStroke[]): DrawPoint[] {
  return strokes.flatMap((s) => s.points ?? []);
}

// ===============================
// Task 2 - Copy Chair/Cube (0-1, semi-automatic)
// ===============================

export function scoreTask2(raw: Task2Raw): number {
  const grid = raw?.copyGrid;
  if (grid?.mode === "grid_copy") {
    const target = new Set(Array.isArray(grid.targetCells) ? grid.targetCells : []);
    const user = new Set(Array.isArray(grid.userCells) ? grid.userCells : []);

    if (target.size === 0 || user.size === 0) return 0;

    let overlap = 0;
    for (const cell of user) {
      if (target.has(cell)) overlap++;
    }

    const precision = overlap / Math.max(user.size, 1);
    const recall = overlap / Math.max(target.size, 1);
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return f1 >= 0.82 ? 1 : 0;
  }

  // Legacy fallback: old canvas-based heuristic
  const strokes = Array.isArray(raw?.drawing?.strokes) ? raw.drawing.strokes : [];
  if (!strokes.length) return 0;

  const totalPoints = strokes.reduce((acc, s) => acc + (Array.isArray(s.points) ? s.points.length : 0), 0);
  const allPoints = getAllPoints(strokes as DrawStroke[]);
  const box = getBoundingBox(allPoints);
  const totalLength = (strokes as DrawStroke[]).reduce((acc, s) => acc + getStrokeLength(s), 0);

  if (!box) return 0;

  // Semi-automatic validity heuristic: enough strokes, points, size and line length.
  const hasEnoughStrokes = strokes.length >= 3;
  const hasEnoughPoints = totalPoints >= 25;
  const hasEnoughSize = box.width >= 80 && box.height >= 80;
  const hasEnoughLength = totalLength >= 350;

  return hasEnoughStrokes && hasEnoughPoints && hasEnoughSize && hasEnoughLength ? 1 : 0;
}

// ===============================
// Task 3 - Clock Drawing (0-3, semi-automatic)
// ===============================

export function scoreTask3(raw: Task3Raw): number {
  const mode = raw?.clock?.mode;
  const answer = raw?.clock?.answer;

  if (mode === "set_hands" && answer) {
    const target = String(raw?.clock?.targetTime ?? "11:00");
    const m = target.match(/^(\d{1,2}):(\d{2})$/);
    const targetHour = m ? Number(m[1]) : 11;
    const targetMinute = m ? Number(m[2]) : 0;

    const hour = Number(answer.hour);
    const minute = Number(answer.minute);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;

    const normHour = ((Math.round(hour) - 1 + 12) % 12) + 1;
    const normMinute = ((Math.round(minute) % 60) + 60) % 60;

    const minuteDiff = Math.min(
      Math.abs(normMinute - targetMinute),
      60 - Math.abs(normMinute - targetMinute)
    );

    const answerHourAngle = ((normHour % 12) + normMinute / 60) * 30;
    const targetHourAngle = ((targetHour % 12) + targetMinute / 60) * 30;
    const hourAngleDiff = Math.abs(answerHourAngle - targetHourAngle);
    const hourDiff = Math.min(hourAngleDiff, 360 - hourAngleDiff);

    let score = 0;
    const minuteOk = minuteDiff <= 2;
    const hourOk = hourDiff <= 15;

    if (minuteOk) score++;
    if (hourOk) score++;
    if (minuteOk && hourOk) score++;

    return Math.min(score, 3);
  }

  // Legacy fallback: old free-draw clock heuristic.
  const strokes = Array.isArray(raw?.clock?.strokes) ? (raw.clock.strokes as DrawStroke[]) : [];
  if (!strokes.length) return 0;

  const points = getAllPoints(strokes);
  const box = getBoundingBox(points);
  if (!box) return 0;

  let score = 0;

  // 1) Contour heuristic: at least one large near-closed stroke.
  const hasContour = strokes.some((s) => {
    if (!s.points || s.points.length < 12) return false;
    const sb = getBoundingBox(s.points);
    if (!sb) return false;
    const start = s.points[0];
    const end = s.points[s.points.length - 1];
    const closedGap = getDistance(start, end);
    return sb.width >= 120 && sb.height >= 120 && closedGap <= 45;
  });
  if (hasContour) score++;

  // 2) Numbers heuristic: many short strokes distributed around center ring.
  const center = { x: box.cx, y: box.cy };
  const radius = Math.min(box.width, box.height) / 2;
  const ringInner = radius * 0.45;
  const ringOuter = radius * 0.95;

  let ringPoints = 0;
  for (const p of points) {
    const r = getDistance(p, center);
    if (r >= ringInner && r <= ringOuter) ringPoints++;
  }

  const numberLikeStrokeCount = strokes.filter((s) => {
    const len = getStrokeLength(s);
    return len >= 10 && len <= 90;
  }).length;

  const ringRatio = points.length ? ringPoints / points.length : 0;
  const hasNumbers = numberLikeStrokeCount >= 8 && ringRatio >= 0.22;
  if (hasNumbers) score++;

  // 3) Hands heuristic: two long strokes with an endpoint close to center.
  const handLike = strokes.filter((s) => {
    if (!s.points || s.points.length < 2) return false;
    const len = getStrokeLength(s);
    if (len < 60) return false;
    const p0 = s.points[0];
    const p1 = s.points[s.points.length - 1];
    const nearCenter = Math.min(getDistance(p0, center), getDistance(p1, center));
    return nearCenter <= 55;
  });

  if (handLike.length >= 2) score++;

  return Math.min(score, 3);
}

// ===============================
// Task 4 - Naming (0-3)
// ===============================

const namingByPromptId: Record<string, string[]> = {
  // MoCA 8.1
  animal_lion: ["lion", "lions"],
  animal_rhino: ["rhino", "rhinoceros", "rhinos"],
  animal_camel: ["camel", "camels", "dromedary", "dromedaries"],

  // MoCA 8.2
  animal_snake: ["snake", "boa", "cobra"],
  animal_elephant: ["elephant", "elephants"],
  animal_crocodile: ["crocodile", "alligator", "crocodiles", "alligators"],

  // Current project pool (fallback so scoring remains deterministic)
  animal_cat: ["cat", "cats"],
  animal_dog: ["dog", "dogs"],
  animal_cow: ["cow", "cows"],
  animal_pig: ["pig", "pigs"],
  animal_horse: ["horse", "horses"],
  animal_sheep: ["sheep"],
  animal_rabbit: ["rabbit", "rabbits", "bunny", "bunnies"],
  animal_frog: ["frog", "frogs"],
  animal_duck: ["duck", "ducks"],
  animal_fish: ["fish", "fishes"],
  animal_monkey: ["monkey", "monkeys"],
  animal_tiger: ["tiger", "tigers"],
  animal_bear: ["bear", "bears"],
  animal_giraffe: ["giraffe", "giraffes"],
  animal_zebra: ["zebra", "zebras"],
  animal_hippo: ["hippo", "hippopotamus", "hippos", "hippopotamuses"],
};

export function scoreTask4(raw: Task4Raw): number {
  let score = 0;
  for (const item of raw.naming) {
    const answer = normalizeToken(item.answer ?? "");
    const accepted = namingByPromptId[item.promptId] ?? [];
    const hit = accepted.some((s) => normalizeToken(s) === answer);
    if (hit) score++;
  }
  return Math.min(score, 3);
}

// ===============================
// Task 5 - Memory Immediate (0)
// ===============================

export function scoreTask5(_raw: Task5Raw): number {
  // MoCA total does not award points in immediate memory learning trials.
  return 0;
}

// ===============================
// Task 6 - Attention (0-6)
// ===============================

export function scoreTask6(raw: Task6Raw): number {
  let score = 0;

  // Digit Forward (1 point)
  if (raw.attention.digitForward.correct) score++;

  // Digit Backward (1 point)
  if (raw.attention.digitBackward.correct) score++;

  // Vigilance: 1 point for 0-1 total errors.
  const totalVigilanceErrors =
    Number(raw.attention.vigilance.errors.falseTap ?? 0) +
    Number(raw.attention.vigilance.errors.miss ?? 0);
  if (totalVigilanceErrors <= 1) {
    score++;
  }

  // Serial 7 (MoCA):
  // 0 correct => 0, 1 correct => 1, 2-3 correct => 2, 4-5 correct => 3.
  // Each subtraction is evaluated independently from the previous response.
  const serial7Answers = raw.attention.serial7.answers;
  const start = Number(raw.attention.serial7.start ?? 100);
  const expectedSerial7 = [1, 2, 3, 4, 5].map((k) => start - 7 * k);
  let serial7Correct = 0;

  for (let i = 0; i < Math.min(serial7Answers.length, expectedSerial7.length); i++) {
    if (serial7Answers[i] === expectedSerial7[i]) {
      serial7Correct++;
    }
  }

  if (serial7Correct === 1) score += 1;
  else if (serial7Correct === 2 || serial7Correct === 3) score += 2;
  else if (serial7Correct >= 4) score += 3;

  return Math.min(score, 6);
}

// ===============================
// Task 7 - Sentence Repetition (0-2)
// ===============================

const task7Reference: Record<number, string> = {
  1: "I only know that John is the one to help today.",
  2: "The cat always hid under the couch when dogs were in the room.",
};

function normalizeSentenceForCompare(input: string): string {
  return normalizeText(input)
    .replace(/\b(john|cat|dogs|couch|help|today|always|hid|room|one|know|only|the|is|that|under|when|were|to)\b/g, "$1")
    .trim();
}

function sentenceMatchScore(transcript: string, reference: string): boolean {
  const t = normalizeSentenceForCompare(transcript);
  const r = normalizeSentenceForCompare(reference);
  if (!t || !r) return false;
  if (t === r) return true;

  // Allow a small ASR tolerance while keeping sentence-level strictness.
  const ratio = similarityRatio(t, r);
  const tWords = t.split(" ").filter(Boolean).length;
  const rWords = r.split(" ").filter(Boolean).length;
  return ratio >= 0.92 && Math.abs(tWords - rWords) <= 1;
}

export function scoreTask7(raw: Task7Raw): number | null {
  const list = Array.isArray(raw.sentenceRepetition) ? raw.sentenceRepetition : [];
  if (!list.length) return 0;

  let score = 0;

  for (const item of [1, 2]) {
    const response = list.find((x) => Number(x.item) === item);
    const transcript = String(response?.transcript?.text ?? "").trim();
    const reference = task7Reference[item];

    if (!transcript) return 0;

    if (sentenceMatchScore(transcript, reference)) {
      score += 1;
    }
  }

  return Math.min(score, 2);
}

// ===============================
// Task 8 - Verbal Fluency (0-1)
// ===============================

export function scoreTask8(raw: Task8Raw): number {
  const targetLetter = normalizeToken(raw.fluency.letter || "F").slice(0, 1) || "f";
  const words = Array.isArray(raw.fluency.words) ? raw.fluency.words : [];

  const valid = words
    .map((w) => normalizeToken(String(w?.w ?? "")))
    .filter((w) => w.length > 0)
    .filter((w) => /^[a-z]+$/.test(w))
    .filter((w) => w.startsWith(targetLetter));

  const unique = new Set(valid);
  return unique.size >= 11 ? 1 : 0;
}

// ===============================
// Task 9 - Abstraction (0-2, semi-automatic)
// ===============================

export type Task9Item = "train_bicycle" | "ruler_watch";
export type Task9Label =
  | "ABSTRACT_CORRECT"
  | "CONCRETE_INCORRECT"
  | "TOO_GENERAL"
  | "UNCLEAR";

export interface Task9EvaluationResult {
  item: Task9Item;
  response: string;
  normalized_response: string;
  label: Task9Label;
  score: 0 | 1;
  needs_review: boolean;
  reason: string;
}

function canonicalTask9Item(pairRaw: string): Task9Item | null {
  const p = normalizeText(pairRaw).replace(/[\s_]+/g, "-");
  if (p === "train-bicycle" || p === "bicycle-train") return "train_bicycle";
  if (p === "watch-ruler" || p === "ruler-watch") return "ruler_watch";
  return null;
}

function normalizeTask9Response(input: string): string {
  let s = String(input ?? "").toLowerCase();

  // Keep Chinese characters while stripping punctuation/symbol noise.
  s = s
    .replace(/[.,!?;:()\[\]{}"'`~@#$%^&*+=<>\\/|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Remove common hedging/prefix phrases.
  s = s
    .replace(/^i think\s+/g, "")
    .replace(/^maybe\s+/g, "")
    .replace(/^they are both\s+/g, "")
    .replace(/^both are\s+/g, "")
    .replace(/^they both\s+/g, "");

  // Synonym normalization requested in spec.
  s = s
    .replace(/\btravelling\b/g, "travel")
    .replace(/\btraveling\b/g, "travel")
    .replace(/\btransportation\b/g, "transport")
    .replace(/\bvehicles\b/g, "vehicle")
    .replace(/\bmeasuring\b/g, "measure")
    .replace(/\bmeasurement\b/g, "measure")
    .replace(/\s+/g, " ")
    .trim();

  return s;
}

const TASK9_GENERAL_PATTERNS = [
  "object",
  "objects",
  "thing",
  "things",
  "item",
  "items",
  "tool",
  "tools",
  "useful things",
  "man made",
  "man-made",
  "things we use",
  "物体",
  "东西",
  "物品",
  "工具",
  "有用",
  "人造",
  "平时会用",
];

const TASK9_CONCRETE_PATTERNS: Record<Task9Item, string[]> = {
  train_bicycle: [
    "wheel",
    "wheels",
    "move",
    "seat",
    "seats",
    "metal",
    "man made",
    "man-made",
    "long",
    "都有轮子",
    "都会动",
    "都有座位",
    "金属",
    "人造",
  ],
  ruler_watch: [
    "number",
    "numbers",
    "mark",
    "marks",
    "hand",
    "hands",
    "small",
    "object",
    "objects",
    "都有数字",
    "都有刻度",
    "都有指针",
    "都很小",
    "都是物体",
  ],
};

const TASK9_ABSTRACT_PATTERNS: Record<Task9Item, string[]> = {
  train_bicycle: [
    "transport",
    "means of transport",
    "means of travel",
    "travel",
    "vehicle",
    "used to travel",
    "used for getting around",
    "get from one place to another",
    "trip",
    "交通工具",
    "出行工具",
    "用于旅行",
    "用于移动",
    "到达别处",
  ],
  ruler_watch: [
    "measure",
    "measuring instrument",
    "measuring tool",
    "used to measure",
    "for measure",
    "for measuring",
    "测量工具",
    "计量工具",
    "用来测量",
    "都可以测量",
  ],
};

function containsAny(text: string, patterns: string[]): boolean {
  return patterns.some((p) => text.includes(p));
}

export function evaluateTask9Item(input: {
  item: Task9Item;
  response: string;
}): Task9EvaluationResult {
  const response = String(input.response ?? "");
  const normalized = normalizeTask9Response(response);

  if (!normalized || normalized.length < 2) {
    return {
      item: input.item,
      response,
      normalized_response: normalized,
      label: "UNCLEAR",
      score: 0,
      needs_review: true,
      reason: "Response is too short or ambiguous to classify reliably.",
    };
  }

  const hitAbstract = containsAny(normalized, TASK9_ABSTRACT_PATTERNS[input.item]);
  const hitGeneral = containsAny(normalized, TASK9_GENERAL_PATTERNS);
  const hitConcrete = containsAny(normalized, TASK9_CONCRETE_PATTERNS[input.item]);

  // Correct abstract category overrides generic wording if both appear.
  if (hitAbstract) {
    return {
      item: input.item,
      response,
      normalized_response: normalized,
      label: "ABSTRACT_CORRECT",
      score: 1,
      needs_review: false,
      reason: "Response matches the required abstract common category.",
    };
  }

  if (hitConcrete) {
    return {
      item: input.item,
      response,
      normalized_response: normalized,
      label: "CONCRETE_INCORRECT",
      score: 0,
      needs_review: false,
      reason: "Response describes concrete/surface similarity, not abstraction category.",
    };
  }

  if (hitGeneral) {
    return {
      item: input.item,
      response,
      normalized_response: normalized,
      label: "TOO_GENERAL",
      score: 0,
      needs_review: true,
      reason: "Response is overly general and does not reach the target abstraction level.",
    };
  }

  return {
    item: input.item,
    response,
    normalized_response: normalized,
    label: "UNCLEAR",
    score: 0,
    needs_review: true,
    reason: "Response cannot be mapped to correct abstraction with sufficient certainty.",
  };
}

export function evaluateTask9Raw(raw: Task9Raw): Task9EvaluationResult[] {
  const items = Array.isArray(raw?.abstraction) ? raw.abstraction : [];
  const out: Task9EvaluationResult[] = [];

  for (const item of items) {
    const canonical = canonicalTask9Item(String(item?.pair ?? ""));
    if (!canonical) continue;
    out.push(
      evaluateTask9Item({
        item: canonical,
        response: String(item?.answer ?? ""),
      })
    );
  }

  return out;
}

export function scoreTask9(raw: Task9Raw): number {
  const evaluations = evaluateTask9Raw(raw);
  if (!evaluations.length) return 0;
  const score = evaluations.reduce((sum, e) => sum + e.score, 0);
  return Math.min(score, 2);
}

// ===============================
// Task 10 - Delayed RecallFree Recall (0-5)
// ===============================

export function scoreTask10(raw: Task10Raw): number {
  // MoCA total uses uncued free recall only (0-5).
  const targets = new Set(
    (Array.isArray(raw.delayedRecall.targetWords) ? raw.delayedRecall.targetWords : [])
      .map((w) => normalizeToken(String(w)))
      .filter(Boolean)
  );

  const freeRecall = new Set(
    (Array.isArray(raw.delayedRecall.freeRecall) ? raw.delayedRecall.freeRecall : [])
      .map((w) => normalizeToken(String(w)))
      .filter(Boolean)
  );

  let hits = 0;
  for (const w of freeRecall) {
    if (targets.has(w)) hits++;
  }
  return Math.min(hits, 5);
}

// ===============================
// Task 11 - Orientation (0-6)
// ===============================

export function scoreTask11(raw: Task11Raw): number {
  let score = 0;
  const orientation = raw.orientation;
  const now = new Date();

  // Year (1 point)
  const y = numericValue(orientation.year);
  if (y !== null && y === now.getFullYear()) score++;

  // Month (1 point)
  const currentMonth = normalizeMonth(now.toLocaleString("en-US", { month: "long" }));
  if (normalizeMonth(orientation.month) === currentMonth) score++;

  // Date (1 point) - must be exact day number.
  const d = numericValue(orientation.date);
  if (d !== null && d === now.getDate()) score++;

  // Day of week (1 point)
  const currentDay = normalizeWeekday(now.toLocaleString("en-US", { weekday: "long" }));
  if (normalizeWeekday(orientation.dayOfWeek) === currentDay) score++;

  // Place and City are exact-match items in MoCA instructions.
  // If expected values are configured, perform exact normalized matching;
  // otherwise fallback to non-empty checks.
  const expectedPlaces = (process.env.MOCA_ORIENTATION_PLACE ?? "")
    .split("|")
    .map((x) => normalizeText(x))
    .filter(Boolean);
  const expectedCities = (process.env.MOCA_ORIENTATION_CITY ?? "")
    .split("|")
    .map((x) => normalizeText(x))
    .filter(Boolean);

  const place = normalizeText(orientation.place);
  const city = normalizeText(orientation.city);

  const placeOk = expectedPlaces.length ? expectedPlaces.includes(place) : place.length > 0;
  const cityOk = expectedCities.length ? expectedCities.includes(city) : city.length > 0;

  if (placeOk) score++;
  if (cityOk) score++;

  return Math.min(score, 6);
}

// ===============================
// Task 1 - Trail Making (auto-scorable but not scoring points)
// ===============================

export function validateTask1(raw: any): boolean {
  return (
    raw?.trail?.completed === true ||
    (raw?.trail?.userPath && raw.trail.userPath.length > 0)
  );
}

// ===============================
// Score Calculator
// ===============================

export function calculateAutoScore(
  taskNumber: number,
  raw: any
): number | null {
  try {
    switch (taskNumber) {
      case 1:
        return raw?.trail?.completed === true && (raw?.trail?.errors?.length ?? 0) === 0 ? 1 : 0;
      case 4:
        return scoreTask4(raw as Task4Raw);
      case 5:
        return scoreTask5(raw as Task5Raw);
      case 2:
        return scoreTask2(raw as Task2Raw);
      case 3:
        return scoreTask3(raw as Task3Raw);
      case 6:
        return scoreTask6(raw as Task6Raw);
      case 7:
        return scoreTask7(raw as Task7Raw);
      case 8:
        return scoreTask8(raw as Task8Raw);
      case 9:
        return scoreTask9(raw as Task9Raw);
      case 10:
        return scoreTask10(raw as Task10Raw);
      case 11:
        return scoreTask11(raw as Task11Raw);
      default:
        return null;
    }
  } catch (error) {
    console.error(`Error calculating auto score for task ${taskNumber}:`, error);
    return null;
  }
}
