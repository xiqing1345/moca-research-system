import { prisma } from "@/lib/prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await req.json().catch(() => ({}));

    const existing = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { participantId: true, currentTask: true },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Session not found" },
        { status: 404 }
      );
    }

    if (body?.participantId && body.participantId !== existing.participantId) {
      return NextResponse.json(
        { ok: false, error: "participantId mismatch" },
        { status: 400 }
      );
    }

    const session = await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: "task",
        currentTask: existing.currentTask > 0 ? existing.currentTask : 1,
      },
    });

    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      currentTask: session.currentTask,
    });
  } catch (error) {
    console.error("Error starting session:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to start session" },
      { status: 500 }
    );
  }
}
