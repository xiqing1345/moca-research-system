'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTaskShell } from '@/components/common/TaskShell';
import { Task2Raw } from '@/lib/types';

type ChairPattern = {
  chairId: string;
  size: number;
  targetCells: string[];
};

function makeCellKey(r: number, c: number) {
  return `${r},${c}`;
}

function computeStats(targetCells: string[], userCells: string[]) {
  const targetSet = new Set(targetCells);
  const userSet = new Set(userCells);

  let overlap = 0;
  for (const cell of userSet) {
    if (targetSet.has(cell)) overlap++;
  }

  const precision = userSet.size > 0 ? overlap / userSet.size : 0;
  const recall = targetSet.size > 0 ? overlap / targetSet.size : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return { overlap, precision, recall, f1 };
}

function renderGridCells(size: number) {
  return Array.from({ length: size * size }, (_, idx) => {
    const r = Math.floor(idx / size);
    const c = idx % size;
    return makeCellKey(r, c);
  });
}

export function Task2CopyDrawing() {
  const { raw, setRaw, addEvent } = useTaskShell();
  const [selectedPattern, setSelectedPattern] = useState<ChairPattern | null>(null);
  const [userCells, setUserCells] = useState<string[]>([]);
  const seededRef = useRef(false);

  const CHAIR_PATTERNS = useMemo<ChairPattern[]>(() => [
    {
      chairId: 'chair-1',
      size: 10,
      targetCells: [
        // Backrest top rail
        '1,2', '1,3', '1,4', '1,5', '1,6', '1,7',
        // Backrest side posts + center slats
        '2,2', '2,4', '2,5', '2,7',
        '3,2', '3,4', '3,5', '3,7',
        '4,2', '4,4', '4,5', '4,7',
        // Backrest bottom rail
        '5,2', '5,3', '5,4', '5,5', '5,6', '5,7',
        // Seat (wider and thicker than backrest)
        '6,1', '6,2', '6,3', '6,4', '6,5', '6,6', '6,7', '6,8',
        '7,1', '7,2', '7,7', '7,8',
        // Four legs
        '8,1', '8,3', '8,6', '8,8',
        '9,1', '9,3', '9,6', '9,8',
      ],
    },
    {
      chairId: 'chair-2',
      size: 10,
      targetCells: [
        // Slanted back variant
        '1,3', '1,4', '1,5', '1,6',
        '2,2', '2,6',
        '3,2', '3,6',
        '4,2', '4,6',
        '5,2', '5,3', '5,4', '5,5', '5,6',
        '6,3', '6,4', '6,5',
        '7,3', '7,5',
        '8,3', '8,5',
        '9,3', '9,5',
      ],
    },
    {
      chairId: 'chair-3',
      size: 10,
      targetCells: [
        // Wider seat variant
        '1,2', '1,3', '1,4', '1,5', '1,6',
        '2,2', '2,6',
        '3,2', '3,6',
        '4,2', '4,6',
        '5,1', '5,2', '5,3', '5,4', '5,5', '5,6', '5,7',
        '6,2', '6,3', '6,4', '6,5', '6,6',
        '7,2', '7,6',
        '8,2', '8,6',
        '9,2', '9,6',
      ],
    },
  ], []);

  const syncRaw = (pattern: ChairPattern, nextUserCells: string[]) => {
    const stats = computeStats(pattern.targetCells, nextUserCells);
    const nextRaw: Task2Raw = {
      copyGrid: {
        mode: 'grid_copy',
        size: pattern.size,
        prompt: {
          kind: 'chair',
          chairId: pattern.chairId,
        },
        targetCells: pattern.targetCells,
        userCells: nextUserCells,
        stats,
      },
    };
    setRaw(nextRaw);
  };

  const FIXED_CHAIR_ID = 'chair-1';

  useEffect(() => {
    if (seededRef.current) return;

    const existing = raw?.copyGrid;
    if (existing?.mode === 'grid_copy' && existing.prompt?.kind === 'chair') {
      const found = CHAIR_PATTERNS.find((p) => p.chairId === FIXED_CHAIR_ID);
      if (found) {
        const safeUserCells = Array.isArray(existing.userCells)
          ? existing.userCells.filter((x: unknown) => typeof x === 'string')
          : [];
        setSelectedPattern(found);
        setUserCells(safeUserCells);
        seededRef.current = true;
        return;
      }
    }

    const pick = CHAIR_PATTERNS.find((p) => p.chairId === FIXED_CHAIR_ID) ?? CHAIR_PATTERNS[0];

    setSelectedPattern(pick);
    setUserCells([]);
    seededRef.current = true;
    syncRaw(pick, []);

    addEvent({ type: 'click', meta: { action: 'chair_prompt_selected', chairId: pick.chairId } });
  }, [addEvent, raw, CHAIR_PATTERNS]);

  const toggleCell = (cell: string) => {
    if (!selectedPattern) return;
    const existed = userCells.includes(cell);
    const next = existed ? userCells.filter((x) => x !== cell) : [...userCells, cell];
    setUserCells(next);
    syncRaw(selectedPattern, next);
    addEvent({
      type: 'click',
      meta: {
        action: existed ? 'cell_unfill' : 'cell_fill',
        cell,
      },
    });
  };

  const clear = () => {
    if (!selectedPattern) return;
    setUserCells([]);
    syncRaw(selectedPattern, []);
    addEvent({ type: 'click', meta: { action: 'grid_clear' } });
  };

  const renderGrid = (filled: Set<string>, interactive: boolean) => {
    if (!selectedPattern) return null;
    const size = selectedPattern.size;
    return (
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {renderGridCells(size).map((cell) => {
          const isFilled = filled.has(cell);
          if (!interactive) {
            return (
              <div
                key={cell}
                className={`h-8 w-8 border border-gray-300 ${isFilled ? 'bg-gray-900' : 'bg-white'}`}
              />
            );
          }

          return (
            <button
              key={cell}
              type="button"
              onClick={() => toggleCell(cell)}
              className={`h-8 w-8 border border-gray-300 transition-colors ${isFilled ? 'bg-gray-900' : 'bg-white hover:bg-gray-100'}`}
              aria-label={`Cell ${cell}`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-700">Copy the chair pattern shown on the left grid to the right grid.</p>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Filled: <span className="font-mono">{userCells.length}</span>
        </div>
        <button
          type="button"
          onClick={clear}
          className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
        >
          Clear
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-3 border border-gray-200 rounded bg-gray-50">
          <div className="text-sm text-gray-600 mb-2">Chair target ({selectedPattern?.chairId ?? '-'})</div>
          <div className="inline-block">{renderGrid(new Set(selectedPattern?.targetCells ?? []), false)}</div>
        </div>

        <div className="p-3 border border-gray-200 rounded bg-white">
          <div className="text-sm text-gray-600 mb-2">Your answer</div>
          <div className="inline-block">{renderGrid(new Set(userCells), true)}</div>
        </div>
      </div>

      <div className="text-xs text-gray-600">
        Score is calculated automatically from overlap between target chair cells and filled cells.
      </div>

      {selectedPattern?.targetCells?.length && userCells.length === 0 && (
        <div className="text-xs text-gray-500">
          Tip: click cells in the answer grid to fill/unfill.
        </div>
      )}

    </div>
  );
}
