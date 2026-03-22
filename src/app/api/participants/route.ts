import { prisma } from "@/lib/prisma/client";
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

    let participant = await prisma.participant.findUnique({
      where: { code },
    });

    if (!participant) {
      participant = await prisma.participant.create({
        data: { code },
      });
    }

    const existingActiveSession = await prisma.session.findFirst({
      where: {
        participantId: participant.id,
        status: {
          not: "submitted",
        },
      },
      orderBy: {
        startedAt: "desc",
      },
    });

    const session =
      existingActiveSession ??
      (await prisma.session.create({
        data: {
          participantId: participant.id,
          status: "consent",
          currentTask: 0,
        },
      }));

    const nextPath =
      session.status === "consent"
        ? `/session/${session.id}/consent`
        : session.status === "intro"
          ? `/session/${session.id}/intro`
          : session.status === "submitted"
            ? `/session/${session.id}/done`
            : `/session/${session.id}/task/${Math.min(Math.max(session.currentTask, 1), 11)}`;

    return NextResponse.json({
      ok: true,
      participantId: participant.id,
      sessionId: session.id,
      nextPath,
    });
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to create session" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  context: { params: {} }
) {
  try {
    const participants = await prisma.participant.findMany({
      include: {
        sessions: true,
      },
    });

    return NextResponse.json({
      ok: true,
      participants,
    });
  } catch (error) {
    console.error("Error listing participants:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to list participants" },
      { status: 500 }
    );
  }
}
