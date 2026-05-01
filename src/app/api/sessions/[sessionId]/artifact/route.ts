import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function guessExtension(mime: string) {
  const m = mime.toLowerCase();
  if (m === 'image/png') return 'png';
  if (m === 'image/jpeg') return 'jpg';
  if (m === 'audio/webm') return 'webm';
  if (m === 'audio/ogg' || m === 'audio/opus') return 'ogg';
  if (m === 'audio/wav' || m === 'audio/x-wav') return 'wav';
  if (m === 'audio/mpeg') return 'mp3';
  if (m === 'audio/mp4') return 'm4a';
  return 'bin';
}

function guessKind(mime: string): 'png' | 'audio' | 'other' {
  const m = mime.toLowerCase();
  if (m.startsWith('audio/')) return 'audio';
  if (m === 'image/png' || m === 'image/jpeg') return 'png';
  return 'other';
}

// Artifacts are encoded as base64 data URLs so no file system is required.
// The data URL is stored in the client localStorage via the artifact metadata.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    await params;
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'Missing file' }, { status: 400 });
    }

    const taskNumberRaw = formData.get('taskNumber');
    const labelRaw = formData.get('label');
    const taskNumber = Number(taskNumberRaw);

    if (!Number.isFinite(taskNumber) || taskNumber < 1 || taskNumber > 11) {
      return NextResponse.json({ ok: false, error: 'Invalid taskNumber' }, { status: 400 });
    }

    const mime = file.type || 'application/octet-stream';
    const kind = guessKind(mime);
    const ext = guessExtension(mime);
    const label =
      typeof labelRaw === 'string' && labelRaw.trim()
        ? labelRaw.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)
        : '';
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = label
      ? `task${taskNumber}_${label}_${ts}.${ext}`
      : `task${taskNumber}_${ts}.${ext}`;

    const buf = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;

    return NextResponse.json({
      ok: true,
      file: {
        kind,
        path: dataUrl,
        name: baseName,
        mime,
        size: buf.length,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Artifact upload failed:', error);
    return NextResponse.json({ ok: false, error: 'Failed to upload artifact' }, { status: 500 });
  }
}
