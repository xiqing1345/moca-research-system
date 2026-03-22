'use client';

import { useEffect, useRef, useState } from 'react';
import { useTaskShell } from '@/components/common/TaskShell';
import { CanvasDraw, CanvasDrawHandle, Stroke } from '@/components/inputs/CanvasDraw';
import { Task3Raw } from '@/lib/types';

export function Task3ClockDrawing() {
  const { raw, setRaw, addEvent, artifacts, setArtifacts, setBeforeNext, sessionId, taskNumber } =
    useTaskShell();
  const [seedStrokes, setSeedStrokes] = useState<Stroke[]>([]);
  const seededRef = useRef(false);
  const canvasHandleRef = useRef<CanvasDrawHandle | null>(null);

  const targetTime = '11:10';

  useEffect(() => {
    const existing = raw?.clock?.strokes;
    if (!seededRef.current && Array.isArray(existing)) {
      setSeedStrokes(existing);
      seededRef.current = true;
    }
  }, [raw]);

  useEffect(() => {
    setBeforeNext(async () => {
      if (!canvasHandleRef.current) return;
      const strokeCount = raw?.clock?.strokes?.length ?? 0;
      if (strokeCount === 0) return;

      const blob = await canvasHandleRef.current.exportPngBlob();
      const formData = new FormData();
      formData.append('file', blob, `task${taskNumber}.png`);
      formData.append('taskNumber', String(taskNumber));

      const res = await fetch(`/api/sessions/${sessionId}/artifact`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`artifact upload failed (${res.status})`);
      }

      const data = (await res.json()) as any;
      const uploaded = data?.file;
      if (!uploaded) return;

      setArtifacts({
        files: [...(artifacts?.files ?? []), uploaded],
      });

      addEvent({
        type: 'click',
        meta: { action: 'artifact_png_saved', path: uploaded.path },
      });
    });

    return () => setBeforeNext(null);
  }, [addEvent, artifacts, raw, sessionId, setArtifacts, setBeforeNext, taskNumber]);

  const handleChange = (nextStrokes: Stroke[]) => {
    const nextRaw: Task3Raw = {
      clock: {
        strokes: nextStrokes,
        targetTime,
      },
    };
    setRaw(nextRaw);
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-700">
        Draw a clock showing <span className="font-mono">{targetTime}</span>.
      </p>

      <CanvasDraw
        ref={canvasHandleRef}
        initialStrokes={seedStrokes}
        onChange={handleChange}
        onEvent={(e) => addEvent(e)}
      />

      <div className="text-xs text-gray-600">
        This task is reviewed by a researcher.
      </div>
    </div>
  );
}
