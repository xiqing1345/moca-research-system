import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { requireResearchAuth } from '../../../../_auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string; taskNumber: string }> }
) {
  const auth = requireResearchAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { sessionId, taskNumber } = await params;
    const tn = Number(taskNumber);
    if (!Number.isFinite(tn) || tn < 1 || tn > 11) {
      return NextResponse.json({ ok: false, error: 'Invalid taskNumber' }, { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as any;
    const humanScoreRaw = body?.humanScore;
    const needsReviewRaw = body?.needsReview;

    const updateData: any = {
      reviewedBy: auth.username,
      reviewedAt: new Date(),
    };

    if (humanScoreRaw === null) {
      updateData.humanScore = null;
    } else if (humanScoreRaw !== undefined) {
      const hs = Number(humanScoreRaw);
      if (!Number.isFinite(hs) || !Number.isInteger(hs) || hs < 0 || hs > 30) {
        return NextResponse.json({ ok: false, error: 'Invalid humanScore' }, { status: 400 });
      }
      updateData.humanScore = hs;
    }

    if (needsReviewRaw !== undefined) {
      updateData.needsReview = Boolean(needsReviewRaw);
    }

    const existing = await prisma.taskResponse.findUnique({
      where: { sessionId_taskNumber: { sessionId, taskNumber: tn } },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'TaskResponse not found' }, { status: 404 });
    }

    const updated = await prisma.taskResponse.update({
      where: { sessionId_taskNumber: { sessionId, taskNumber: tn } },
      data: updateData,
      select: {
        id: true,
        sessionId: true,
        taskNumber: true,
        autoScore: true,
        humanScore: true,
        needsReview: true,
        reviewedBy: true,
        reviewedAt: true,
      },
    });

    return NextResponse.json({ ok: true, response: updated });
  } catch (error) {
    console.error('Failed to update scoring:', error);
    return NextResponse.json({ ok: false, error: 'Failed to update scoring' }, { status: 500 });
  }
}
