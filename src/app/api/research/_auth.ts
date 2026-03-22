import { NextRequest } from 'next/server';
import { getResearchAuthCookieName, verifyResearchToken } from '@/lib/researchAuth';

export function requireResearchAuth(req: NextRequest): { ok: true; username: string } | { ok: false } {
  const token = req.cookies.get(getResearchAuthCookieName())?.value;
  if (!token) return { ok: false };
  return verifyResearchToken(token);
}
