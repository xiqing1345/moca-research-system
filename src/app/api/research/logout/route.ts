import { NextRequest, NextResponse } from 'next/server';
import { getResearchAuthCookieName } from '@/lib/researchAuth';

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: getResearchAuthCookieName(),
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return res;
}
