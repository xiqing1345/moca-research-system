import { prisma } from "../prisma/client";

export async function createSession(participantId: string) {
  try {
    const session = await prisma.session.create({
      data: {
        participantId,
        status: "consent",
        currentTask: 0,
      },
    });
    return session;
  } catch (error) {
    console.error("Error creating session:", error);
    throw error;
  }
}

export async function getSession(sessionId: string) {
  try {
    return await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        participant: true,
        responses: true,
      },
    });
  } catch (error) {
    console.error("Error fetching session:", error);
    throw error;
  }
}

export async function updateSessionStatus(
  sessionId: string,
  status: "consent" | "intro" | "task" | "submitted",
  currentTask?: number
) {
  try {
    return await prisma.session.update({
      where: { id: sessionId },
      data: {
        status,
        ...(currentTask !== undefined && { currentTask }),
      },
    });
  } catch (error) {
    console.error("Error updating session status:", error);
    throw error;
  }
}

export async function updateSessionConsent(
  sessionId: string,
  educationYears: number
) {
  try {
    return await prisma.session.update({
      where: { id: sessionId },
      data: {
        consentedAt: new Date(),
        educationYears,
        status: "intro",
      },
    });
  } catch (error) {
    console.error("Error updating session consent:", error);
    throw error;
  }
}

export async function submitSession(sessionId: string) {
  try {
    return await prisma.session.update({
      where: { id: sessionId },
      data: {
        submittedAt: new Date(),
        status: "submitted",
      },
    });
  } catch (error) {
    console.error("Error submitting session:", error);
    throw error;
  }
}

export async function getOrCreateParticipant(code: string) {
  try {
    const participant = await prisma.participant.findUnique({
      where: { code },
    });

    if (participant) {
      return participant;
    }

    return await prisma.participant.create({
      data: { code },
    });
  } catch (error) {
    console.error("Error getting/creating participant:", error);
    throw error;
  }
}

export async function listParticipants() {
  try {
    return await prisma.participant.findMany({
      include: {
        sessions: {
          include: {
            responses: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error listing participants:", error);
    throw error;
  }
}
