'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTaskShell } from '@/components/common/TaskShell';
import { Task7Raw } from '@/lib/types';

type TranscriptMeta = {
  text: string;
  confidence?: number;
  engine: 'webspeech' | 'other';
  updatedAt: string;
};

type RecordingState = { recorded: boolean; file?: any; transcript?: TranscriptMeta };

function normalizeTranscript(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

export function Task7SentenceRepetition() {
  const { raw, setRaw, addEvent, sessionId, taskNumber, artifacts, setArtifacts, setBeforeNext } = useTaskShell();

  const prompts = [
    'I only know that John is the one to help today.',
    'The cat always hid under the couch when dogs were in the room.',
  ];

  const supported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return Boolean((navigator as any)?.mediaDevices?.getUserMedia) && typeof (window as any).MediaRecorder !== 'undefined';
  }, []);

  const speechSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return typeof ctor !== 'undefined';
  }, []);

  const [error, setError] = useState<string>('');
  const [activeItem, setActiveItem] = useState<1 | 2 | null>(null);
  const [uploadingItem, setUploadingItem] = useState<1 | 2 | null>(null);

  const [rec1, setRec1] = useState<RecordingState>(() => ({ recorded: false }));
  const [rec2, setRec2] = useState<RecordingState>(() => ({ recorded: false }));

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef<number>(0);
  const mountedRef = useRef(true);
  const activeItemRef = useRef<1 | 2 | null>(null);
  const uploadingItemRef = useRef<1 | 2 | null>(null);
  const pendingUploadsRef = useRef<Promise<void>[]>([]);
  const recognitionRef = useRef<any>(null);
  const recognitionItemRef = useRef<1 | 2 | null>(null);
  const rec1Ref = useRef<RecordingState>({ recorded: false });
  const rec2Ref = useRef<RecordingState>({ recorded: false });

  useEffect(() => {
    activeItemRef.current = activeItem;
  }, [activeItem]);

  useEffect(() => {
    uploadingItemRef.current = uploadingItem;
  }, [uploadingItem]);

  useEffect(() => {
    rec1Ref.current = rec1;
  }, [rec1]);

  useEffect(() => {
    rec2Ref.current = rec2;
  }, [rec2]);

  const stopStream = () => {
    try {
      streamRef.current?.getTracks()?.forEach((t) => t.stop());
    } catch {
      // ignore
    }
    streamRef.current = null;
  };

  const syncRaw = (next1: RecordingState = rec1Ref.current, next2: RecordingState = rec2Ref.current) => {
    const nextRaw: Task7Raw = {
      sentenceRepetition: [
        {
          item: 1,
          audio: next1.recorded
            ? {
                recorded: true,
                ...(next1.file ? { file: next1.file } : {}),
              }
            : { recorded: false },
          ...(next1.transcript ? { transcript: next1.transcript } : {}),
        },
        {
          item: 2,
          audio: next2.recorded
            ? {
                recorded: true,
                ...(next2.file ? { file: next2.file } : {}),
              }
            : { recorded: false },
          ...(next2.transcript ? { transcript: next2.transcript } : {}),
        },
      ],
    };
    setRaw(nextRaw);
  };

  const applyRecordingState = (item: 1 | 2, next: RecordingState) => {
    if (item === 1) {
      rec1Ref.current = next;
      setRec1(next);
      syncRaw(next, rec2Ref.current);
      return;
    }

    rec2Ref.current = next;
    setRec2(next);
    syncRaw(rec1Ref.current, next);
  };

  const updateTranscriptText = (item: 1 | 2, text: string) => {
    const normalized = normalizeTranscript(text);
    const base = item === 1 ? rec1Ref.current : rec2Ref.current;

    if (!normalized) {
      const { transcript: _ignored, ...rest } = base;
      applyRecordingState(item, rest);
      return;
    }

    const transcriptMeta: TranscriptMeta = {
      text: normalized,
      confidence: base.transcript?.confidence,
      engine: base.transcript?.engine ?? 'webspeech',
      updatedAt: new Date().toISOString(),
    };

    applyRecordingState(item, { ...base, transcript: transcriptMeta });
  };

  const stopSpeechRecognition = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    try {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
    } catch {
      // ignore
    }
    recognitionRef.current = null;
    recognitionItemRef.current = null;
  };

  const startSpeechRecognition = (item: 1 | 2) => {
    if (!speechSupported) return;

    stopSpeechRecognition();

    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let transcript = '';
      let confidence: number | undefined = undefined;

      for (let i = 0; i < event.results.length; i++) {
        const alt = event.results[i]?.[0];
        if (!alt?.transcript) continue;
        transcript += ` ${alt.transcript}`;
        if (event.results[i].isFinal && typeof alt.confidence === 'number') {
          confidence = alt.confidence;
        }
      }

      const text = normalizeTranscript(transcript);
      if (!text) return;

      const transcriptMeta: TranscriptMeta = {
        text,
        confidence,
        engine: 'webspeech',
        updatedAt: new Date().toISOString(),
      };

      const base = item === 1 ? rec1Ref.current : rec2Ref.current;
      applyRecordingState(item, { ...base, transcript: transcriptMeta });
    };

    recognition.onerror = () => {
      // Keep recording running even if speech recognition fails on some browsers.
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      recognitionItemRef.current = null;
    };

    recognitionRef.current = recognition;
    recognitionItemRef.current = item;
    recognition.start();
  };

  const uploadRecording = async (item: 1 | 2, blob: Blob) => {
    setUploadingItem(item);
    try {
      const label = item === 1 ? 'sentence1' : 'sentence2';
      const form = new FormData();
      form.set('taskNumber', String(taskNumber));
      form.set('label', label);
      const file = new File([blob], `${label}.webm`, { type: blob.type || 'audio/webm' });
      form.set('file', file);

      const res = await fetch(`/api/sessions/${sessionId}/artifact`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `Failed to upload recording (HTTP ${res.status})`);
      }

      const uploadedFile = {
        ...data.file,
        kind: 'audio',
        meta: { item },
      };

      const nextArtifacts = {
        files: [
          ...((artifacts?.files ?? []).filter((f: any) => {
            if (f?.kind !== 'audio') return true;
            return f?.meta?.item !== item;
          }) as any[]),
          uploadedFile,
        ],
      };
      setArtifacts(nextArtifacts as any);

      if (item === 1) {
        const next1 = { ...rec1Ref.current, recorded: true, file: uploadedFile };
        if (mountedRef.current) applyRecordingState(1, next1);
      } else {
        const next2 = { ...rec2Ref.current, recorded: true, file: uploadedFile };
        if (mountedRef.current) applyRecordingState(2, next2);
      }
    } finally {
      if (mountedRef.current) setUploadingItem(null);
    }
  };

  const startRecording = async (item: 1 | 2) => {
    setError('');
    if (!supported) {
      setError('Audio recording is not supported in this browser.');
      return;
    }
    if (uploadingItem) return;
    if (activeItem) return;

    addEvent({ type: 'audio_start', meta: { item } });
    setActiveItem(item);
    startSpeechRecognition(item);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    chunksRef.current = [];
    startedAtRef.current = Date.now();

    const mimeCandidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
    ];
    const MediaRecorderCtor = (window as any).MediaRecorder as typeof MediaRecorder;
    const chosen = mimeCandidates.find((m) => {
      try {
        return (MediaRecorderCtor as any).isTypeSupported?.(m);
      } catch {
        return false;
      }
    });

    const recorder = chosen ? new MediaRecorder(stream, { mimeType: chosen }) : new MediaRecorder(stream);
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onerror = () => {
      setError('Recording failed. Please try again.');
      setActiveItem(null);
      stopStream();
      recorderRef.current = null;
    };

    recorder.onstop = async () => {
      const elapsedMs = Math.max(0, Date.now() - startedAtRef.current);
      addEvent({ type: 'audio_stop', meta: { item, elapsedMs } });
      stopSpeechRecognition();

      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      recorderRef.current = null;
      stopStream();

      if (blob.size === 0) {
        if (mountedRef.current) setError('No audio captured. Please try again.');
        return;
      }

      let uploadPromise: Promise<void> | null = null;
      try {
        uploadPromise = uploadRecording(item, blob);
        pendingUploadsRef.current.push(uploadPromise);
        await uploadPromise;
      } catch (e) {
        if (mountedRef.current) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (uploadPromise) {
          pendingUploadsRef.current = pendingUploadsRef.current.filter((x) => x !== uploadPromise);
        }
      }
    };

    recorder.start();
  };

  const stopRecording = async () => {
    const r = recorderRef.current;
    if (!r) return;
    try {
      stopSpeechRecognition();
      r.stop();
    } finally {
      setActiveItem(null);
    }
  };

  useEffect(() => {
    if (Array.isArray(raw?.sentenceRepetition)) {
      const a = raw.sentenceRepetition?.find((x: any) => x?.item === 1);
      const b = raw.sentenceRepetition?.find((x: any) => x?.item === 2);
      const next1: RecordingState = {
        recorded: Boolean(a?.audio?.recorded),
        file: a?.audio?.file,
        transcript: a?.transcript,
      };
      const next2: RecordingState = {
        recorded: Boolean(b?.audio?.recorded),
        file: b?.audio?.file,
        transcript: b?.transcript,
      };
      rec1Ref.current = next1;
      rec2Ref.current = next2;
      setRec1(next1);
      setRec2(next2);
    }
  }, [raw]);

  useEffect(() => {
    if (!raw?.sentenceRepetition) {
      syncRaw(rec1, rec2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      stopSpeechRecognition();
      try {
        recorderRef.current?.stop();
      } catch {
        // ignore
      }
      recorderRef.current = null;
      stopStream();
    };
  }, []);

  useEffect(() => {
    setBeforeNext(async () => {
      // If recording is active, stop it first.
      try {
        if (recorderRef.current) {
          stopSpeechRecognition();
          recorderRef.current.stop();
        }
      } catch {
        // ignore
      }

      // Wait for any in-flight uploads to finish.
      const deadline = Date.now() + 30_000;
      while (Date.now() < deadline) {
        if (activeItemRef.current === null && uploadingItemRef.current === null) {
          const pending = pendingUploadsRef.current;
          if (!pending.length) break;
          await Promise.allSettled(pending);
          pendingUploadsRef.current = [];
          break;
        }
        await new Promise((r) => setTimeout(r, 150));
      }
    });

    return () => {
      setBeforeNext(null);
    };
  }, [setBeforeNext]);

  return (
    <div className="space-y-6">
      <p className="text-gray-700">Read each sentence and repeat it. Record your voice for each sentence.</p>

      {speechSupported && (
        <div className="text-xs text-gray-600 border border-gray-200 rounded p-3 bg-gray-50">
          Speech-to-text is enabled for this task and will be used for automatic sentence-comparison scoring.
        </div>
      )}

      {error && <div className="text-sm text-red-600">{error}</div>}

      {!supported && (
        <div className="text-sm text-gray-700 border border-gray-200 rounded p-3 bg-gray-50">
          Audio recording is not available in this browser/environment.
        </div>
      )}

      <section className="p-4 border border-gray-200 rounded">
        <div className="text-sm text-gray-600 mb-2">Sentence 1</div>
        <div className="p-3 bg-gray-50 border border-gray-200 rounded mb-3">{prompts[0]}</div>
        <div className="flex items-center gap-3">
          {activeItem === 1 ? (
            <button
              type="button"
              className="px-4 py-2 rounded bg-red-600 text-white"
              onClick={() => stopRecording().catch(() => {})}
            >
              Stop Recording
            </button>
          ) : (
            <button
              type="button"
              className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
              disabled={!supported || Boolean(activeItem) || uploadingItem === 1}
              onClick={() => startRecording(1).catch((e) => setError(e instanceof Error ? e.message : String(e)))}
            >
              {uploadingItem === 1 ? 'Uploading…' : rec1.recorded ? 'Record Again' : 'Start Recording'}
            </button>
          )}
          <div className="text-sm text-gray-700">
            {rec1.recorded ? 'Recorded' : 'Not recorded'}
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-xs text-gray-600 mb-1">Transcription (auto-filled)</label>
          <textarea
            className="w-full min-h-[80px] rounded border border-gray-300 p-2 text-sm"
            placeholder="Speech-to-text result will appear here automatically."
            value={rec1.transcript?.text ?? ''}
            onChange={(e) => updateTranscriptText(1, e.target.value)}
          />
        </div>
      </section>

      <section className="p-4 border border-gray-200 rounded">
        <div className="text-sm text-gray-600 mb-2">Sentence 2</div>
        <div className="p-3 bg-gray-50 border border-gray-200 rounded mb-3">{prompts[1]}</div>
        <div className="flex items-center gap-3">
          {activeItem === 2 ? (
            <button
              type="button"
              className="px-4 py-2 rounded bg-red-600 text-white"
              onClick={() => stopRecording().catch(() => {})}
            >
              Stop Recording
            </button>
          ) : (
            <button
              type="button"
              className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
              disabled={!supported || Boolean(activeItem) || uploadingItem === 2}
              onClick={() => startRecording(2).catch((e) => setError(e instanceof Error ? e.message : String(e)))}
            >
              {uploadingItem === 2 ? 'Uploading…' : rec2.recorded ? 'Record Again' : 'Start Recording'}
            </button>
          )}
          <div className="text-sm text-gray-700">
            {rec2.recorded ? 'Recorded' : 'Not recorded'}
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-xs text-gray-600 mb-1">Transcription (auto-filled)</label>
          <textarea
            className="w-full min-h-[80px] rounded border border-gray-300 p-2 text-sm"
            placeholder="Speech-to-text result will appear here automatically."
            value={rec2.transcript?.text ?? ''}
            onChange={(e) => updateTranscriptText(2, e.target.value)}
          />
        </div>
      </section>

      <div className="text-xs text-gray-600">This task is reviewed by a researcher.</div>
    </div>
  );
}
