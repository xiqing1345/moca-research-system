import { prisma } from "@/lib/prisma/client";
import { SubmitSessionRequest } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body: SubmitSessionRequest = await req.json();

    const session = await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: "submitted",
        submittedAt: new Date(body.submittedAt),
      },
    });

    return NextResponse.json({
      ok: true,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Error submitting session:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to submit session" },
      { status: 500 }
    );
  }
}
