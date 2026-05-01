import { NextResponse } from "next/server";

// Session start state is managed client-side in localStorage. This endpoint is a no-op.
export async function POST() {
  return NextResponse.json({ ok: true, currentTask: 1 });
}
