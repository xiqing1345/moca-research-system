'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTaskShell } from '@/components/common/TaskShell';
import { TextAnswer } from '@/components/inputs/FormInputs';
import { Task5Raw } from '@/lib/types';

function parseWordList(input: string): string[] {
  return input
    .split(/[,\n\t ]+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .map((w) => w.toUpperCase());
}

export function Task5MemoryImmediate() {
  const { raw, setRaw, addEvent } = useTaskShell();

  const wordListId = 'v8.1_setA';
  const targetWords = useMemo(() => ['FACE', 'VELVET', 'CHURCH', 'DAISY', 'RED'], []);

  const presentedAtRef = useRef<string>(new Date().toISOString());

  const [phase, setPhase] = useState<'study' | 'trial1' | 'trial2'>('study');

  const [trial1, setTrial1] = useState('');
  const [trial2, setTrial2] = useState('');

  useEffect(() => {
    if (raw?.memoryImmediate?.presentedAt) {
      presentedAtRef.current = raw.memoryImmediate.presentedAt;
    }

    const rawPhase = raw?.memoryImmediate?.phase;
    if (rawPhase === 'study' || rawPhase === 'trial1' || rawPhase === 'trial2') {
      setPhase(rawPhase);
    } else {
      const hasTrial2 =
        Array.isArray(raw?.memoryImmediate?.trial2) && raw.memoryImmediate.trial2.length > 0;
      const hasTrial1 =
        Array.isArray(raw?.memoryImmediate?.trial1) && raw.memoryImmediate.trial1.length > 0;

      setPhase(hasTrial2 ? 'trial2' : hasTrial1 ? 'trial1' : 'study');
    }

    if (raw?.memoryImmediate?.trial1) {
      setTrial1((raw.memoryImmediate.trial1 as string[]).join(' '));
    }
    if (raw?.memoryImmediate?.trial2) {
      setTrial2((raw.memoryImmediate.trial2 as string[]).join(' '));
    }
  }, [raw]);

  const syncRaw = (
    nextTrial1: string,
    nextTrial2: string,
    nextPhase: 'study' | 'trial1' | 'trial2' = phase
  ) => {
    const nextRaw: Task5Raw = {
      memoryImmediate: {
        wordListId,
        phase: nextPhase,
        trial1: parseWordList(nextTrial1),
        trial2: parseWordList(nextTrial2),
        presentedAt: presentedAtRef.current,
      },
    };
    setRaw(nextRaw);
  };

  const confirmWords = () => {
    addEvent({ type: 'click', meta: { action: 'confirm_words' } });
    setPhase('trial1');
    syncRaw(trial1, trial2, 'trial1');
  };

  const confirmTrial1 = () => {
    addEvent({ type: 'click', meta: { action: 'confirm_trial1' } });
    setPhase('trial2');
    syncRaw(trial1, trial2, 'trial2');
  };

  const handleTrial1 = (value: string) => {
    setTrial1(value);
    addEvent({ type: 'input', meta: { field: 'trial1', value } });
    syncRaw(value, trial2);
  };

  const handleTrial2 = (value: string) => {
    setTrial2(value);
    addEvent({ type: 'input', meta: { field: 'trial2', value } });
    syncRaw(trial1, value);
  };

  useEffect(() => {
    if (!raw?.memoryImmediate) {
      syncRaw(trial1, trial2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === 'study') {
    return (
      <div className="space-y-6">
        <section className="p-4 border border-gray-200 rounded bg-gray-50">
          <h2 className="text-lg font-semibold mb-2">Word List</h2>
          <p className="text-gray-700 mb-3">Please remember these words:</p>
          <div className="flex flex-wrap gap-2">
            {targetWords.map((w) => (
              <span
                key={w}
                className="px-2 py-1 rounded bg-white border border-gray-200 font-mono"
              >
                {w}
              </span>
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={confirmWords}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            I have memorized the words
          </button>
        </div>

        <div className="text-xs text-gray-600">
          After confirming, you will be asked to type the words you remember.
        </div>
      </div>
    );
  }

  if (phase === 'trial1') {
    return (
      <div className="space-y-6">
        <section className="p-4 border border-gray-200 rounded">
          <h2 className="text-lg font-semibold mb-2">Trial 1</h2>
          <TextAnswer
            label="Type all the words you can remember"
            value={trial1}
            onChange={handleTrial1}
            placeholder="e.g., FACE CHURCH"
            multiline
            rows={3}
          />
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={confirmTrial1}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Confirm Trial 1
          </button>
        </div>

        <div className="text-xs text-gray-600">After confirming, Trial 2 will be shown.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="p-4 border border-gray-200 rounded">
        <h2 className="text-lg font-semibold mb-2">Trial 2</h2>
        <TextAnswer
          label="Type all the words you can remember (again)"
          value={trial2}
          onChange={handleTrial2}
          placeholder="e.g., FACE VELVET CHURCH"
          multiline
          rows={3}
        />
      </section>
    </div>
  );
}
