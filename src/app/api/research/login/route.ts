import { NextRequest, NextResponse } from 'next/server';
import {
  getResearchAuthCookieName,
  signResearchToken,
  verifyCredentials,
} from '@/lib/researchAuth';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { username?: string; password?: string };
    const username = (body.username ?? '').trim();
    const password = body.password ?? '';

    if (!username || !password) {
      return NextResponse.json(
        { ok: false, error: 'Username and password required' },
        { status: 400 }
      );
    }

    if (!verifyCredentials(username, password)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = signResearchToken(username);
    const res = NextResponse.json({ ok: true, username });
    res.cookies.set({
      name: getResearchAuthCookieName(),
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 8,
    });

    return res;
  } catch (error) {
    console.error('Research login failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
