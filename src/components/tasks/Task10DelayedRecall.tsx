'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTaskShell } from '@/components/common/TaskShell';
import { TextAnswer } from '@/components/inputs/FormInputs';
import { Task10Raw } from '@/lib/types';

function parseWords(input: string): string[] {
  return input
    .split(/[,\n\t ]+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .map((w) => w.toUpperCase());
}

export function Task10DelayedRecall() {
  const { raw, setRaw, addEvent } = useTaskShell();

  const targetWords = useMemo(
    () => ['FACE', 'VELVET', 'CHURCH', 'DAISY', 'RED'],
    []
  );

  const cueMap = useMemo(
    () => ({
      VELVET: 'type of fabric',
      DAISY: 'type of flower',
      RED: 'color',
      FACE: 'part of body',
      CHURCH: 'type of building',
    }),
    []
  );

  const [freeRecallInput, setFreeRecallInput] = useState('');

  useEffect(() => {
    if (raw?.delayedRecall?.freeRecall && Array.isArray(raw.delayedRecall.freeRecall)) {
      setFreeRecallInput((raw.delayedRecall.freeRecall as string[]).join(' '));
    }
  }, [raw]);

  const syncRaw = (input: string) => {
    const freeRecall = parseWords(input);
    const freeSet = new Set(freeRecall);

    const cues = targetWords.map((word) => {
      const recalledWith = freeSet.has(word) ? 'category' : 'missed';
      return {
        word,
        categoryCue: cueMap[word as keyof typeof cueMap] ?? '',
        recalledWith: recalledWith as 'category' | 'mc' | 'missed',
      };
    });

    const mis = {
      free: Math.min(freeRecall.filter((w) => targetWords.includes(w)).length, 5),
      category: 0,
      mc: 0,
      score: 0,
    };
    mis.score = mis.free * 3 + mis.category * 2 + mis.mc * 1;

    const nextRaw: Task10Raw = {
      delayedRecall: {
        targetWords,
        freeRecall,
        cues,
        mis,
      },
    };

    setRaw(nextRaw);
  };

  const handleChange = (value: string) => {
    setFreeRecallInput(value);
    addEvent({ type: 'input', meta: { field: 'freeRecall', value } });
    syncRaw(value);
  };

  useEffect(() => {
    if (!raw?.delayedRecall) {
      syncRaw(freeRecallInput);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <p className="text-gray-700">
        Please recall the words from the memory task.
      </p>

      <TextAnswer
        label="Free recall"
        value={freeRecallInput}
        onChange={handleChange}
        placeholder="Type the words you remember"
        multiline
        rows={4}
      />
    </div>
  );
}
