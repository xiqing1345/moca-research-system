import { NextRequest, NextResponse } from 'next/server';
import { requireResearchAuth } from '../../../_auth';
import path from 'node:path';
import fs from 'node:fs/promises';

export const runtime = 'nodejs';

function sanitizeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function sanitizeFileName(value: string) {
  // Keep extension and common filename characters only.
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function getArtifactsDir() {
  return process.env.ARTIFACTS_DIR || path.join(process.cwd(), 'storage');
}

function safeJoinWithin(rootDir: string, ...parts: string[]) {
  const root = path.resolve(rootDir);
  const target = path.resolve(root, ...parts);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (target === root || target.startsWith(rootWithSep)) return target;
  throw new Error('Refusing to read outside artifacts dir');
}

function getContentType(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webm') return 'audio/webm';
  if (ext === '.ogg') return 'audio/ogg';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.m4a') return 'audio/mp4';
  return 'application/octet-stream';
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string; fileName: string }> }
) {
  const auth = requireResearchAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { sessionId, fileName } = await params;
    const safeSessionId = sanitizeId(sessionId);
    const safeFileName = sanitizeFileName(fileName);

    const diskPath = safeJoinWithin(getArtifactsDir(), safeSessionId, safeFileName);
    const buf = await fs.readFile(diskPath);

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': getContentType(safeFileName),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Failed to read artifact:', error);
    return NextResponse.json({ ok: false, error: 'Artifact not found' }, { status: 404 });
  }
}
