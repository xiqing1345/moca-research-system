import { buildGameCatalogPromptBlock, type TierRecommendation } from '@/lib/gameRecommendations';

function getOpenAiKey() {
  return process.env.OPENAI_API_KEY?.trim() || '';
}

function getTtsModel() {
  return process.env.OPENAI_TTS_MODEL?.trim() || 'gpt-4o-mini-tts';
}

function getTtsVoice() {
  return process.env.OPENAI_TTS_VOICE?.trim() || 'alloy';
}

function getAdviceModel() {
  return process.env.OPENAI_ADVICE_MODEL?.trim() || 'gpt-4o-mini';
}

export function getConfiguredTtsInfo() {
  return {
    model: getTtsModel(),
    voice: getTtsVoice(),
    enabled: isOpenAiEnabled(),
  };
}

export function getConfiguredAdviceInfo() {
  return {
    model: getAdviceModel(),
    enabled: isOpenAiEnabled(),
  };
}

export function isOpenAiEnabled() {
  return Boolean(getOpenAiKey());
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

export async function generateAssessmentAdvice(input: {
  reportText: string;
  totalScore?: number;
  tierRecommendation?: TierRecommendation;
}) {
  const key = getOpenAiKey();
  if (!key) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: getAdviceModel(),
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: [
            'You are a cognitive-assessment assistant. Summarize findings and provide practical follow-up suggestions. Do not diagnose diseases. Keep advice structured and concise.',
            buildGameCatalogPromptBlock(),
            'When total score is provided, include a section titled "Recommended Training Games" and list all 3 games from the matched tier only.',
          ].join('\n\n'),
        },
        {
          role: 'user',
          content: [
            'Please read this MoCA report summary and provide suggestions.',
            input.reportText,
            '',
            `Total score: ${typeof input.totalScore === 'number' ? input.totalScore : 'unknown'}`,
            input.tierRecommendation
              ? `Matched training tier: ${input.tierRecommendation.tier} (${input.tierRecommendation.mocaRange})`
              : 'Matched training tier: unknown',
            input.tierRecommendation
              ? `Tier rationale: ${input.tierRecommendation.rationale}`
              : 'Tier rationale: unavailable',
          ].join('\n'),
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI advice failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('OpenAI advice response was empty');
  }

  return {
    content,
    model: getAdviceModel(),
  };
}
