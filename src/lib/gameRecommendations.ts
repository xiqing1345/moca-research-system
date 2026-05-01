export type GameTier = "A" | "B" | "C";

export interface RecommendedGame {
  id: string;
  name: string;
  tier: GameTier;
  mocaRange: string;
  description: string;
  flow: string;
}

export interface TierRecommendation {
  tier: GameTier;
  mocaRange: string;
  rationale: string;
  games: RecommendedGame[];
}

const COMMON_FLOW = "15-second rules gate -> 60-second timed play -> completion screen";

const TIER_GAMES: Record<GameTier, RecommendedGame[]> = {
  A: [
    {
      id: "dual-task-switch",
      name: "Dual Task Switch",
      tier: "A",
      mocaRange: "26-30",
      description:
        "Rapid-fire trial game: classify letter (Vowel/Consonant) or number (Odd/Even), with unpredictable rule switching to stress cognitive flexibility.",
      flow: COMMON_FLOW,
    },
    {
      id: "pattern-memory",
      name: "Pattern Memory",
      tier: "A",
      mocaRange: "26-30",
      description:
        "Brief symbol sequence display (e.g., triangle/square/circle), then reproduce exact order. Sequence length scales with difficulty.",
      flow: COMMON_FLOW,
    },
    {
      id: "word-chain",
      name: "Word Chain",
      tier: "A",
      mocaRange: "26-30",
      description:
        "Word-chaining game where each submitted word must begin with the last letter of the previous accepted word.",
      flow: COMMON_FLOW,
    },
  ],
  B: [
    {
      id: "single-rule-classification",
      name: "Single-Rule Classification",
      tier: "B",
      mocaRange: "18-25",
      description:
        "Fixed rule pair (e.g., Animal vs. Not Animal), player rapidly taps correct side for each presented item.",
      flow: COMMON_FLOW,
    },
    {
      id: "delayed-recognition-memory",
      name: "Delayed Recognition Memory",
      tier: "B",
      mocaRange: "18-25",
      description:
        "Study short word list, wait through brief blank delay, then identify only original words from a mixed set.",
      flow: COMMON_FLOW,
    },
    {
      id: "category-chain",
      name: "Category Chain",
      tier: "B",
      mocaRange: "18-25",
      description:
        "Generate as many words as possible in a shown category (Animals/Food/etc.) within 60 seconds.",
      flow: COMMON_FLOW,
    },
  ],
  C: [
    {
      id: "image-matching",
      name: "Image Matching",
      tier: "C",
      mocaRange: "0-17",
      description:
        "A target emoji is shown; player taps the identical one from a small option set.",
      flow: COMMON_FLOW,
    },
    {
      id: "single-step-classification",
      name: "Single-Step Classification",
      tier: "C",
      mocaRange: "0-17",
      description:
        "One item per round with a single binary decision, e.g., Food / Not Food.",
      flow: COMMON_FLOW,
    },
    {
      id: "letter-fluency",
      name: "Letter Fluency",
      tier: "C",
      mocaRange: "0-17",
      description:
        "Generate as many words as possible beginning with a given letter within 60 seconds.",
      flow: COMMON_FLOW,
    },
  ],
};

export function getTierByMocaScore(totalScore: number): GameTier {
  if (totalScore >= 26) return "A";
  if (totalScore >= 18) return "B";
  return "C";
}

export function getGamesByMocaScore(totalScore: number): TierRecommendation {
  const tier = getTierByMocaScore(totalScore);
  const mocaRange = tier === "A" ? "26-30" : tier === "B" ? "18-25" : "0-17";

  return {
    tier,
    mocaRange,
    rationale: `Based on MoCA score ${totalScore}, user is mapped to Tier ${tier} (${mocaRange}).`,
    games: TIER_GAMES[tier],
  };
}

export function buildGameCatalogPromptBlock(): string {
  return [
    "Cognitive training game catalog (must follow exactly):",
    "Tier A (MoCA 26-30):",
    "- Dual Task Switch: Rapid-fire trial game where player classifies letter (Vowel/Consonant) or number (Odd/Even), with unpredictable rule switches.",
    "- Pattern Memory: Brief symbol sequence display; player reproduces exact order from memory; sequence length scales.",
    "- Word Chain: Each submitted word must begin with last letter of previous accepted word.",
    "Tier B (MoCA 18-25):",
    "- Single-Rule Classification: Fixed rule pair (Animal vs. Not Animal), rapid side tap.",
    "- Delayed Recognition Memory: Study words, brief delay, select studied words from mixed set.",
    "- Category Chain: Name words in shown category within 60 seconds.",
    "Tier C (MoCA 0-17):",
    "- Image Matching: Match target emoji from small option set.",
    "- Single-Step Classification: Single binary decision each round (Food / Not Food).",
    "- Letter Fluency: Name words starting with a given letter within 60 seconds.",
    "Common game flow for all games: 15-second rules gate, 60-second timed play, completion screen.",
    "Word-based games may use GPT adjudication for borderline submissions.",
    "Recommendation policy: choose games only from the tier matching total MoCA score, and include all three games from that tier.",
  ].join("\n");
}
