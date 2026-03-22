import fs from 'node:fs/promises';
import path from 'node:path';

export interface VisionScoreResult {
  score: number;
  confidence?: number;
  reason?: string;
}

function getOpenAiKey() {
  return process.env.OPENAI_API_KEY?.trim() || '';
}

function getVisionModel() {
  return process.env.OPENAI_VISION_MODEL?.trim() || 'gpt-4.1-mini';
}

function getTtsModel() {
  return process.env.OPENAI_TTS_MODEL?.trim() || 'gpt-4o-mini-tts';
}

function getTtsVoice() {
  return process.env.OPENAI_TTS_VOICE?.trim() || 'alloy';
}

export function getConfiguredTtsInfo() {
  return {
    model: getTtsModel(),
    voice: getTtsVoice(),
    enabled: isOpenAiEnabled(),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function isOpenAiEnabled() {
  return Boolean(getOpenAiKey());
}

async function readImageAsDataUrl(relativePath: string) {
  const abs = path.isAbsolute(relativePath)
    ? relativePath
    : path.join(process.cwd(), relativePath);

  const ext = path.extname(abs).toLowerCase();
  const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
  const data = await fs.readFile(abs);
  return `data:${mime};base64,${data.toString('base64')}`;
}

export async function scoreDrawingWithVision(params: {
  taskNumber: 2 | 3;
  baseScore: number;
  maxScore: number;
  raw: any;
  artifactPath: string;
}) {
  const key = getOpenAiKey();
  if (!key) return null;

  const imageDataUrl = await readImageAsDataUrl(params.artifactPath);

  const rubric =
    params.taskNumber === 2
      ? 'Task 2 (Copy Chair), score range 0-1. Give 1 only if the copied chair is recognizable and structurally close to target (legs/back/seat relationships mostly preserved). Else 0.'
      : 'Task 3 (Clock Drawing), score range 0-3. Evaluate clock contour, numbers placement, and hands indicating around 11:10.';

  const prompt = [
    'You are assisting MoCA scoring.',
    `Base heuristic score from rules engine: ${params.baseScore} (0-${params.maxScore}).`,
    rubric,
    'Return strict JSON only: {"score": number, "confidence": number, "reason": string}.',
    'Use integer score only. confidence must be 0~1.',
  ].join('\n');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: getVisionModel(),
      max_output_tokens: 220,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'moca_vision_score',
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['score', 'confidence', 'reason'],
            properties: {
              score: { type: 'integer' },
              confidence: { type: 'number' },
              reason: { type: 'string' },
            },
          },
        },
      },
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: prompt },
            { type: 'input_image', image_url: imageDataUrl },
            {
              type: 'input_text',
              text: `Raw task payload JSON: ${JSON.stringify(params.raw ?? {}).slice(0, 15000)}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI vision scoring failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as any;
  const rawText = String(data?.output_text ?? '').trim();
  if (!rawText) return null;

  let parsed: VisionScoreResult;
  try {
    parsed = JSON.parse(rawText) as VisionScoreResult;
  } catch {
    return null;
  }

  const score = clamp(Number(parsed.score ?? params.baseScore), 0, params.maxScore);
  const confidence = clamp(Number(parsed.confidence ?? 0.5), 0, 1);
  const fused = Math.round(params.baseScore * 0.2 + score * 0.8);

  return {
    baseScore: params.baseScore,
    aiScore: score,
    fusedScore: clamp(fused, 0, params.maxScore),
    confidence,
    reason: parsed.reason || '',
    model: getVisionModel(),
  };
}

export interface AudioScoreResult {
  sentence1Score: number; // 0-1
  sentence2Score: number; // 0-1
  sentence1Reason?: string;
  sentence2Reason?: string;
  confidence?: number;
}

export async function scoreAudioWithVision(params: {
  audioPath1: string;
  audioPath2: string;
}) {
  const key = getOpenAiKey();
  if (!key) return null;

  const audioDataUrl1 = await readImageAsDataUrl(params.audioPath1);
  const audioDataUrl2 = await readImageAsDataUrl(params.audioPath2);

  const prompt = [
    'You are evaluating audio recordings of sentence repetition for a cognitive test.',
    'Reference sentences:',
    '1. "I only know that John is the one to help today."',
    '2. "The cat always hid under the couch when dogs were in the room."',
    '',
    'Listen to the two audio recordings and evaluate:',
    '- Sentence 1: Does the speaker correctly repeat "I only know that John is the one to help today."?',
    '- Sentence 2: Does the speaker correctly repeat "The cat always hid under the couch when dogs were in the room."?',
    '',
    'Return strict JSON only: {"sentence1Score": 0|1, "sentence2Score": 0|1, "sentence1Reason": string, "sentence2Reason": string, "confidence": 0~1}.',
    'Score 1 if the sentence is correctly repeated with minor pronunciation/accent variations acceptable.',
    'Score 0 if there are significant omissions, additions, or semantic changes.',
  ].join('\n');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: getVisionModel(),
      max_output_tokens: 280,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'moca_audio_score',
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['sentence1Score', 'sentence2Score', 'confidence'],
            properties: {
              sentence1Score: { type: 'integer' },
              sentence2Score: { type: 'integer' },
              sentence1Reason: { type: 'string' },
              sentence2Reason: { type: 'string' },
              confidence: { type: 'number' },
            },
          },
        },
      },
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: prompt },
            { type: 'input_audio', audio_url: audioDataUrl1 },
            { type: 'input_audio', audio_url: audioDataUrl2 },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI audio scoring failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as any;
  const rawText = String(data?.output_text ?? '').trim();
  if (!rawText) return null;

  let parsed: AudioScoreResult;
  try {
    parsed = JSON.parse(rawText) as AudioScoreResult;
  } catch {
    return null;
  }

  const s1 = clamp(Number(parsed.sentence1Score ?? 0), 0, 1);
  const s2 = clamp(Number(parsed.sentence2Score ?? 0), 0, 1);
  return {
    sentence1Score: s1,
    sentence2Score: s2,
    sentence1Reason: parsed.sentence1Reason || '',
    sentence2Reason: parsed.sentence2Reason || '',
    confidence: clamp(Number(parsed.confidence ?? 0.5), 0, 1),
    model: getVisionModel(),
  };
}

export async function synthesizeSpeech(input: {
  text: string;
  speed?: 'slow' | 'normal';
}) {
  const key = getOpenAiKey();
  if (!key) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const speed = input.speed === 'slow' ? 0.85 : 1;

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: getTtsModel(),
      voice: getTtsVoice(),
      format: 'mp3',
      speed,
      input: input.text,
      instructions: 'Read this assessment text naturally in clear English.',
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI TTS failed (${response.status}): ${text}`);
  }

  return Buffer.from(await response.arrayBuffer());
}
