'use client';

import { Artifacts, SaveTaskRequest, TaskEvent } from '@/lib/types';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ProgressBar, AutosaveIndicator } from './TaskHeader';

interface TaskShellProps {
  sessionId: string;
  taskNumber: number;
  title: string;
  description?: string;
  initialRaw?: any;
  initialEvents?: TaskEvent[];
  initialArtifacts?: Artifacts;
  initialStartedAt?: string;
  defaultNeedsReview?: boolean;
  debugSkipSave?: boolean;
  onTaskComplete?: (data: any) => void;
  onNext?: () => void;
  children: React.ReactNode;
}

interface TaskShellContextValue {
  raw: any;
  setRaw: (raw: any) => void;
  artifacts: Artifacts | undefined;
  setArtifacts: (artifacts: Artifacts | undefined) => void;
  setBeforeNext: (handler: (() => Promise<void>) | null) => void;
  addEvent: (event: Omit<TaskEvent, 't' | 'taskNumber'>) => void;
  events: TaskEvent[];
  taskNumber: number;
  sessionId: string;
  startedAt: string;
}

export const TaskShellContext = React.createContext<TaskShellContextValue | null>(null);

export function TaskShell({
  sessionId,
  taskNumber,
  title,
  description,
  initialRaw,
  initialEvents,
  initialArtifacts,
  initialStartedAt,
  defaultNeedsReview = false,
  debugSkipSave = false,
  onTaskComplete,
  onNext,
  children,
}: TaskShellProps) {
  const [raw, setRawState] = useState<any>(initialRaw ?? null);
  const [events, setEvents] = useState<TaskEvent[]>(initialEvents ?? []);
  const [artifacts, setArtifactsState] = useState<Artifacts | undefined>(initialArtifacts);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [instructionRepeats, setInstructionRepeats] = useState(0);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startedAtRef = useRef<string>(initialStartedAt ?? new Date().toISOString());
  const beforeNextRef = useRef<(() => Promise<void>) | null>(null);

  const rawRef = useRef<any>(initialRaw ?? null);
  const eventsRef = useRef<TaskEvent[]>(initialEvents ?? []);
  const artifactsRef = useRef<Artifacts | undefined>(initialArtifacts);

  useEffect(() => {
    setRawState(initialRaw ?? null);
    setEvents(initialEvents ?? []);
    setArtifactsState(initialArtifacts);
    rawRef.current = initialRaw ?? null;
    eventsRef.current = initialEvents ?? [];
    artifactsRef.current = initialArtifacts;
    if (initialStartedAt) {
      startedAtRef.current = initialStartedAt;
    }
  }, [initialRaw, initialEvents, initialArtifacts, initialStartedAt]);

  // Persist current task state to localStorage.
  const persistToLocalStorage = useCallback((autoScore?: number) => {
    if (typeof window === 'undefined') return;
    try {
      const key = `moca_session_${sessionId}`;
      const stored = JSON.parse(localStorage.getItem(key) ?? '{}');
      const responses = stored.responses ?? {};
      responses[taskNumber] = {
        ...(responses[taskNumber] ?? {}),
        taskNumber,
        raw: rawRef.current,
        events: eventsRef.current,
        artifacts: artifactsRef.current,
        startedAt: startedAtRef.current,
        ...(autoScore !== undefined ? { autoScore } : {}),
      };
      // Track memory word list ID for Task 10.
      if (taskNumber === 5 && rawRef.current?.memoryImmediate?.wordListId) {
        stored.memoryWordListId = rawRef.current.memoryImmediate.wordListId;
      }
      localStorage.setItem(key, JSON.stringify({ ...stored, responses }));
    } catch {
      // Ignore quota/storage errors.
    }
  }, [sessionId, taskNumber]);

  // Auto-save every 8 seconds
  const autoSave = useCallback(async () => {
    if (!rawRef.current && eventsRef.current.length === 0) return;

    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/sessions/${sessionId}/save`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskNumber,
            startedAt: startedAtRef.current,
            raw: rawRef.current,
            events: eventsRef.current,
            artifacts: artifactsRef.current,
            needsReview: defaultNeedsReview,
            currentTask: taskNumber,
          } as SaveTaskRequest),
        }
      );

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        setLastSaved(new Date());
        persistToLocalStorage(data.autoScore);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [sessionId, taskNumber, defaultNeedsReview]);

  // Set up auto-save interval
  useEffect(() => {
    saveTimerRef.current = setInterval(autoSave, 8000);
    return () => {
      if (saveTimerRef.current) {
        clearInterval(saveTimerRef.current);
      }
    };
  }, [autoSave]);

  const handleNext = useCallback(async () => {
    const confirmMessage =
      taskNumber === 11
        ? 'You are about to submit your answers. You will not be able to return to previous tasks. Continue?'
        : 'You are about to move to the next task. You will not be able to return to this task. Continue?';

    if (typeof window !== 'undefined' && !window.confirm(confirmMessage)) {
      return;
    }

    const allowDebugSkip = debugSkipSave && process.env.NODE_ENV !== 'production';
    if (allowDebugSkip) {
      onNext?.();
      return;
    }

    try {
      await beforeNextRef.current?.();
    } catch (error) {
      console.error('beforeNext failed:', error);
    }

    // Force save before moving to next task
    await autoSave();

    const finalEvents = [
      ...eventsRef.current,
      { type: 'submit' as const, taskNumber, t: Date.now() },
    ];

    const res = await fetch(`/api/sessions/${sessionId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskNumber,
        startedAt: startedAtRef.current,
        endedAt: new Date().toISOString(),
        raw: rawRef.current,
        events: finalEvents,
        artifacts: artifactsRef.current,
        needsReview: defaultNeedsReview,
        currentTask: taskNumber + 1,
      } as SaveTaskRequest),
    });

    // Update localStorage with final state + advance currentTask.
    try {
      const data = await res.json().catch(() => ({}));
      if (typeof window !== 'undefined') {
        const key = `moca_session_${sessionId}`;
        const stored = JSON.parse(localStorage.getItem(key) ?? '{}');
        const responses = stored.responses ?? {};
        responses[taskNumber] = {
          ...(responses[taskNumber] ?? {}),
          taskNumber,
          raw: rawRef.current,
          events: finalEvents,
          artifacts: artifactsRef.current,
          startedAt: startedAtRef.current,
          endedAt: new Date().toISOString(),
          ...(data.autoScore !== undefined ? { autoScore: data.autoScore } : {}),
        };
        const nextCurrent = Math.max(stored.currentTask ?? 0, taskNumber + 1);
        localStorage.setItem(
          key,
          JSON.stringify({ ...stored, responses, currentTask: nextCurrent, status: 'task' })
        );
      }
    } catch {
      // Ignore storage errors.
    }

    if (onNext) onNext();
  }, [sessionId, taskNumber, defaultNeedsReview, autoSave, onNext, debugSkipSave]);

  const handleRepeatInstruction = useCallback(() => {
    if (instructionRepeats < 1) {
      setInstructionRepeats(prev => prev + 1);
      addEvent({
        type: 'repeat_instruction',
      });
    }
  }, [instructionRepeats]);

  const addEvent = useCallback(
    (event: Omit<TaskEvent, 't' | 'taskNumber'>) => {
      const fullEvent: TaskEvent = {
        ...event,
        t: Date.now(),
        taskNumber,
      };
      setEvents(prev => {
        const next = [...prev, fullEvent];
        eventsRef.current = next;
        return next;
      });
    },
    [taskNumber]
  );

  const setRaw = useCallback(
    (nextRaw: any) => {
      rawRef.current = nextRaw;
      setRawState(nextRaw);
      addEvent({
        type: 'raw_update',
      });
    },
    [addEvent]
  );

  const setArtifacts = useCallback((nextArtifacts: Artifacts | undefined) => {
    artifactsRef.current = nextArtifacts;
    setArtifactsState(nextArtifacts);
  }, []);

  useEffect(() => {
    const onBlur = () => addEvent({ type: 'nav_blur' });
    const onFocus = () => addEvent({ type: 'nav_focus' });

    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);

    return () => {
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, [addEvent]);

  const contextValue: TaskShellContextValue = {
    raw,
    setRaw,
    artifacts,
    setArtifacts,
    setBeforeNext: (handler) => {
      beforeNextRef.current = handler;
    },
    addEvent,
    events,
    taskNumber,
    sessionId,
    startedAt: startedAtRef.current,
  };

  return (
    <TaskShellContext.Provider value={contextValue}>
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">
                Task {taskNumber}: {title}
              </h1>
              {description && (
                <p className="text-gray-600 text-sm mt-1">{description}</p>
              )}
            </div>
            <div className="text-right">
              <AutosaveIndicator isSaving={isSaving} lastSaved={lastSaved ?? undefined} />
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <ProgressBar currentTask={taskNumber} />
          </div>

          {/* Instruction repeat button */}
          {instructionRepeats < 1 && (
            <button
              onClick={handleRepeatInstruction}
              className="mb-4 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Repeat Instructions (1 time only)
            </button>
          )}

          {/* Main content */}
          <div className="mb-8">{children}</div>

          {/* Navigation */}
          <div className="flex justify-end">
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {taskNumber === 11 ? 'Submit' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </TaskShellContext.Provider>
  );
}

export function useTaskShell() {
  const context = React.useContext(TaskShellContext);
  if (!context) {
    throw new Error('useTaskShell must be used within TaskShell');
  }
  return context;
}
