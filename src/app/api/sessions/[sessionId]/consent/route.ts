import { NextResponse } from "next/server";

// Consent is saved client-side in localStorage. This endpoint is a no-op.
export async function POST() {
  return NextResponse.json({ ok: true });
}
