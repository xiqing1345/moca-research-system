import crypto from 'node:crypto';

export type ResearchAccount = {
  username: string;
  password: string;
};

// Prepared for future expansion: add more accounts here.
export const RESEARCH_ACCOUNTS: ResearchAccount[] = [
  { username: 'xiqing', password: '185254' },
];

const COOKIE_NAME = 'moca_research_auth';

export function getResearchAuthCookieName() {
  return COOKIE_NAME;
}

function base64UrlEncode(buf: Buffer) {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecodeToBuffer(s: string) {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const withPad = padded + '='.repeat(padLen);
  return Buffer.from(withPad, 'base64');
}

function timingSafeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function verifyCredentials(username: string, password: string) {
  const account = RESEARCH_ACCOUNTS.find((a) => a.username === username);
  if (!account) return false;
  return timingSafeEqual(account.password, password);
}

function getSecret() {
  // For internal use. Override in deployment.
  return process.env.RESEARCH_AUTH_SECRET || 'dev-research-secret';
}

type TokenPayload = {
  u: string; // username
  iat: number;
  exp: number;
};

export function signResearchToken(username: string) {
  const nowSec = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    u: username,
    iat: nowSec,
    exp: nowSec + 60 * 60 * 8, // 8 hours
  };

  const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(payload), 'utf8'));
  const sig = crypto
    .createHmac('sha256', getSecret())
    .update(payloadB64)
    .digest();

  return `${payloadB64}.${base64UrlEncode(sig)}`;
}

export function verifyResearchToken(token: string): { ok: true; username: string } | { ok: false } {
  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false };
  const [payloadB64, sigB64] = parts;

  const expectedSig = crypto
    .createHmac('sha256', getSecret())
    .update(payloadB64)
    .digest();
  const expectedSigB64 = base64UrlEncode(expectedSig);
  if (!timingSafeEqual(expectedSigB64, sigB64)) return { ok: false };

  let payload: TokenPayload;
  try {
    payload = JSON.parse(base64UrlDecodeToBuffer(payloadB64).toString('utf8')) as TokenPayload;
  } catch {
    return { ok: false };
  }

  if (!payload?.u || typeof payload.u !== 'string') return { ok: false };
  if (typeof payload.exp !== 'number') return { ok: false };
  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.exp < nowSec) return { ok: false };

  return { ok: true, username: payload.u };
}
