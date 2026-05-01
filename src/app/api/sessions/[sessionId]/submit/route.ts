import { NextResponse } from "next/server";

// Submission state is managed client-side in localStorage. This endpoint is a no-op.
export async function POST() {
  return NextResponse.json({ ok: true });
}
