'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTaskShell } from '@/components/common/TaskShell';
import { Task1Raw } from '@/lib/types';

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isValidLayout(layout: unknown, sequence: string[]) {
  if (!Array.isArray(layout)) return false;
  if (layout.length !== sequence.length) return false;
  const set = new Set(layout);
  if (set.size !== sequence.length) return false;
  return sequence.every((v) => set.has(v));
}

export function Task1TrailMaking() {
  const { raw, setRaw, addEvent } = useTaskShell();

  const sequence = useMemo(
    () => ['1', 'A', '2', 'B', '3', 'C', '4', 'D', '5', 'E'],
    []
  );

  const [layout, setLayout] = useState<string[]>(sequence);
  const didInitLayoutRef = useRef(false);

  const [userPath, setUserPath] = useState<string[]>([]);
  const [errors, setErrors] = useState<Array<{ kind: 'wrong_next'; at: string; expected: string }>>(
    []
  );

  useEffect(() => {
    const existingPath = Array.isArray(raw?.trail?.userPath) ? raw.trail.userPath : undefined;
    const existingErrors = Array.isArray(raw?.trail?.errors) ? raw.trail.errors : undefined;
    if (existingPath) {
      setUserPath(existingPath);
      setErrors(existingErrors ?? []);
    }

    const rawLayout = raw?.trail?.layout;
    if (isValidLayout(rawLayout, sequence)) {
      setLayout(rawLayout);
      didInitLayoutRef.current = true;
      return;
    }

    if (!didInitLayoutRef.current) {
      const nextLayout = shuffle([...sequence]);
      setLayout(nextLayout);
      didInitLayoutRef.current = true;

      // Persist layout immediately so refresh/resume stays stable.
      const nextRaw: Task1Raw = {
        trail: {
          mode: 'click_connect',
          sequence,
          layout: nextLayout,
          userPath: existingPath ?? [],
          errors: existingErrors ?? [],
          completed: false,
        },
      };
      setRaw(nextRaw);
    }
  }, [raw, sequence, setRaw]);

  const syncRaw = (nextPath: string[], nextErrors: typeof errors, layoutOverride?: string[]) => {
    const completed = nextPath.length === sequence.length && nextPath.every((v, i) => v === sequence[i]);
    const nextRaw: Task1Raw = {
      trail: {
        mode: 'click_connect',
        sequence,
        layout: layoutOverride ?? layout,
        userPath: nextPath,
        errors: nextErrors,
        completed,
      },
    };
    setRaw(nextRaw);
  };

  const handleClick = (value: string) => {
    const expected = sequence[userPath.length];

    addEvent({
      type: 'click',
      meta: {
        value,
        expected,
        index: userPath.length,
      },
    });

    const nextPath = [...userPath, value];
    let nextErrors = errors;
    if (expected && value !== expected) {
      nextErrors = [
        ...errors,
        {
          kind: 'wrong_next',
          at: value,
          expected,
        },
      ];
      setErrors(nextErrors);
    }

    setUserPath(nextPath);
    syncRaw(nextPath, nextErrors);
  };

  const reset = () => {
    addEvent({ type: 'click', meta: { action: 'reset' } });
    setUserPath([]);
    setErrors([]);
    syncRaw([], []);
  };

  const completed =
    userPath.length === sequence.length && userPath.every((v, i) => v === sequence[i]);

  return (
    <div className="space-y-4">
      <p className="text-gray-700">
        Click the items in alternating order: <span className="font-mono">1-A-2-B-3-C-4-D-5-E</span>
      </p>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Progress: <span className="font-mono">{userPath.join(' → ') || '—'}</span>
        </div>
        <button
          type="button"
          onClick={reset}
          className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {layout.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => handleClick(item)}
            className="h-12 border border-gray-300 rounded bg-white hover:bg-gray-50 font-semibold"
          >
            {item}
          </button>
        ))}
      </div>

      {errors.length > 0 && (
        <div className="p-3 border border-yellow-200 bg-yellow-50 rounded text-sm text-yellow-900">
          Mistakes recorded: {errors.length}
        </div>
      )}

      {completed && (
        <div className="p-3 border border-green-200 bg-green-50 rounded text-sm text-green-900">
          Completed.
        </div>
      )}
    </div>
  );
}
