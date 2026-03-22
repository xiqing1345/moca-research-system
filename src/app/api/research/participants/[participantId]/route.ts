import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { requireResearchAuth } from '../../_auth';
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

function safeJoinWithin(rootDir: string, childName: string) {
  const root = path.resolve(rootDir);
  const target = path.resolve(root, childName);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (target === root || target.startsWith(rootWithSep)) return { root, target };
  throw new Error('Refusing to delete outside artifacts dir');
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ participantId: string }> }
) {
  const auth = requireResearchAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { participantId } = await params;

    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: {
        sessions: {
          orderBy: { startedAt: 'desc' },
          include: {
            responses: {
              orderBy: { taskNumber: 'asc' },
            },
          },
        },
      },
    });

    if (!participant) {
      return NextResponse.json(
        { ok: false, error: 'Participant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, participant });
  } catch (error) {
    console.error('Failed to fetch participant detail:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch participant detail' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ participantId: string }> }
) {
  const auth = requireResearchAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { participantId } = await params;

    const existing = await prisma.participant.findUnique({
      where: { id: participantId },
      select: { id: true, code: true },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: 'Participant not found' },
        { status: 404 }
      );
    }

    const sessions = await prisma.session.findMany({
      where: { participantId },
      select: { id: true },
    });
    const sessionIds = sessions.map((s) => s.id);

    await prisma.$transaction(async (tx) => {
      if (sessionIds.length > 0) {
        await tx.taskResponse.deleteMany({
          where: { sessionId: { in: sessionIds } },
        });
      }

      await tx.session.deleteMany({ where: { participantId } });
      await tx.participant.delete({ where: { id: participantId } });
    });

    // Best-effort cleanup of local artifact files under storage/<sessionId>/
    const warnings: string[] = [];
    const artifactsDir = getArtifactsDir();
    for (const sid of sessionIds) {
      try {
        const safeSessionId = sanitizeId(sid);
        const { target } = safeJoinWithin(artifactsDir, safeSessionId);
        await fs.rm(target, { recursive: true, force: true });
      } catch (e) {
        warnings.push(
          `Failed to delete artifacts for session ${sid}: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }

    return NextResponse.json({ ok: true, warnings: warnings.length ? warnings : undefined });
  } catch (error) {
    console.error('Failed to delete participant:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to delete participant' },
      { status: 500 }
    );
  }
}
