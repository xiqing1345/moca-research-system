'use client';

import { useState } from 'react';
import { useSpeechRecognition } from '@/lib/hooks/useSpeechRecognition';

interface TextAnswerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  normalizeSpokenNumbers?: boolean;
}

export function TextAnswer({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  rows = 4,
  normalizeSpokenNumbers = true,
}: TextAnswerProps) {
  const [interimTranscript, setInterimTranscript] = useState('');

  const { isListening, isSupported, startListening, stopListening } = useSpeechRecognition({
    language: 'en-US',
    normalizeSpokenNumbers,
    onResult: (text: string) => {
      onChange(value ? value + ' ' + text : text);
      setInterimTranscript('');
    },
    onInterim: (text: string) => {
      setInterimTranscript(text);
    },
    onError: (error: string) => {
      console.error('Speech recognition error:', error);
    },
  });

  const handleSpeechToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        {isSupported && (
          <button
            type="button"
            onClick={handleSpeechToggle}
            className={`ml-2 px-3 py-1 rounded text-sm font-medium transition-colors ${
              isListening
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
            title={isListening ? 'Stop recording' : 'Start recording'}
          >
            {isListening ? '⏹ Stop' : '🎤 Voice'}
          </button>
        )}
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
      {isListening && interimTranscript && (
        <p className="mt-2 text-sm text-gray-500 italic">Listening: {interimTranscript}</p>
      )}
    </div>
  );
}

interface MultipleChoiceProps {
  label: string;
  options: string[];
  selected: string | null;
  onChange: (value: string) => void;
}

export function MultipleChoice({
  label,
  options,
  selected,
  onChange,
}: MultipleChoiceProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="space-y-2">
        {options.map((option) => (
          <label key={option} className="flex items-center">
            <input
              type="radio"
              name={label}
              value={option}
              checked={selected === option}
              onChange={(e) => onChange(e.target.value)}
              className="mr-2"
            />
            {option}
          </label>
        ))}
      </div>
    </div>
  );
}

interface CheckboxGroupProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}

export function CheckboxGroup({
  label,
  options,
  selected,
  onChange,
}: CheckboxGroupProps) {
  const handleChange = (option: string, checked: boolean) => {
    if (checked) {
      onChange([...selected, option]);
    } else {
      onChange(selected.filter((s) => s !== option));
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="space-y-2">
        {options.map((option) => (
          <label key={option} className="flex items-center">
            <input
              type="checkbox"
              value={option}
              checked={selected.includes(option)}
              onChange={(e) => handleChange(option, e.target.checked)}
              className="mr-2"
            />
            {option}
          </label>
        ))}
      </div>
    </div>
  );
}

interface NumberInputProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  placeholder?: string;
}

export function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  placeholder,
}: NumberInputProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) =>
          onChange(e.target.value ? parseInt(e.target.value) : null)
        }
        min={min}
        max={max}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
