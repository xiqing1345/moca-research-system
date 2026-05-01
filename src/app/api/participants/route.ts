import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json(
        { ok: false, error: "Participant code required" },
        { status: 400 }
      );
    }

    // All session state is stored client-side in localStorage.
    // Generate IDs here so the client can use them as localStorage keys.
    const participantId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();

    return NextResponse.json({
      ok: true,
      participantId,
      sessionId,
      nextPath: `/session/${sessionId}/consent`,
    });
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to create session" },
      { status: 500 }
    );
  }
}


