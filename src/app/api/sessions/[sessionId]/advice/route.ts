import { calculateAutoScore } from '@/lib/scoring/autoScore';
import { getGamesByMocaScore } from '@/lib/gameRecommendations';
import { generateAssessmentAdvice, getConfiguredAdviceInfo } from '@/lib/openai';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const TASK_TITLES: Record<number, string> = {
  1: 'Alternating Trail Making',
  2: 'Copy Chair',
  3: 'Clock Drawing',
  4: 'Naming',
  5: 'Memory (Immediate)',
  6: 'Attention',
  7: 'Sentence Repetition',
  8: 'Verbal Fluency',
  9: 'Abstraction',
  10: 'Delayed Recall',
  11: 'Orientation',
};

const TASK_PROMPTS: Record<number, string> = {
  1: 'Draw a line in order: 1-A-2-B-3-C-4-D-5-E.',
  2: 'Copy the target chair pattern on the same-size grid.',
  3: 'Adjust the preset clock hands to the target time.',
  4: 'Name each displayed animal.',
  5: 'Remember and repeat the word list in two immediate trials.',
  6: 'Complete digit span, vigilance and serial subtraction tasks.',
  7: 'Repeat each sentence exactly as spoken.',
  8: 'Say as many words as possible beginning with the target letter.',
  9: 'Explain what each pair of words has in common.',
  10: 'Recall the memory words after delay.',
  11: 'Answer orientation questions about date and place.',
};

function resolveScore(response: any): number {
  if (typeof response?.humanScore === 'number') return response.humanScore;

  const recalculated = calculateAutoScore(Number(response?.taskNumber), response?.raw);
  if (typeof recalculated === 'number') return recalculated;

  if (typeof response?.autoScore === 'number') return response.autoScore;

  return 0;
}

function summarizeAnswer(taskNumber: number, raw: any): string {
  if (!raw) return 'No response saved.';

  switch (taskNumber) {
    case 1: {
      const completed = raw?.trail?.completed ? 'yes' : 'no';
      const errors = Array.isArray(raw?.trail?.errors) ? raw.trail.errors.length : 0;
      return `completed=${completed}, errors=${errors}`;
    }
    case 2: {
      const user = Array.isArray(raw?.copyGrid?.userCells) ? raw.copyGrid.userCells.length : 0;
      const f1 = typeof raw?.copyGrid?.stats?.f1 === 'number' ? raw.copyGrid.stats.f1.toFixed(3) : '-';
      return `user_filled_cells=${user}, f1=${f1}`;
    }
    case 3: {
      const target = raw?.clock?.targetTime ?? '-';
      const h = Number(raw?.clock?.answer?.hour);
      const m = Number(raw?.clock?.answer?.minute);
      return Number.isFinite(h) && Number.isFinite(m)
        ? `target=${target}, answer=${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        : `target=${target}, no valid hand answer`;
    }
    case 4:
      return `naming_items=${Array.isArray(raw?.naming) ? raw.naming.length : 0}`;
    case 5:
      return `trial1_words=${Array.isArray(raw?.memoryImmediate?.trial1) ? raw.memoryImmediate.trial1.length : 0}, trial2_words=${Array.isArray(raw?.memoryImmediate?.trial2) ? raw.memoryImmediate.trial2.length : 0}`;
    case 6:
      return `serial7_answers=${Array.isArray(raw?.attention?.serial7?.answers) ? raw.attention.serial7.answers.join(',') : '-'}`;
    case 7:
      return `sentence_transcripts=${Array.isArray(raw?.sentenceRepetition) ? raw.sentenceRepetition.map((x: any) => String(x?.transcript?.text ?? '')).filter(Boolean).length : 0}`;
    case 8:
      return `fluency_words=${Array.isArray(raw?.fluency?.words) ? raw.fluency.words.length : 0}`;
    case 9:
      return `abstraction_items=${Array.isArray(raw?.abstraction) ? raw.abstraction.length : 0}`;
    case 10:
      return `free_recall=${Array.isArray(raw?.delayedRecall?.freeRecall) ? raw.delayedRecall.freeRecall.join(' ') : '-'}`;
    case 11:
      return `orientation_place=${String(raw?.orientation?.place ?? '-')}, city=${String(raw?.orientation?.city ?? '-')}`;
    default:
      return 'N/A';
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const adviceInfo = getConfiguredAdviceInfo();
    if (!adviceInfo.enabled) {
      return NextResponse.json(
        { ok: false, error: 'OPENAI_API_KEY is not configured' },
        { status: 503 }
      );
    }

    const { sessionId } = await params;

    // Responses are passed from the client (localStorage) in the request body.
    const body = await req.json().catch(() => ({}));
    const responses: any[] = Array.isArray(body.responses) ? body.responses : [];

    const byTask = new Map<number, any>();
    for (const r of responses) {
      byTask.set(Number(r.taskNumber), r);
    }

    const reportLines: string[] = [];
    reportLines.push(`Session id: ${sessionId}`);
    reportLines.push(`Generated at: ${new Date().toISOString()}`);

    let total = 0;
    for (let taskNumber = 1; taskNumber <= 11; taskNumber++) {
      const response = byTask.get(taskNumber);
      const score = resolveScore(response);
      total += score;
      reportLines.push('');
      reportLines.push(`Task ${taskNumber} - ${TASK_TITLES[taskNumber]}`);
      reportLines.push(`Question: ${TASK_PROMPTS[taskNumber]}`);
      reportLines.push(`Score: ${score}`);
      reportLines.push(`Answer summary: ${summarizeAnswer(taskNumber, response?.raw)}`);
    }

    reportLines.push('');
    reportLines.push(`Total raw sum score (task-wise sum): ${total}`);

    const tierRecommendation = getGamesByMocaScore(total);

    const ai = await generateAssessmentAdvice({
      reportText: reportLines.join('\n'),
      totalScore: total,
      tierRecommendation,
    });

    return NextResponse.json({
      ok: true,
      sessionId,
      model: ai.model,
      advice: ai.content,
      totalScore: total,
      recommendation: tierRecommendation,
    });
  } catch (error) {
    console.error('Error generating AI advice:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to generate AI advice' },
      { status: 500 }
    );
  }
}
