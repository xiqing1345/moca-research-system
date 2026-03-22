'use client';

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { TaskEvent } from '@/lib/types';

export type StrokePoint = { x: number; y: number; t: number };
export type Stroke = { id: string; points: StrokePoint[] };

interface CanvasDrawProps {
  width?: number;
  height?: number;
  initialStrokes?: Stroke[];
  onChange: (strokes: Stroke[]) => void;
  onEvent?: (event: Omit<TaskEvent, 't' | 'taskNumber'>) => void;
}

export interface CanvasDrawHandle {
  exportPngBlob: () => Promise<Blob>;
}

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export const CanvasDraw = forwardRef<CanvasDrawHandle, CanvasDrawProps>(function CanvasDraw(
  {
    width = 700,
    height = 460,
    initialStrokes,
    onChange,
    onEvent,
  },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>(initialStrokes ?? []);
  const [activeStrokeId, setActiveStrokeId] = useState<string | null>(null);
  const strokeStartMsRef = useRef<number>(0);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useImperativeHandle(
    ref,
    () => ({
      exportPngBlob: async () => {
        const canvas = canvasRef.current;
        if (!canvas) {
          throw new Error('Canvas is not ready');
        }

        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height;

        const exportCtx = exportCanvas.getContext('2d');
        if (!exportCtx) {
          throw new Error('Failed to export canvas');
        }

        // Ensure opaque white background for review.
        exportCtx.fillStyle = '#ffffff';
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        exportCtx.drawImage(canvas, 0, 0);

        const blob = await new Promise<Blob>((resolve, reject) => {
          exportCanvas.toBlob(
            (b) => {
              if (!b) reject(new Error('Failed to create PNG blob'));
              else resolve(b);
            },
            'image/png',
            1
          );
        });

        return blob;
      },
    }),
    []
  );

  useEffect(() => {
    setStrokes(initialStrokes ?? []);
  }, [initialStrokes]);

  const redraw = useMemo(() => {
    return (nextStrokes: Stroke[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#111827';

      for (const stroke of nextStrokes) {
        if (!stroke.points.length) continue;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    };
  }, []);

  useEffect(() => {
    redraw(strokes);
    onChangeRef.current(strokes);
  }, [strokes, redraw]);

  const getPoint = (e: PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
    const localX = (e.clientX - rect.left) * scaleX;
    const localY = (e.clientY - rect.top) * scaleY;
    return {
      x: Math.max(0, Math.min(localX, canvas.width)),
      y: Math.max(0, Math.min(localY, canvas.height)),
    };
  };

  const beginStroke = (e: PointerEvent) => {
    const { x, y } = getPoint(e);
    const id = makeId('s');
    strokeStartMsRef.current = Date.now();
    setActiveStrokeId(id);

    onEvent?.({
      type: 'draw',
      meta: { kind: 'stroke_start', strokeId: id, x, y },
    });

    setStrokes((prev) => [
      ...prev,
      {
        id,
        points: [{ x, y, t: 0 }],
      },
    ]);
  };

  const addPoint = (e: PointerEvent) => {
    if (!activeStrokeId) return;
    const { x, y } = getPoint(e);
    const t = Date.now() - strokeStartMsRef.current;

    setStrokes((prev) =>
      prev.map((s) => {
        if (s.id !== activeStrokeId) return s;
        return {
          ...s,
          points: [...s.points, { x, y, t }],
        };
      })
    );
  };

  const endStroke = () => {
    if (!activeStrokeId) return;
    onEvent?.({
      type: 'draw',
      meta: { kind: 'stroke_end', strokeId: activeStrokeId },
    });
    setActiveStrokeId(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onPointerDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      beginStroke(e);
    };
    const onPointerMove = (e: PointerEvent) => addPoint(e);
    const onPointerUp = (e: PointerEvent) => {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      endStroke();
    };
    const onPointerCancel = () => endStroke();

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerCancel);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
    };
  }, [activeStrokeId]);

  const clear = () => {
    onEvent?.({ type: 'click', meta: { action: 'canvas_clear' } });
    setStrokes([]);
  };

  const undo = () => {
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const removedStroke = prev[prev.length - 1];
      onEvent?.({
        type: 'click',
        meta: { action: 'canvas_undo', strokeId: removedStroke.id },
      });
      return prev.slice(0, -1);
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-600">Draw in the box below.</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={strokes.length === 0}
            className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={clear}
            disabled={strokes.length === 0}
            className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear
          </button>
        </div>
      </div>
      <div className="max-w-full overflow-x-auto">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="touch-none block border border-gray-300 rounded bg-white"
        />
      </div>
    </div>
  );
});
