import { calculateAutoScore } from "@/lib/scoring/autoScore";
import { SaveTaskRequest } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

// Session responses are stored client-side in localStorage.
// This endpoint only runs auto-scoring and returns the result.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    await params; // consume params to satisfy Next.js
    const body: SaveTaskRequest = await req.json();
    const { taskNumber, raw } = body;

    let autoScore = body.autoScore;
    if (autoScore === undefined && raw) {
      autoScore = calculateAutoScore(taskNumber, raw) ?? undefined;
    }

    return NextResponse.json({ ok: true, taskNumber, autoScore });
  } catch (error) {
    console.error("Error in save route:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to process save request" },
      { status: 500 }
    );
  }
}
