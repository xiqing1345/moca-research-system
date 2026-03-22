import { NextRequest, NextResponse } from 'next/server';
import { getResearchAuthCookieName, verifyResearchToken } from '@/lib/researchAuth';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(getResearchAuthCookieName())?.value;
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  const verified = verifyResearchToken(token);
  if (!verified.ok) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  return NextResponse.json({ ok: true, username: verified.username });
}
