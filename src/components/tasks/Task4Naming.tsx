'use client';

import { Task4Raw } from '@/lib/types';
import { useEffect, useMemo, useState } from 'react';
import { TextAnswer } from '@/components/inputs/FormInputs';
import { useTaskShell } from '@/components/common/TaskShell';

type AnimalPrompt = { promptId: string; image: string; name: string };

const MOCA_NAMING_SETS: Record<'8.1' | '8.2', AnimalPrompt[]> = {
  '8.1': [
    { promptId: 'animal_lion', image: '🦁', name: 'Lion' },
    { promptId: 'animal_rhino', image: '🦏', name: 'Rhinoceros' },
    { promptId: 'animal_camel', image: '🐪', name: 'Camel' },
  ],
  '8.2': [
    { promptId: 'animal_snake', image: '🐍', name: 'Snake' },
    { promptId: 'animal_elephant', image: '🐘', name: 'Elephant' },
    { promptId: 'animal_crocodile', image: '🐊', name: 'Crocodile' },
  ],
};

const ALL_PROMPTS = [...MOCA_NAMING_SETS['8.1'], ...MOCA_NAMING_SETS['8.2']];

function getConfiguredNamingVersion(): '8.1' | '8.2' {
  const envValue = (process.env.NEXT_PUBLIC_MOCA_NAMING_VERSION ?? '').trim();
  return envValue === '8.2' ? '8.2' : '8.1';
}

export function Task4Naming() {
  const { raw, setRaw, addEvent } = useTaskShell();
  const [answers, setAnswers] = useState<string[]>(['', '', '']);

  const byPromptId = useMemo(() => {
    const m = new Map<string, AnimalPrompt>();
    for (const a of ALL_PROMPTS) m.set(a.promptId, a);
    return m;
  }, []);

  const [selectedPrompts, setSelectedPrompts] = useState<AnimalPrompt[]>(() => MOCA_NAMING_SETS[getConfiguredNamingVersion()]);

  useEffect(() => {
    const naming = raw?.naming;
    if (!Array.isArray(naming) || naming.length === 0) return;

    const promptIds = naming.map((n: any) => String(n?.promptId ?? '')).filter(Boolean);
    if (promptIds.length) {
      const prompts: AnimalPrompt[] = promptIds.slice(0, 3).map((pid) => {
        const found = byPromptId.get(pid);
        if (found) return found;
        return { promptId: pid, image: '❓', name: pid };
      });
      while (prompts.length < 3) prompts.push({ promptId: `unknown_${prompts.length + 1}`, image: '❓', name: 'Unknown' });
      setSelectedPrompts(prompts);
    }

    const newAnswers = naming.slice(0, 3).map((n: any) => String(n?.answer ?? ''));
    while (newAnswers.length < 3) newAnswers.push('');
    setAnswers(newAnswers);
  }, [byPromptId, raw]);

  useEffect(() => {
    // Initialize prompt set once per session by persisting prompts into raw.
    const naming = raw?.naming;
    if (Array.isArray(naming) && naming.length >= 3) return;

    const version = getConfiguredNamingVersion();
    const picks = MOCA_NAMING_SETS[version];
    setSelectedPrompts(picks);
    setAnswers(['', '', '']);

    const nextRaw: Task4Raw = {
      naming: picks.map((p, i) => ({ item: i + 1, promptId: p.promptId, answer: '' })),
    };
    setRaw(nextRaw);
    addEvent({
      type: 'click',
      meta: {
        action: 'naming_prompts_selected',
        version,
        promptIds: picks.map((p) => p.promptId),
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addEvent, raw, setRaw]);

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);

    const newRaw: Task4Raw = {
      naming: selectedPrompts.slice(0, 3).map((animal, i) => ({
        item: i + 1,
        promptId: animal.promptId,
        answer: newAnswers[i] ?? '',
      })),
    };

    setRaw(newRaw);
    addEvent({
      type: 'input',
      meta: {
        field: `animal_${index + 1}`,
        value,
      },
    });
  };

  return (
    <div>
      <p className="text-gray-700 mb-6">
        Please name the following animals:
      </p>
      {selectedPrompts.slice(0, 3).map((animal, index) => (
        <div key={animal.promptId} className="mb-4 p-4 border border-gray-200 rounded">
          <div className="text-6xl mb-4 text-center">{animal.image}</div>
          <TextAnswer
            label={`Animal ${index + 1}`}
            value={answers[index]}
            onChange={(value) => handleAnswerChange(index, value)}
            placeholder="Enter animal name"
          />
        </div>
      ))}
    </div>
  );
}
