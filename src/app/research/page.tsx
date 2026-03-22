'use client';

import { useEffect, useMemo, useState } from 'react';

type ParticipantListItem = {
  id: string;
  code: string;
  createdAt: string;
};

export default function ResearchPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [participants, setParticipants] = useState<ParticipantListItem[]>([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [participantDetail, setParticipantDetail] = useState<any>(null);

  const [viewerSessionId, setViewerSessionId] = useState<string | null>(null);
  const [viewerTaskNumber, setViewerTaskNumber] = useState<number | null>(null);
  const [scoreHuman, setScoreHuman] = useState<string>('');
  const [scoreNeedsReview, setScoreNeedsReview] = useState(false);
  const [scoreSaving, setScoreSaving] = useState(false);

  const TASK_TITLES: Record<number, string> = {
    1: 'Alternating Trail Making',
    2: 'Copy Cube/Chair',
    3: 'Clock Drawing',
    4: 'Animal Naming',
    5: 'Memory (Immediate)',
    6: 'Attention',
    7: 'Sentence Repetition',
    8: 'Verbal Fluency',
    9: 'Abstraction',
    10: 'Delayed Recall',
    11: 'Orientation',
  };

  const NAMING_PROMPTS: Record<string, { emoji: string; name: string }> = {
    // New (simple) pool
    animal_cat: { emoji: '🐱', name: 'Cat' },
    animal_dog: { emoji: '🐶', name: 'Dog' },
    animal_cow: { emoji: '🐮', name: 'Cow' },
    animal_pig: { emoji: '🐷', name: 'Pig' },
    animal_horse: { emoji: '🐴', name: 'Horse' },
    animal_sheep: { emoji: '🐑', name: 'Sheep' },
    animal_rabbit: { emoji: '🐰', name: 'Rabbit' },
    animal_frog: { emoji: '🐸', name: 'Frog' },
    animal_duck: { emoji: '🦆', name: 'Duck' },
    animal_fish: { emoji: '🐟', name: 'Fish' },

    // Legacy pool (kept for older sessions)
    animal_lion: { emoji: '🦁', name: 'Lion' },
    animal_rhino: { emoji: '🦏', name: 'Rhino' },
    animal_camel: { emoji: '🐪', name: 'Camel' },
    animal_snake: { emoji: '🐍', name: 'Snake' },
    animal_elephant: { emoji: '🐘', name: 'Elephant' },
    animal_crocodile: { emoji: '🐊', name: 'Crocodile' },
    animal_giraffe: { emoji: '🦒', name: 'Giraffe' },
    animal_zebra: { emoji: '🦓', name: 'Zebra' },
    animal_hippo: { emoji: '🦛', name: 'Hippo' },
    animal_monkey: { emoji: '🐒', name: 'Monkey' },
    animal_tiger: { emoji: '🐯', name: 'Tiger' },
    animal_bear: { emoji: '🐻', name: 'Bear' },
  };

  const TASK_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  const MEMORY_WORDS = ['FACE', 'VELVET', 'CHURCH', 'DAISY', 'RED'];

  const formatDateTime = (value: any) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  };

  const summarizeArtifacts = (artifacts: any) => {
    const files = artifacts?.files;
    if (!Array.isArray(files) || files.length === 0) return '—';
    const paths = files
      .map((f: any) => String(f?.path ?? ''))
      .filter(Boolean);
    if (paths.length === 0) return `${files.length} file(s)`;
    return paths.join('\n');
  };

  const getPngPreviewUrls = (artifacts: any) => {
    const files = artifacts?.files;
    if (!Array.isArray(files)) return [] as string[];

    const urls: string[] = [];
    for (const f of files) {
      if (String(f?.kind ?? '') !== 'png') continue;
      const p = String(f?.path ?? '');
      const parts = p.split('/').filter(Boolean);
      const storageIdx = parts.indexOf('storage');
      if (storageIdx >= 0 && parts.length >= storageIdx + 3) {
        const sessionId = parts[storageIdx + 1];
        const fileName = parts[parts.length - 1];
        urls.push(`/api/research/artifacts/${encodeURIComponent(sessionId)}/${encodeURIComponent(fileName)}`);
      }
    }
    return urls;
  };

  const getAudioPreviewUrls = (artifacts: any) => {
    const files = artifacts?.files;
    if (!Array.isArray(files)) return [] as string[];

    const urls: string[] = [];
    for (const f of files) {
      const kind = String(f?.kind ?? '');
      const mime = String(f?.mime ?? '');
      if (kind !== 'audio' && !mime.toLowerCase().startsWith('audio/')) continue;

      const p = String(f?.path ?? '');
      const parts = p.split('/').filter(Boolean);
      const storageIdx = parts.indexOf('storage');
      if (storageIdx >= 0 && parts.length >= storageIdx + 3) {
        const sessionId = parts[storageIdx + 1];
        const fileName = parts[parts.length - 1];
        urls.push(`/api/research/artifacts/${encodeURIComponent(sessionId)}/${encodeURIComponent(fileName)}`);
      }
    }
    return urls;
  };

  const clampList = (items: any[], max = 12) => {
    if (!Array.isArray(items)) return { shown: [], remaining: 0 };
    const shown = items.slice(0, max);
    return { shown, remaining: Math.max(0, items.length - shown.length) };
  };

  const summarizeTaskAnswerLines = (taskNumber: number, raw: any) => {
    switch (taskNumber) {
      case 1: {
        const trail = raw?.trail;
        const path = Array.isArray(trail?.userPath) ? trail.userPath : null;
        return [
          `completed: ${trail?.completed ? 'yes' : 'no'}`,
          `errors: ${Array.isArray(trail?.errors) ? trail.errors.length : 0}`,
          `path: ${path ? path.join('→') : '—'}`,
        ];
      }
      case 2: {
        const strokes = raw?.drawing?.strokes;
        return [`strokes: ${Array.isArray(strokes) ? strokes.length : 0}`];
      }
      case 3: {
        const strokes = raw?.clock?.strokes;
        const targetTime = raw?.clock?.targetTime;
        return [`target: ${targetTime || '—'}`, `strokes: ${Array.isArray(strokes) ? strokes.length : 0}`];
      }
      case 4: {
        const naming = raw?.naming;
        if (!Array.isArray(naming) || naming.length === 0) return ['—'];
        return naming.map((it: any) => {
          const pid = String(it?.promptId ?? '');
          const label = pid && NAMING_PROMPTS[pid] ? `${NAMING_PROMPTS[pid].emoji} ${NAMING_PROMPTS[pid].name}` : (pid || 'animal');
          return `#${it?.item} (${label}): ${String(it?.answer ?? '')}`;
        });
      }
      case 5: {
        const mem = raw?.memoryImmediate;
        return [
          `wordListId: ${mem?.wordListId || '—'}`,
          `trial1: ${Array.isArray(mem?.trial1) ? mem.trial1.join(' ') : '—'}`,
          `trial2: ${Array.isArray(mem?.trial2) ? mem.trial2.join(' ') : '—'}`,
        ];
      }
      case 6: {
        const att = raw?.attention;
        const vig = att?.vigilance;
        const taps = Array.isArray(vig?.taps) ? vig.taps : [];
        const aRtsAll = taps
          .filter((t: any) => t?.letter === 'A' && typeof t?.rtMs === 'number')
          .map((t: any) => t.rtMs);
        const { shown: aRts, remaining } = clampList(aRtsAll, 10);
        const rtText = aRts.length ? aRts.join(',') + (remaining ? ` (+${remaining})` : '') : '—';
        return [
          `digitF: ${Array.isArray(att?.digitForward?.answer) ? att.digitForward.answer.join(' ') : '—'}`,
          `digitB: ${Array.isArray(att?.digitBackward?.answer) ? att.digitBackward.answer.join(' ') : '—'}`,
          `vigilance taps: ${taps.length}, A rtMs: ${rtText}`,
          `serial7: ${Array.isArray(att?.serial7?.answers) ? att.serial7.answers.join(',') : '—'}`,
        ];
      }
      case 7: {
        const reps = raw?.sentenceRepetition;
        if (!Array.isArray(reps) || reps.length === 0) return ['sentence1: —', 'sentence2: —'];
        const a = reps.find((x: any) => x?.item === 1);
        const b = reps.find((x: any) => x?.item === 2);
        return [
          `sentence1 recorded: ${a?.audio?.recorded ? 'yes' : 'no'}`,
          `sentence1 transcript: ${String(a?.transcript?.text ?? '—')}`,
          `sentence2 recorded: ${b?.audio?.recorded ? 'yes' : 'no'}`,
          `sentence2 transcript: ${String(b?.transcript?.text ?? '—')}`,
        ];
      }
      case 8: {
        const flu = raw?.fluency;
        const words = Array.isArray(flu?.words) ? flu.words : [];
        const list = words
          .map((w: any) => String(w?.w ?? ''))
          .filter(Boolean);
        const { shown, remaining } = clampList(list, 20);
        return [
          `letter: ${flu?.letter || '—'}`,
          `uniqueCount: ${flu?.uniqueCount ?? '—'}`,
          `words: ${shown.join(',') || '—'}${remaining ? ` (+${remaining})` : ''}`,
        ];
      }
      case 9: {
        const abs = raw?.abstraction;
        if (!Array.isArray(abs) || abs.length === 0) return ['—'];
        return abs.map((it: any) => `${String(it?.pair ?? '')}: ${String(it?.answer ?? '')}`);
      }
      case 10: {
        const dr = raw?.delayedRecall;
        return [`freeRecall: ${Array.isArray(dr?.freeRecall) ? dr.freeRecall.join(' ') : '—'}`];
      }
      case 11: {
        const o = raw?.orientation;
        return [
          `year: ${o?.year || '—'}`, 
          `month: ${o?.month || '—'}`, 
          `date: ${o?.date || '—'}`, 
          `day: ${o?.dayOfWeek || '—'}`, 
          `place: ${o?.place || '—'}`, 
          `city: ${o?.city || '—'}`,
        ];
      }
      default:
        return ['—'];
    }
  };

  const getTaskPromptLines = (taskNumber: number, raw: any) => {
    switch (taskNumber) {
      case 1: {
        const seq = Array.isArray(raw?.trail?.sequence) ? raw.trail.sequence : null;
        return [
          'Alternating trail: connect items in order.',
          `Sequence: ${seq ? seq.join('→') : '—'}`,
        ];
      }
      case 2:
        return [
          'Copy drawing: copy the chair drawing shown (saved as PNG artifact).',
          `Chair prompt: ${raw?.drawing?.prompt?.chairId || '—'}`,
        ];
      case 3: {
        const target = raw?.clock?.targetTime || '—';
        return [`Clock drawing: draw a clock set to ${target} (saved as PNG artifact).`];
      }
      case 4:
        return (() => {
          const naming = raw?.naming;
          const lines: string[] = ['Animal naming: name the animals shown.'];
          if (!Array.isArray(naming) || naming.length === 0) return [...lines, 'Selected: —'];
          const selected = naming.slice(0, 3).map((it: any, idx: number) => {
            const pid = String(it?.promptId ?? '');
            const p = NAMING_PROMPTS[pid];
            const label = p ? `${p.emoji} ${p.name}` : (pid || 'Unknown');
            return `${idx + 1}) ${label}`;
          });
          return [...lines, ...selected];
        })();
      case 5:
        return [`Immediate memory: memorize the word list: ${MEMORY_WORDS.join(' / ')}, then recall twice.`];
      case 6: {
        const df = Array.isArray(raw?.attention?.digitForward?.prompt) ? raw.attention.digitForward.prompt : null;
        const db = Array.isArray(raw?.attention?.digitBackward?.prompt) ? raw.attention.digitBackward.prompt : null;
        const vig = Array.isArray(raw?.attention?.vigilance?.sequence) ? raw.attention.vigilance.sequence : null;
        const serialStart = raw?.attention?.serial7?.start ?? 100;
        return [
          'Attention: digits forward/backward + tap on A + serial 7 subtraction.',
          `Digits forward prompt: ${df ? df.join(' ') : '—'}`,
          `Digits backward prompt: ${db ? db.join(' ') : '—'}`,
          `Vigilance sequence: ${vig ? vig.join(' ') : '—'}`,
          `Serial 7 start: ${serialStart}`,
        ];
      }
      case 7:
        return [
          'Sentence repetition: record the participant repeating each sentence.',
          'Sentence 1: I only know that John is the one to help today.',
          'Sentence 2: The cat always hid under the couch when dogs were in the room.',
        ];
      case 8:
        return [
          'Verbal fluency: produce as many words as possible starting with the given letter within the time limit.',
          `Letter: ${raw?.fluency?.letter || '—'} · Duration: ${raw?.fluency?.durationSec ?? '—'} sec`,
        ];
      case 9:
        return [
          'Abstraction: state how two items are alike.',
          `Pairs: ${Array.isArray(raw?.abstraction) ? raw.abstraction.map((x: any) => String(x?.pair ?? '')).filter(Boolean).join(' · ') : '—'}`,
        ];
      case 10:
        return [`Delayed recall: recall the word list: ${MEMORY_WORDS.join(' / ')} (may include cues).`];
      case 11:
        return ['Orientation: date, day of week, place/city, etc.'];
      default:
        return ['—'];
    }
  };

  const getTaskPromptImageUrl = (taskNumber: number, raw: any) => {
    if (taskNumber !== 2) return null as string | null;
    const p = String(raw?.drawing?.prompt?.chairPath ?? '');
    if (!p.startsWith('/chairs/')) return null;
    return p;
  };

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/research/me');
        if (res.ok) {
          setIsAuthed(true);
        }
      } finally {
        setAuthChecked(true);
      }
    };
    check();
  }, []);

  const loadParticipants = async () => {
    const res = await fetch('/api/research/participants');
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error || `Failed to load participants (HTTP ${res.status})`);
    }
    const data = (await res.json()) as any;
    setParticipants((data?.participants ?? []) as ParticipantListItem[]);
  };

  useEffect(() => {
    if (!isAuthed) return;
    loadParticipants().catch((e) => setError(e instanceof Error ? e.message : String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed]);

  const onLogin = async () => {
    setError('');
    const res = await fetch('/api/research/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error || `Login failed (HTTP ${res.status})`);
    }

    setIsAuthed(true);
  };

  const onLogout = async () => {
    await fetch('/api/research/logout', { method: 'POST' });
    setIsAuthed(false);
    setParticipants([]);
    setSelectedParticipantId(null);
    setParticipantDetail(null);
  };

  const deleteParticipant = async (participantId: string) => {
    setError('');
    const participant = participants.find((p) => p.id === participantId);
    const label = participantDetail
      ? `${participantDetail.code}`
      : participant?.code ?? 'this participant';

    const ok = window.confirm(
      `Delete participant ${label}?\n\nThis will permanently delete the participant and all related sessions/responses from the database.`
    );
    if (!ok) return;

    const res = await fetch(`/api/research/participants/${participantId}`, {
      method: 'DELETE',
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error || `Failed to delete participant (HTTP ${res.status})`);
    }

    if (Array.isArray(data?.warnings) && data.warnings.length > 0) {
      setError(`Deleted participant, but some files could not be removed:\n${data.warnings.join('\n')}`);
    }

    setParticipants((prev) => prev.filter((p) => p.id !== participantId));
    setSelectedParticipantId(null);
    setParticipantDetail(null);
  };

  const selectParticipant = async (participantId: string) => {
    setError('');
    setSelectedParticipantId(participantId);
    setParticipantDetail(null);

    const res = await fetch(`/api/research/participants/${participantId}`);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error || `Failed to load participant (HTTP ${res.status})`);
    }
    setParticipantDetail(data?.participant ?? null);
    setViewerSessionId(null);
    setViewerTaskNumber(null);
  };

  const openViewer = (sessionId: string, taskNumber: number) => {
    setViewerSessionId(sessionId);
    setViewerTaskNumber(taskNumber);

    const s = (participantDetail?.sessions ?? []).find((x: any) => x.id === sessionId);
    const r = (s?.responses ?? []).find((x: any) => Number(x.taskNumber) === taskNumber);

    setScoreHuman(r?.humanScore !== null && r?.humanScore !== undefined ? String(r.humanScore) : '');
    setScoreNeedsReview(Boolean(r?.needsReview));
  };

  const saveScore = async (sessionId: string, taskNumber: number) => {
    setScoreSaving(true);
    try {
      const humanScore = scoreHuman.trim() === '' ? null : Number(scoreHuman);
      if (humanScore !== null && (!Number.isFinite(humanScore) || !Number.isInteger(humanScore))) {
        throw new Error('humanScore must be an integer');
      }

      const res = await fetch(`/api/research/sessions/${sessionId}/responses/${taskNumber}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ humanScore, needsReview: scoreNeedsReview }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `Failed to save score (HTTP ${res.status})`);
      }

      const updated = data?.response;
      setParticipantDetail((prev: any) => {
        if (!prev) return prev;
        const next = { ...prev };
        next.sessions = (prev.sessions ?? []).map((s: any) => {
          if (s.id !== sessionId) return s;
          const ns = { ...s };
          ns.responses = (s.responses ?? []).map((r: any) => {
            if (Number(r.taskNumber) !== taskNumber) return r;
            return { ...r, ...updated };
          });
          return ns;
        });
        return next;
      });
    } finally {
      setScoreSaving(false);
    }
  };

  const selectedLabel = useMemo(() => {
    if (!selectedParticipantId) return '';
    const item = participants.find((p) => p.id === selectedParticipantId);
    return item ? `${item.code}` : 'selected participant';
  }, [participants, selectedParticipantId]);

  if (!authChecked) {
    return <div className="min-h-screen p-6">Loading...</div>;
  }

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-md mx-auto border border-gray-200 rounded p-6">
          <h1 className="text-2xl font-bold mb-4">Research Login</h1>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <button
              type="button"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded"
              onClick={() => onLogin().catch((e) => setError(e instanceof Error ? e.message : String(e)))}
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-screen-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Research Portal</h1>
          <button
            type="button"
            onClick={() => onLogout().catch(() => {})}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            Logout
          </button>
        </div>

        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

        <div className="flex flex-col md:flex-row gap-6">
          <div className="border border-gray-200 rounded p-4 md:w-80 md:flex-none">
            <div className="font-semibold mb-3">Participants</div>
            <div className="space-y-2 max-h-[70vh] overflow-auto">
              {participants.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectParticipant(p.id).catch((e) => setError(e instanceof Error ? e.message : String(e)))}
                  className={`w-full text-left px-3 py-2 rounded border ${
                    selectedParticipantId === p.id ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="text-sm font-mono">{p.code}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="border border-gray-200 rounded p-4 flex-1 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">Detail</div>
              {selectedParticipantId && (
                <button
                  type="button"
                  className="px-3 py-2 rounded bg-red-600 text-white text-sm"
                  onClick={() => deleteParticipant(selectedParticipantId).catch((e) => setError(e instanceof Error ? e.message : String(e)))}
                >
                  Delete
                </button>
              )}
            </div>
            {!selectedParticipantId && (
              <div className="text-sm text-gray-600">Select a participant code to view responses.</div>
            )}
            {selectedParticipantId && !participantDetail && (
              <div className="text-sm text-gray-600">Loading {selectedLabel}…</div>
            )}
            {participantDetail && (
              <div className="space-y-6 overflow-auto max-h-[70vh]">
                <div className="border border-gray-200 rounded p-3">
                  <div className="text-sm">
                    <div><span className="font-medium">Code:</span> <span className="font-mono">{participantDetail.code}</span></div>
                    <div><span className="font-medium">Created:</span> {formatDateTime(participantDetail.createdAt)}</div>
                  </div>
                </div>

                {(participantDetail.sessions ?? []).map((s: any) => (
                  <div key={s.id} className="border border-gray-200 rounded p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">Session <span className="font-mono">{s.id}</span></div>
                      <div className="text-xs text-gray-600">status: <span className="font-mono">{s.status}</span></div>
                    </div>

                    <div className="mt-2 text-xs text-gray-700 space-y-1">
                      <div>startedAt: {formatDateTime(s.startedAt)} · submittedAt: {formatDateTime(s.submittedAt)}</div>
                      <div>consentedAt: {formatDateTime(s.consentedAt)} · educationYears: {s.educationYears ?? '—'}</div>
                      <div>currentTask: {s.currentTask ?? '—'} · memoryWordListId: <span className="font-mono">{s.memoryWordListId ?? '—'}</span></div>
                    </div>

                    <div className="mt-4 overflow-auto">
                      <table className="min-w-full border border-gray-200 text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-2 border-b border-gray-200">Task</th>
                            <th className="text-left p-2 border-b border-gray-200">Title</th>
                            <th className="text-left p-2 border-b border-gray-200">Answer</th>
                            <th className="text-left p-2 border-b border-gray-200">autoScore</th>
                            <th className="text-left p-2 border-b border-gray-200">humanScore</th>
                            <th className="text-left p-2 border-b border-gray-200">needsReview</th>
                            <th className="text-left p-2 border-b border-gray-200">artifacts</th>
                            <th className="text-left p-2 border-b border-gray-200">View/Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const responses = Array.isArray(s.responses) ? s.responses : [];
                            const byTask = new Map<number, any>();
                            for (const r of responses) byTask.set(Number(r.taskNumber), r);
                            return TASK_NUMBERS.map((n) => {
                              const r = byTask.get(n) ?? null;
                              const answerLines = r ? summarizeTaskAnswerLines(n, r.raw) : ['—'];
                              return (
                                <tr key={n} className="align-top">
                                  <td className="p-2 border-b border-gray-100 font-mono">{n}</td>
                                  <td className="p-2 border-b border-gray-100">{TASK_TITLES[n] ?? '—'}</td>
                                  <td className="p-2 border-b border-gray-100">
                                    <div className="whitespace-pre-wrap font-mono text-[11px] leading-4 text-gray-800">
                                      {answerLines.join('\n')}
                                    </div>
                                  </td>
                                  <td className="p-2 border-b border-gray-100 font-mono">{r?.autoScore ?? '—'}</td>
                                  <td className="p-2 border-b border-gray-100 font-mono">{r?.humanScore ?? '—'}</td>
                                  <td className="p-2 border-b border-gray-100 font-mono">{r ? (r.needsReview ? 'yes' : 'no') : '—'}</td>
                                  <td className="p-2 border-b border-gray-100">
                                    <div className="whitespace-pre-wrap font-mono text-[11px] leading-4 text-gray-700">
                                      {r ? summarizeArtifacts(r.artifacts) : '—'}
                                    </div>
                                  </td>
                                  <td className="p-2 border-b border-gray-100">
                                    <button
                                      type="button"
                                      className="px-2 py-1 rounded bg-blue-600 text-white"
                                      onClick={() => openViewer(s.id, n)}
                                    >
                                      View/Score
                                    </button>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>

                      {(!Array.isArray(s.responses) || s.responses.length === 0) && (
                        <div className="mt-2 text-sm text-gray-600">No task responses saved for this session.</div>
                      )}
                    </div>

                    {viewerSessionId === s.id && viewerTaskNumber !== null && (
                      <div className="mt-4 border border-gray-200 rounded p-3 bg-white">
                        {(() => {
                          const r = (s.responses ?? []).find((x: any) => Number(x.taskNumber) === viewerTaskNumber) ?? null;
                          const promptLines = getTaskPromptLines(viewerTaskNumber, r?.raw);
                          const promptImageUrl = getTaskPromptImageUrl(viewerTaskNumber, r?.raw);
                          const answerLines = r ? summarizeTaskAnswerLines(viewerTaskNumber, r.raw) : ['—'];
                          const pngUrls = r ? getPngPreviewUrls(r.artifacts) : [];
                          const audioUrls = r ? getAudioPreviewUrls(r.artifacts) : [];

                          return (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="font-semibold">
                                  View/Score: Task {viewerTaskNumber} {TASK_TITLES[viewerTaskNumber] ?? ''}
                                </div>
                                <button
                                  type="button"
                                  className="px-3 py-1 rounded bg-gray-200"
                                  onClick={() => {
                                    setViewerSessionId(null);
                                    setViewerTaskNumber(null);
                                  }}
                                >
                                  Close
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="border border-gray-100 rounded p-3 bg-gray-50">
                                  <div className="text-sm font-medium mb-2">Prompt</div>
                                  <div className="whitespace-pre-wrap text-sm text-gray-800">{promptLines.join('\n')}</div>
                                  {promptImageUrl && (
                                    <div className="mt-3 border border-gray-200 rounded bg-white p-2">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={promptImageUrl} alt="prompt" className="w-full h-auto" />
                                    </div>
                                  )}
                                </div>
                                <div className="border border-gray-100 rounded p-3 bg-gray-50">
                                  <div className="text-sm font-medium mb-2">Answer</div>
                                  <div className="whitespace-pre-wrap font-mono text-[12px] leading-5 text-gray-800">{answerLines.join('\n')}</div>
                                </div>

                                <div className="border border-gray-100 rounded p-3 bg-gray-50">
                                  <div className="text-sm font-medium mb-2">Scoring</div>
                                  <div className="flex flex-wrap items-end gap-3">
                                    <div>
                                      <label className="block text-xs text-gray-700 mb-1">humanScore</label>
                                      <input
                                        className="px-2 py-1 border border-gray-300 rounded w-28 font-mono"
                                        value={scoreHuman}
                                        onChange={(e) => setScoreHuman(e.target.value)}
                                        placeholder="(empty)"
                                        inputMode="numeric"
                                      />
                                    </div>
                                    <label className="flex items-center gap-2 text-sm text-gray-800">
                                      <input
                                        type="checkbox"
                                        checked={scoreNeedsReview}
                                        onChange={(e) => setScoreNeedsReview(e.target.checked)}
                                      />
                                      needsReview
                                    </label>
                                    <button
                                      type="button"
                                      className="px-3 py-2 rounded bg-green-600 text-white disabled:opacity-50"
                                      disabled={scoreSaving || !r}
                                      onClick={() => saveScore(s.id, viewerTaskNumber).catch((e) => setError(e instanceof Error ? e.message : String(e)))}
                                    >
                                      {scoreSaving ? 'Saving…' : 'Save'}
                                    </button>
                                    {!r && <div className="text-sm text-gray-600">No response to score.</div>}
                                  </div>
                                </div>
                              </div>

                              {pngUrls.length > 0 && (
                                <div className="border border-gray-100 rounded p-3 bg-gray-50">
                                  <div className="text-sm font-medium mb-2">Image Preview</div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {pngUrls.map((u) => (
                                      <div key={u} className="border border-gray-200 rounded bg-white p-2">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={u} alt="artifact" className="w-full h-auto" />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {audioUrls.length > 0 && (
                                <div className="border border-gray-100 rounded p-3 bg-gray-50">
                                  <div className="text-sm font-medium mb-2">Audio</div>
                                  <div className="space-y-3">
                                    {audioUrls.map((u) => (
                                      <div key={u} className="border border-gray-200 rounded bg-white p-2">
                                        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                                        <audio controls src={u} className="w-full" />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ))}

                {(participantDetail.sessions ?? []).length === 0 && (
                  <div className="text-sm text-gray-600">No sessions for this participant.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
