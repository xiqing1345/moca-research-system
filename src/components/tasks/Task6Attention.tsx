'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { NumberInput, TextAnswer } from '@/components/inputs/FormInputs';
import { useTaskShell } from '@/components/common/TaskShell';
import { Task6Raw } from '@/lib/types';

function parseDigitList(input: string): number[] {
  return input
    .trim()
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));
}

export function Task6Attention() {
  const { raw, setRaw, addEvent } = useTaskShell();

  const digitForwardPrompt = useMemo(() => [2, 1, 8, 5, 4], []);
  const digitBackwardPrompt = useMemo(() => [7, 4, 2], []);

  const vigilanceSequence = useMemo(
    () => ['F', 'B', 'A', 'C', 'A', 'D', 'E', 'A', 'B', 'F', 'A', 'C'],
    []
  );

  const [digitForwardInput, setDigitForwardInput] = useState('');
  const [digitBackwardInput, setDigitBackwardInput] = useState('');
  const [serial7Answers, setSerial7Answers] = useState<Array<number | null>>([
    null,
    null,
    null,
    null,
    null,
  ]);

  const [vigStarted, setVigStarted] = useState(false);
  const [vigIndex, setVigIndex] = useState(0);
  const [vigTaps, setVigTaps] = useState<
    Array<{ t: number; index?: number; letter?: string; rtMs?: number }>
  >([]);
  const [vigPresentations, setVigPresentations] = useState<
    Array<{
      index: number;
      letter: string;
      onsetMs: number;
      tapMs?: number;
      rtMs?: number;
    }>
  >([]);
  const vigTapsRef = useRef<Array<{ t: number; index?: number; letter?: string; rtMs?: number }>>([]);
  const vigPresentationsRef = useRef<
    Array<{ index: number; letter: string; onsetMs: number; tapMs?: number; rtMs?: number }>
  >([]);
  const vigTimerRef = useRef<number | null>(null);
  const vigStartMsRef = useRef<number>(0);
  const vigOnsetMsRef = useRef<number>(0);

  // Hydrate local state from raw (resume)
  useEffect(() => {
    if (!raw?.attention) return;

    const digitForwardAnswer = raw.attention.digitForward?.answer;
    if (Array.isArray(digitForwardAnswer)) {
      setDigitForwardInput(digitForwardAnswer.join(' '));
    }

    const digitBackwardAnswer = raw.attention.digitBackward?.answer;
    if (Array.isArray(digitBackwardAnswer)) {
      setDigitBackwardInput(digitBackwardAnswer.join(' '));
    }

    const serial7 = raw.attention.serial7?.answers;
    if (Array.isArray(serial7)) {
      const next = [null, null, null, null, null] as Array<number | null>;
      for (let i = 0; i < Math.min(serial7.length, 5); i++) {
        next[i] = typeof serial7[i] === 'number' ? serial7[i] : null;
      }
      setSerial7Answers(next);
    }

    const taps = raw.attention.vigilance?.taps;
    if (Array.isArray(taps)) {
      setVigTaps(taps as any);
      vigTapsRef.current = taps as any;
    }

    const presentations = raw.attention.vigilance?.presentations;
    if (Array.isArray(presentations)) {
      setVigPresentations(presentations as any);
      vigPresentationsRef.current = presentations as any;
    }
  }, [raw]);

  const computeAndSetRaw = (next: {
    digitForwardAnswer?: number[];
    digitBackwardAnswer?: number[];
    serial7?: Array<number | null>;
    vigilance?: {
      taps: Array<{ t: number; index?: number; letter?: string; rtMs?: number }>;
      presentations?: Array<{
        index: number;
        letter: string;
        onsetMs: number;
        tapMs?: number;
        rtMs?: number;
      }>;
    };
  }) => {
    const digitForwardAnswer = next.digitForwardAnswer ?? parseDigitList(digitForwardInput);
    const digitBackwardAnswer = next.digitBackwardAnswer ?? parseDigitList(digitBackwardInput);

    const dfCorrect =
      digitForwardAnswer.length === digitForwardPrompt.length &&
      digitForwardAnswer.every((n, i) => n === digitForwardPrompt[i]);

    const expectedBackward = [...digitBackwardPrompt].reverse();
    const dbCorrect =
      digitBackwardAnswer.length === expectedBackward.length &&
      digitBackwardAnswer.every((n, i) => n === expectedBackward[i]);

    const serial7 = next.serial7 ?? serial7Answers;
    const serial7Numbers = serial7.filter((n): n is number => typeof n === 'number');

    const taps =
      next.vigilance?.taps ?? vigTapsRef.current;

    const presentations =
      next.vigilance?.presentations ?? vigPresentationsRef.current;

    // Compute misses for letters that have already been presented.
    const maxPresentedIndex = presentations.reduce((m, p) => Math.max(m, p.index), -1);

    const miss = presentations.reduce((acc, p) => {
      if (p.index > maxPresentedIndex) return acc;
      if (p.letter === 'A' && p.tapMs === undefined) return acc + 1;
      return acc;
    }, 0);

    const falseTap = taps.reduce((acc, tap) => {
      const letter = tap.letter;
      if (!letter) return acc;
      return letter === 'A' ? acc : acc + 1;
    }, 0);

    const nextRaw: Task6Raw = {
      attention: {
        digitForward: {
          prompt: digitForwardPrompt,
          answer: digitForwardAnswer,
          correct: dfCorrect,
        },
        digitBackward: {
          prompt: digitBackwardPrompt,
          answer: digitBackwardAnswer,
          correct: dbCorrect,
        },
        vigilance: {
          sequence: vigilanceSequence,
          taps,
          presentations,
          errors: {
            falseTap,
            miss,
          },
        },
        serial7: {
          start: 100,
          answers: serial7Numbers,
        },
      },
    };

    setRaw(nextRaw);
  };

  const handleDigitForwardChange = (value: string) => {
    setDigitForwardInput(value);
    addEvent({
      type: 'input',
      meta: {
        field: 'digitForward',
        value,
      },
    });
    computeAndSetRaw({ digitForwardAnswer: parseDigitList(value) });
  };

  const handleDigitBackwardChange = (value: string) => {
    setDigitBackwardInput(value);
    addEvent({
      type: 'input',
      meta: {
        field: 'digitBackward',
        value,
      },
    });
    computeAndSetRaw({ digitBackwardAnswer: parseDigitList(value) });
  };

  const handleSerial7Change = (index: number, value: number | null) => {
    const next = [...serial7Answers];
    next[index] = value;
    setSerial7Answers(next);
    addEvent({
      type: 'input',
      meta: {
        field: `serial7_${index + 1}`,
        value,
      },
    });
    computeAndSetRaw({ serial7: next });
  };

  const startVigilance = () => {
    if (vigTimerRef.current) window.clearInterval(vigTimerRef.current);

    setVigIndex(0);
    setVigStarted(true);

    setVigTaps([]);
    vigTapsRef.current = [];

    setVigPresentations([]);
    vigPresentationsRef.current = [];

    vigStartMsRef.current = Date.now();
    vigOnsetMsRef.current = 0;
    addEvent({ type: 'click', meta: { action: 'vigilance_start' } });

    // Present the first stimulus immediately.
    const firstLetter = vigilanceSequence[0];
    if (firstLetter) {
      const initialPresentations = [{ index: 0, letter: firstLetter, onsetMs: 0 }];
      setVigPresentations(initialPresentations);
      vigPresentationsRef.current = initialPresentations;
      computeAndSetRaw({ vigilance: { taps: [], presentations: initialPresentations } });
      addEvent({
        type: 'click',
        meta: { action: 'vigilance_present', index: 0, letter: firstLetter, onsetMs: 0 },
      });
    }

    vigTimerRef.current = window.setInterval(() => {
      setVigIndex((prev) => {
        const next = prev + 1;
        if (next >= vigilanceSequence.length) {
          if (vigTimerRef.current) window.clearInterval(vigTimerRef.current);
          vigTimerRef.current = null;
          setVigStarted(false);
          addEvent({ type: 'click', meta: { action: 'vigilance_end' } });
          return prev;
        }

        const onsetMs = Date.now() - vigStartMsRef.current;
        vigOnsetMsRef.current = onsetMs;
        const letter = vigilanceSequence[next] ?? '';
        if (letter) {
          setVigPresentations((prevPres) => {
            if (prevPres.some((p) => p.index === next)) return prevPres;
            const updated = [...prevPres, { index: next, letter, onsetMs }];
            vigPresentationsRef.current = updated;
            computeAndSetRaw({ vigilance: { taps: vigTapsRef.current, presentations: updated } });
            return updated;
          });

          addEvent({
            type: 'click',
            meta: { action: 'vigilance_present', index: next, letter, onsetMs },
          });
        }
        return next;
      });
    }, 900);
  };

  const handleTap = () => {
    if (!vigStarted) return;

    const tapMs = Date.now() - vigStartMsRef.current;
    const onsetMs = vigOnsetMsRef.current;
    const rtMs = Math.max(0, tapMs - onsetMs);
    const letter = vigilanceSequence[vigIndex] ?? '';

    const nextTaps = [...vigTapsRef.current, { t: tapMs, index: vigIndex, letter, rtMs }];
    setVigTaps(nextTaps);
    vigTapsRef.current = nextTaps;

    setVigPresentations((prev) => {
      const updated = prev.map((p) => {
        if (p.index !== vigIndex) return p;
        if (p.tapMs !== undefined) return p;
        return { ...p, tapMs, rtMs };
      });
      vigPresentationsRef.current = updated;
      computeAndSetRaw({ vigilance: { taps: nextTaps, presentations: updated } });
      return updated;
    });

    addEvent({
      type: 'tap',
      meta: {
        kind: 'vigilance',
        index: vigIndex,
        letter,
        onsetMs,
        tapMs,
        rtMs,
      },
    });
  };

  useEffect(() => {
    // Ensure raw has a baseline structure once component mounts.
    if (!raw?.attention) {
      computeAndSetRaw({});
    }
    return () => {
      if (vigTimerRef.current) window.clearInterval(vigTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentLetter = vigilanceSequence[vigIndex] ?? '';

  return (
    <div className="space-y-8">
      <section className="p-4 border border-gray-200 rounded">
        <h2 className="text-lg font-semibold mb-2">Digit Span (Forward)</h2>
        <p className="text-gray-700 mb-3">
          Repeat these numbers in the same order: <span className="font-mono">{digitForwardPrompt.join(' ')}</span>
        </p>
        <TextAnswer
          label="Your answer"
          value={digitForwardInput}
          onChange={handleDigitForwardChange}
          placeholder="e.g., 2 1 8 5 4"
          normalizeSpokenNumbers
        />
      </section>

      <section className="p-4 border border-gray-200 rounded">
        <h2 className="text-lg font-semibold mb-2">Digit Span (Backward)</h2>
        <p className="text-gray-700 mb-3">
          Repeat these numbers in reverse order: <span className="font-mono">{digitBackwardPrompt.join(' ')}</span>
        </p>
        <TextAnswer
          label="Your answer"
          value={digitBackwardInput}
          onChange={handleDigitBackwardChange}
          placeholder="e.g., 2 4 7"
          normalizeSpokenNumbers
        />
      </section>

      <section className="p-4 border border-gray-200 rounded">
        <h2 className="text-lg font-semibold mb-2">Vigilance</h2>
        <p className="text-gray-700 mb-3">
          The letter <span className="font-mono">A</span> will appear multiple times. Tap every time you see{' '}
          <span className="font-mono">A</span>. We will record the time you take to respond each time.
        </p>

        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={startVigilance}
            disabled={vigStarted}
            className="px-4 py-2 bg-gray-800 text-white rounded disabled:bg-gray-400"
          >
            {vigStarted ? 'Running…' : 'Start'}
          </button>

          <button
            onClick={handleTap}
            disabled={!vigStarted}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
          >
            Tap
          </button>

          <div className="ml-auto text-sm text-gray-600">
            {vigStarted ? `Step ${vigIndex + 1}/${vigilanceSequence.length}` : 'Not running'}
          </div>
        </div>

        <div className="h-20 flex items-center justify-center border border-gray-200 rounded bg-gray-50">
          <div className="text-5xl font-bold">{vigStarted ? currentLetter : '—'}</div>
        </div>
      </section>

      <section className="p-4 border border-gray-200 rounded">
        <h2 className="text-lg font-semibold mb-2">Serial 7</h2>
        <p className="text-gray-700 mb-4">Starting at 100, subtract 7 each time (5 answers).</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {serial7Answers.map((value, idx) => (
            <NumberInput
              key={idx}
              label={`Answer ${idx + 1}`}
              value={value}
              onChange={(v) => handleSerial7Change(idx, v)}
              placeholder="e.g., 93"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
