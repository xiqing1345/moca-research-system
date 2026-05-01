// Client-side session storage helpers.
// All session state is stored in localStorage so no database is required on Vercel.

export interface LocalTaskResponse {
  taskNumber: number;
  raw: any;
  events: any[];
  artifacts?: any;
  autoScore?: number;
  startedAt: string;
  endedAt?: string;
}

export interface LocalSession {
  id: string;
  participantCode: string;
  educationYears?: number;
  consentedAt?: string;
  status: 'consent' | 'intro' | 'task' | 'submitted';
  currentTask: number;
  responses: Record<number, LocalTaskResponse>;
  memoryWordListId?: string;
}

function storageKey(sessionId: string) {
  return `moca_session_${sessionId}`;
}

export function loadLocalSession(sessionId: string): LocalSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(sessionId));
    return raw ? (JSON.parse(raw) as LocalSession) : null;
  } catch {
    return null;
  }
}

export function saveLocalSession(session: LocalSession): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(session.id), JSON.stringify(session));
  } catch {
    // Ignore storage errors (e.g. quota exceeded).
  }
}

export function createLocalSession(
  sessionId: string,
  participantCode: string
): LocalSession {
  const session: LocalSession = {
    id: sessionId,
    participantCode,
    status: 'consent',
    currentTask: 0,
    responses: {},
  };
  saveLocalSession(session);
  return session;
}
