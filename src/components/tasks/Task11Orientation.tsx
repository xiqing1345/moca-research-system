'use client';

import { Task11Raw } from '@/lib/types';
import { useEffect, useState } from 'react';
import { TextAnswer } from '@/components/inputs/FormInputs';
import { useTaskShell } from '@/components/common/TaskShell';

export function Task11Orientation() {
  const { raw, setRaw, addEvent } = useTaskShell();
  const [orientation, setOrientation] = useState({
    year: '',
    month: '',
    date: '',
    dayOfWeek: '',
    place: '',
    city: '',
  });

  useEffect(() => {
    if (raw?.orientation) {
      setOrientation(raw.orientation);
    }
  }, [raw]);

  const handleChange = (field: string, value: string) => {
    const newOrientation = { ...orientation, [field]: value };
    setOrientation(newOrientation);

    const newRaw: Task11Raw = {
      orientation: newOrientation,
    };

    setRaw(newRaw);
    addEvent({
      type: 'input',
      meta: {
        field,
        value,
      },
    });
  };

  return (
    <div>
      <p className="text-gray-700 mb-6">
        Please answer the following questions about today's date and location:
      </p>

      <div className="space-y-4">
        <TextAnswer
          label="What is the year?"
          value={orientation.year}
          onChange={(value) => handleChange('year', value)}
          placeholder="e.g., 2026"
        />

        <TextAnswer
          label="What is the month?"
          value={orientation.month}
          onChange={(value) => handleChange('month', value)}
          placeholder="e.g., February"
        />

        <TextAnswer
          label="What is the date?"
          value={orientation.date}
          onChange={(value) => handleChange('date', value)}
          placeholder="e.g., 26"
        />

        <TextAnswer
          label="What day of the week is it?"
          value={orientation.dayOfWeek}
          onChange={(value) => handleChange('dayOfWeek', value)}
          placeholder="e.g., Thursday"
        />

        <TextAnswer
          label="What is this place?"
          value={orientation.place}
          onChange={(value) => handleChange('place', value)}
          placeholder="e.g., Lab"
        />

        <TextAnswer
          label="What city are we in?"
          value={orientation.city}
          onChange={(value) => handleChange('city', value)}
          placeholder="e.g., Elizabeth"
        />
      </div>
    </div>
  );
}
