import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs/promises';

export const runtime = 'nodejs';

function sanitizeId(value: string) {
  // Keep it simple and safe for filesystem paths.
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function getArtifactsDir() {
  // Relative to project root at runtime.
  return process.env.ARTIFACTS_DIR || path.join(process.cwd(), 'storage');
}

function sanitizeLabel(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
}

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const safeSessionId = sanitizeId(sessionId);

    const formData = await req.formData();
    const file = formData.get('file');
    const taskNumberRaw = formData.get('taskNumber');
    const labelRaw = formData.get('label');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: 'Missing file' },
        { status: 400 }
      );
    }

    const taskNumber = Number(taskNumberRaw);
    if (!Number.isFinite(taskNumber) || taskNumber < 1 || taskNumber > 11) {
      return NextResponse.json(
        { ok: false, error: 'Invalid taskNumber' },
        { status: 400 }
      );
    }

    const mime = file.type || 'application/octet-stream';
    const ext = guessExtension(mime);
    const kind = guessKind(mime);

    const label = typeof labelRaw === 'string' && labelRaw.trim() ? sanitizeLabel(labelRaw.trim()) : '';

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = label
      ? `task${taskNumber}_${label}_${ts}.${ext}`
      : `task${taskNumber}_${ts}.${ext}`;

    const dir = path.join(getArtifactsDir(), safeSessionId);
    await fs.mkdir(dir, { recursive: true });

    const diskPath = path.join(dir, baseName);
    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(diskPath, buf);

    const relativePath = path
      .relative(process.cwd(), diskPath)
      .split(path.sep)
      .join('/');

    return NextResponse.json({
      ok: true,
      file: {
        kind: kind,
        path: relativePath,
        mime: mime,
        size: buf.length,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Artifact upload failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to upload artifact' },
      { status: 500 }
    );
  }
}
