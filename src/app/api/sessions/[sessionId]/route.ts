import { prisma } from "@/lib/prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        participant: true,
        responses: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      session,
    });
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}
