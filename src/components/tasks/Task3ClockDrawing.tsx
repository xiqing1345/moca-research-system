'use client';

import { useEffect, useRef, useState } from 'react';
import { useTaskShell } from '@/components/common/TaskShell';
import { Task3Raw } from '@/lib/types';

type HandType = 'hour' | 'minute';

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomTargetTime() {
  const h = randomInt(1, 12);
  const m = 0;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function toAngleDeg(hour: number, minute: number, hand: HandType) {
  if (hand === 'minute') return minute * 6;
  return ((hour % 12) + minute / 60) * 30;
}

function fromPointerToMinute(x: number, y: number, cx: number, cy: number) {
  const dx = x - cx;
  const dy = y - cy;
  const rad = Math.atan2(dy, dx);
  const deg = (rad * 180) / Math.PI;
  const fromTop = (deg + 90 + 360) % 360;
  return fromTop / 6;
}

function fromPointerToHour(x: number, y: number, cx: number, cy: number) {
  const dx = x - cx;
  const dy = y - cy;
  const rad = Math.atan2(dy, dx);
  const deg = (rad * 180) / Math.PI;
  const fromTop = (deg + 90 + 360) % 360;
  const h = Math.round(fromTop / 30) % 12;
  return h === 0 ? 12 : h;
}

export function Task3ClockDrawing() {
  const { raw, setRaw, addEvent } = useTaskShell();
  const [targetTime, setTargetTime] = useState('11:00');
  const [hour, setHour] = useState(11);
  const [minute, setMinute] = useState(0);
  const [activeHand, setActiveHand] = useState<HandType | null>(null);
  const dialRef = useRef<HTMLDivElement | null>(null);
  const seededRef = useRef(false);
  // Refs to always hold the latest values — avoids stale closures in pointer handlers
  const hourRef = useRef(11);
  const minuteRef = useRef(0);
  // Ref mirror of activeHand so pointer handlers always read the current value
  // (React state updates are async; the first pointerMove can fire before re-render)
  const activeHandRef = useRef<HandType | null>(null);
  const snapMinute = (value: number) => {
    // Snap to nearest multiple of 5 (matching clock number marks)
    const rounded = Math.round(value / 5) * 5;
    return ((rounded % 60) + 60) % 60;
  };

  useEffect(() => {
    if (seededRef.current) return;

    const existing = raw?.clock;
    if (existing?.mode === 'set_hands' && existing?.answer) {
      const h = Number(existing.answer.hour);
      const m = Number(existing.answer.minute);
      if (Number.isFinite(h) && Number.isFinite(m)) {
        if (typeof existing.targetTime === 'string' && /^\d{1,2}:\d{2}$/.test(existing.targetTime)) {
          setTargetTime(existing.targetTime);
        }
        const clampedH = Math.min(12, Math.max(1, Math.round(h)));
        const clampedM = Math.min(59, Math.max(0, Math.round(m)));
        setHour(clampedH);
        setMinute(clampedM);
        hourRef.current = clampedH;
        minuteRef.current = clampedM;
        seededRef.current = true;
        return;
      }
    }

    const pick = generateRandomTargetTime();
    setTargetTime(pick);

    const nextRaw: Task3Raw = {
      clock: {
        mode: 'set_hands',
        targetTime: pick,
        answer: { hour: 11, minute: 0 },
      },
    };
    setRaw(nextRaw);
    hourRef.current = 11;
    minuteRef.current = 0;
    seededRef.current = true;
  }, [raw, setRaw]);

  const syncRaw = (nextHour: number, nextMinute: number) => {
    const nextRaw: Task3Raw = {
      clock: {
        mode: 'set_hands',
        targetTime,
        answer: {
          hour: nextHour,
          minute: nextMinute,
        },
      },
    };
    setRaw(nextRaw);
  };

  const handleDialPointer = (clientX: number, clientY: number, hand: HandType) => {
    const dial = dialRef.current;
    if (!dial) return;
    const rect = dial.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    if (hand === 'minute') {
      const nextMinute = fromPointerToMinute(clientX, clientY, cx, cy);
      minuteRef.current = nextMinute;
      setMinute(nextMinute);
      syncRaw(hourRef.current, nextMinute);
      addEvent({ type: 'click', meta: { action: 'clock_set_minute', minute: nextMinute } });
      return;
    }

    const nextHour = fromPointerToHour(clientX, clientY, cx, cy);
    hourRef.current = nextHour;
    setHour(nextHour);
    syncRaw(nextHour, minuteRef.current);
    addEvent({ type: 'click', meta: { action: 'clock_set_hour', hour: nextHour } });
  };

  const pickNearestHand = (clientX: number, clientY: number): HandType => {
    const dial = dialRef.current;
    if (!dial) return 'minute';

    const rect = dial.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const r = Math.hypot(clientX - cx, clientY - cy);
    // Inner ring controls hour hand; outer ring controls minute hand.
    return r <= 92 ? 'hour' : 'minute';
  };

  const onDialPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const picked = pickNearestHand(e.clientX, e.clientY);
    activeHandRef.current = picked;  // update ref synchronously before first move
    setActiveHand(picked);
    handleDialPointer(e.clientX, e.clientY, picked);
  };

  const onDialPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons === 0) return;
    // Use ref (always current) instead of state (may be stale on first frame)
    const hand = activeHandRef.current;
    if (!hand) return;
    handleDialPointer(e.clientX, e.clientY, hand);
  };

  const onDialPointerUp = () => {
    // Use ref so this always sees the hand that was set in pointerDown
    if (activeHandRef.current === 'minute') {
      const snappedMinute = snapMinute(minuteRef.current);
      // Compare as numbers; minuteRef.current is a float so they differ whenever not on exact integer
      if (Math.abs(snappedMinute - minuteRef.current) > 1e-9) {
        minuteRef.current = snappedMinute;
        setMinute(snappedMinute);
        syncRaw(hourRef.current, snappedMinute);
        addEvent({ type: 'click', meta: { action: 'clock_snap_minute', minute: snappedMinute } });
      }
    }
    activeHandRef.current = null;
    setActiveHand(null);
  };

  const hourAngle = toAngleDeg(hour, minute, 'hour');
  const minuteAngle = toAngleDeg(hour, minute, 'minute');

  const numberMarks = Array.from({ length: 12 }, (_, i) => {
    const n = i + 1;
    const angle = (n / 12) * 2 * Math.PI;
    const r = 43;
    const x = 50 + r * Math.sin(angle);
    const y = 50 - r * Math.cos(angle);
    return { n, x, y };
  });

  return (
    <div className="space-y-4">
      <p className="text-gray-700">
        Set the clock hands to show <span className="font-mono">{targetTime}</span>.
      </p>

      <div className="flex items-center justify-center">
        <div
          ref={dialRef}
          onPointerDown={onDialPointerDown}
          onPointerMove={onDialPointerMove}
          onPointerUp={onDialPointerUp}
          onPointerCancel={onDialPointerUp}
          onLostPointerCapture={onDialPointerUp}
          className="relative w-[320px] h-[320px] rounded-full border-4 border-gray-800 bg-white touch-none select-none"
        >
          {numberMarks.map((m) => (
            <div
              key={m.n}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-sm font-semibold text-gray-700"
              style={{ left: `${m.x}%`, top: `${m.y}%` }}
            >
              {m.n}
            </div>
          ))}

          <div
            className={`absolute left-1/2 top-1/2 origin-bottom rounded ${activeHand === 'hour' ? 'bg-blue-700' : 'bg-gray-800'}`}
            style={{
              width: '5px',
              height: '80px',
              transform: `translate(-50%, -100%) rotate(${hourAngle}deg)`,
            }}
          />

          <div
            className={`absolute left-1/2 top-1/2 origin-bottom rounded ${activeHand === 'minute' ? 'bg-blue-700' : 'bg-red-600'}`}
            style={{
              width: '3px',
              height: '120px',
              transform: `translate(-50%, -100%) rotate(${minuteAngle}deg)`,
            }}
          />

          <div className="absolute left-1/2 top-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-900" />
        </div>
      </div>

      <div className="text-xs text-gray-600">Tip: drag directly on the clock. The closer hand tip will be selected and moved.</div>
    </div>
  );
}
