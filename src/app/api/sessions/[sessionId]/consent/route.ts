import { prisma } from "@/lib/prisma/client";
import { NextRequest, NextResponse } from "next/server";

interface ConsentRequest {
  consentedAt?: string;
  educationYears: number;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body: ConsentRequest = await req.json();

    if (body.educationYears === undefined || Number.isNaN(Number(body.educationYears))) {
      return NextResponse.json(
        { ok: false, error: "educationYears is required" },
        { status: 400 }
      );
    }

    const session = await prisma.session.update({
      where: { id: sessionId },
      data: {
        consentedAt: body.consentedAt ? new Date(body.consentedAt) : new Date(),
        educationYears: Number(body.educationYears),
        status: "intro",
      },
    });

    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      status: session.status,
    });
  } catch (error) {
    console.error("Error saving consent:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to save consent" },
      { status: 500 }
    );
  }
}
