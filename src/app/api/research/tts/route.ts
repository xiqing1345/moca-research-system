import { NextRequest, NextResponse } from 'next/server';
import { getConfiguredTtsInfo, synthesizeSpeech } from '@/lib/openai';

export const runtime = 'nodejs';

function normalizeText(input: string) {
  return input.replace(/\s+/g, ' ').trim();
}

export async function POST(req: NextRequest) {
  try {
    const ttsInfo = getConfiguredTtsInfo();
    const body = (await req.json()) as { text?: string; speed?: 'slow' | 'normal' };
    const text = normalizeText(String(body?.text ?? '')).slice(0, 5000);

    if (!text) {
      return NextResponse.json({ ok: false, error: 'text is required' }, { status: 400 });
    }

    const audio = await synthesizeSpeech({
      text,
      speed: body?.speed === 'slow' ? 'slow' : 'normal',
    });

    return new NextResponse(audio, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
        'X-OpenAI-TTS-Model': ttsInfo.model,
        'X-OpenAI-TTS-Voice': ttsInfo.voice,
      },
    });
  } catch (error) {
    console.error('TTS API failed:', error);
    return NextResponse.json({ ok: false, error: 'Failed to generate speech' }, { status: 500 });
  }
}
