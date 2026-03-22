'use client';

import { Task9Raw } from '@/lib/types';
import { useEffect, useState } from 'react';
import { TextAnswer } from '@/components/inputs/FormInputs';
import { useTaskShell } from '@/components/common/TaskShell';

export function Task9Abstraction() {
  const { raw, setRaw, addEvent } = useTaskShell();
  const [answers, setAnswers] = useState<string[]>(['', '']);

  const pairs = [
    { pair: 'train-bicycle' },
    { pair: 'watch-ruler' },
  ];

  useEffect(() => {
    if (raw?.abstraction) {
      const newAnswers = raw.abstraction.map((a: any) => a.answer);
      setAnswers(newAnswers);
    }
  }, [raw]);

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);

    const newRaw: Task9Raw = {
      abstraction: pairs.map((pair, i) => ({
        pair: pair.pair,
        answer: newAnswers[i],
      })),
    };

    setRaw(newRaw);
    addEvent({
      type: 'input',
      meta: {
        pair: pairs[index].pair,
        value,
      },
    });
  };

  return (
    <div>
      <p className="text-gray-700 mb-6">
        For each pair of words below, explain what they have in common:
      </p>

      {pairs.map((pair, index) => (
        <div key={index} className="mb-6 p-4 border border-gray-200 rounded">
          <h3 className="text-lg font-semibold mb-3">{pair.pair}</h3>
          <TextAnswer
            label={`What do "${pair.pair.split('-')[0]}" and "${pair.pair.split('-')[1]}" have in common?`}
            value={answers[index]}
            onChange={(value) => handleAnswerChange(index, value)}
            placeholder="Enter your answer"
            multiline
            rows={3}
          />
        </div>
      ))}
    </div>
  );
}
