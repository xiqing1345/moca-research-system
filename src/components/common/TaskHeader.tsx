'use client';

import { useEffect, useState } from 'react';

interface ProgressBarProps {
  currentTask: number;
  totalTasks?: number;
}

export function ProgressBar({ currentTask, totalTasks = 11 }: ProgressBarProps) {
  const percentage = (currentTask / totalTasks) * 100;

  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

interface AutosaveIndicatorProps {
  isSaving?: boolean;
  lastSaved?: Date;
}

export function AutosaveIndicator({
  isSaving = false,
  lastSaved,
}: AutosaveIndicatorProps) {
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    if (isSaving) {
      setDisplayText('Saving...');
    } else if (lastSaved) {
      const diff = Math.floor(
        (Date.now() - lastSaved.getTime()) / 1000
      );
      if (diff < 60) {
        setDisplayText(`Saved ${diff}s ago`);
      } else {
        setDisplayText(
          `Saved at ${lastSaved.toLocaleTimeString()}`
        );
      }
    }
  }, [isSaving, lastSaved]);

  return (
    <div className="text-xs text-gray-500">
      {displayText && <span>{displayText}</span>}
    </div>
  );
}

interface TaskHeaderProps {
  taskNumber: number;
  title: string;
  description?: string;
  onRepeatInstruction?: () => void;
}

export function TaskHeader({
  taskNumber,
  title,
  description,
  onRepeatInstruction,
}: TaskHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold">
          Task {taskNumber}: {title}
        </h1>
        {onRepeatInstruction && (
          <button
            onClick={onRepeatInstruction}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Repeat Instructions
          </button>
        )}
      </div>
      {description && (
        <p className="text-gray-600 text-sm">{description}</p>
      )}
    </div>
  );
}
