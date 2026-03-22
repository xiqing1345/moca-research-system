'use client';

import { useEffect, useRef, useState } from 'react';
import { useTaskShell } from '@/components/common/TaskShell';
import { CanvasDraw, CanvasDrawHandle, Stroke } from '@/components/inputs/CanvasDraw';
import { Task2Raw } from '@/lib/types';

export function Task2CopyDrawing() {
  const { raw, setRaw, addEvent, artifacts, setArtifacts, setBeforeNext, sessionId, taskNumber } =
    useTaskShell();
  const [seedStrokes, setSeedStrokes] = useState<Stroke[]>([]);
  const seededRef = useRef(false);
  const canvasHandleRef = useRef<CanvasDrawHandle | null>(null);

  const CHAIR_OPTIONS = useRef([
    { chairId: 'chair-1', chairPath: '/chairs/chair-1.svg' },
    { chairId: 'chair-2', chairPath: '/chairs/chair-2.svg' },
    { chairId: 'chair-3', chairPath: '/chairs/chair-3.svg' },
  ]).current;

  const selectedChair = raw?.drawing?.prompt?.kind === 'chair' ? raw.drawing.prompt : null;

  useEffect(() => {
    const existing = raw?.drawing?.strokes;
    if (!seededRef.current && Array.isArray(existing)) {
      setSeedStrokes(existing);
      seededRef.current = true;
    }
  }, [raw]);

  useEffect(() => {
    // Choose a random chair prompt once and persist into raw for resume.
    if (selectedChair) return;

    const idx = Math.floor(Math.random() * CHAIR_OPTIONS.length);
    const pick = CHAIR_OPTIONS[Math.min(Math.max(idx, 0), CHAIR_OPTIONS.length - 1)];

    const nextRaw: Task2Raw = {
      drawing: {
        tool: 'canvas',
        prompt: {
          kind: 'chair',
          chairId: pick.chairId,
          chairPath: pick.chairPath,
        },
        strokes: Array.isArray(raw?.drawing?.strokes) ? raw.drawing.strokes : [],
      },
    };

    setRaw(nextRaw);
    addEvent({ type: 'click', meta: { action: 'chair_prompt_selected', chairId: pick.chairId, chairPath: pick.chairPath } });
  }, [addEvent, raw, selectedChair, setRaw]);

  useEffect(() => {
    setBeforeNext(async () => {
      if (!canvasHandleRef.current) return;
      const strokeCount = raw?.drawing?.strokes?.length ?? 0;
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
    const nextRaw: Task2Raw = {
      drawing: {
        tool: 'canvas',
        prompt: selectedChair ?? undefined,
        strokes: nextStrokes,
      },
    };
    setRaw(nextRaw);
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-700">Copy the chair drawing shown below in the canvas.</p>

      {selectedChair && (
        <div className="border border-gray-200 rounded p-3 bg-gray-50">
          <div className="text-sm text-gray-600 mb-2">Chair to copy</div>
          <div className="flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedChair.chairPath}
              alt={selectedChair.chairId}
              className="w-full max-w-[420px] h-auto text-gray-900"
            />
          </div>
        </div>
      )}

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
