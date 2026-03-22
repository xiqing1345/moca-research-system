import { prisma } from "@/lib/prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ participantId: string }> }
) {
  try {
    const { participantId } = await context.params;

    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: {
        sessions: {
          orderBy: { startedAt: "desc" },
        },
      },
    });

    if (!participant) {
      return NextResponse.json(
        { ok: false, error: "Participant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      participant,
    });
  } catch (error) {
    console.error("Error fetching participant:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch participant" },
      { status: 500 }
    );
  }
}
