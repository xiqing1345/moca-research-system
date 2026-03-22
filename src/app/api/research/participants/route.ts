import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { requireResearchAuth } from '../_auth';

export async function GET(req: NextRequest) {
  const auth = requireResearchAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const participants = await prisma.participant.findMany({
      select: {
        id: true,
        code: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ ok: true, participants });
  } catch (error) {
    console.error('Failed to list participants:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to list participants' },
      { status: 500 }
    );
  }
}
