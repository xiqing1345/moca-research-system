import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  // Session state is managed client-side in localStorage.
  // Return a minimal skeleton so existing client code does not throw.
  return NextResponse.json({
    ok: true,
    session: {
      id: sessionId,
      status: "task",
      currentTask: 1,
      responses: [],
    },
  });
}
