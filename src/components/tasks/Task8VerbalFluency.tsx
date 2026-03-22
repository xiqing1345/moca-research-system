'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTaskShell } from '@/components/common/TaskShell';
import { Task8Raw } from '@/lib/types';

type WordItem = { w: string; t: number };

function uniqueCount(words: WordItem[]) {
  const set = new Set(words.map((x) => x.w.trim().toLowerCase()).filter(Boolean));
  return set.size;
}

export function Task8VerbalFluency() {
  const { raw, setRaw, addEvent, startedAt } = useTaskShell();

  const letter = 'F';
  const durationSec = 60;

  const timerRef = useRef<number | null>(null);

  const startedAtMs = useMemo(() => {
    const ms = Date.parse(startedAt);
    return Number.isFinite(ms) ? ms : Date.now();
  }, [startedAt]);

  const [remaining, setRemaining] = useState(durationSec);
  const [input, setInput] = useState('');
  const [words, setWords] = useState<WordItem[]>([]);

  useEffect(() => {
    if (raw?.fluency?.words && Array.isArray(raw.fluency.words)) {
      setWords(raw.fluency.words);
    }
  }, [raw]);

  const syncRaw = (nextWords: WordItem[]) => {
    const nextRaw: Task8Raw = {
      fluency: {
        letter,
        durationSec,
        words: nextWords,
        uniqueCount: uniqueCount(nextWords),
      },
    };
    setRaw(nextRaw);
  };

  useEffect(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);

    const tick = () => {
      const elapsedSec = Math.floor((Date.now() - startedAtMs) / 1000);
      setRemaining(Math.max(0, durationSec - elapsedSec));
    };

    tick();
    timerRef.current = window.setInterval(tick, 250);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [startedAtMs]);

  const isDone = remaining <= 0;

  const addWord = () => {
    if (isDone) return;
    const w = input.trim();
    if (!w) return;

    const t = Date.now() - startedAtMs;
    const next = [...words, { w, t }];
    setWords(next);
    setInput('');

    addEvent({
      type: 'input',
      meta: {
        field: 'fluency_word',
        value: w,
        t,
      },
    });

    syncRaw(next);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addWord();
      addEvent({ type: 'input', meta: { key: 'Enter' } });
    }
  };

  useEffect(() => {
    if (!raw?.fluency) {
      syncRaw(words);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unique = useMemo(() => uniqueCount(words), [words]);

  return (
    <div className="space-y-6">
      <div className="p-4 border border-gray-200 rounded bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600">Letter</div>
            <div className="text-2xl font-bold">{letter}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Time remaining</div>
            <div className="text-2xl font-bold font-mono">{remaining}s</div>
          </div>
        </div>
        <p className="text-gray-700 mt-3">
          Say as many words as you can that begin with <span className="font-semibold">{letter}</span>.
        </p>
      </div>

      <div className="p-4 border border-gray-200 rounded">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Add a word</label>
          <input
            type="text"
            value={input}
            onChange={(e) => {
              const v = e.target.value;
              setInput(v);
              addEvent({ type: 'input', meta: { field: 'fluency_input', value: v } });
            }}
            onKeyDown={onKeyDown}
            placeholder="Type a word and press Enter"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={addWord}
            disabled={isDone}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
          >
            Add
          </button>
          <div className="text-sm text-gray-600 flex items-center">
            Unique count: <span className="ml-1 font-mono">{unique}</span>
          </div>
        </div>
      </div>

      <div className="p-4 border border-gray-200 rounded">
        <h2 className="text-lg font-semibold mb-2">Words</h2>
        {words.length === 0 ? (
          <div className="text-sm text-gray-600">No words yet.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {words.map((w, idx) => (
              <span key={`${w.w}_${idx}`} className="px-2 py-1 rounded bg-white border border-gray-200">
                {w.w}
              </span>
            ))}
          </div>
        )}
      </div>

      {isDone && (
        <div className="p-3 border border-green-200 bg-green-50 rounded text-sm text-green-900">
          Time is up.
        </div>
      )}
    </div>
  );
}
