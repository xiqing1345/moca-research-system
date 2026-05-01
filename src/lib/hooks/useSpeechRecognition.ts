'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const getSpeechRecognition = () => {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
};

interface UseSpeechRecognitionOptions {
  language?: string;
  onResult?: (text: string) => void;
  onInterim?: (text: string) => void;
  onError?: (error: string) => void;
  normalizeSpokenNumbers?: boolean;
}

const SPOKEN_DIGIT_MAP: Record<string, string> = {
  zero: '0',
  oh: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
};

function normalizeSpokenDigits(text: string) {
  return text.replace(/\b(zero|oh|one|two|three|four|five|six|seven|eight|nine)\b/gi, (match) => {
    return SPOKEN_DIGIT_MAP[match.toLowerCase()] ?? match;
  });
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const {
    language = 'en-US',
    onResult,
    onInterim,
    onError,
    normalizeSpokenNumbers = false,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef<typeof onResult>(onResult);
  const onInterimRef = useRef<typeof onInterim>(onInterim);
  const onErrorRef = useRef<typeof onError>(onError);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onInterimRef.current = onInterim;
  }, [onInterim]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.language = language;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      const nextInterim = normalizeSpokenNumbers
        ? normalizeSpokenDigits(interimTranscript)
        : interimTranscript;

      const nextFinal = normalizeSpokenNumbers
        ? normalizeSpokenDigits(finalTranscript.trim())
        : finalTranscript.trim();

      if (nextInterim) {
        onInterimRef.current?.(nextInterim);
      }

      if (nextFinal) {
        onResultRef.current?.(nextFinal);
      }
    };

    recognition.onerror = (event: any) => {
      onErrorRef.current?.(event.error);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language, normalizeSpokenNumbers]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        onErrorRef.current?.(error instanceof Error ? error.message : 'Failed to start speech recognition');
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        onErrorRef.current?.(error instanceof Error ? error.message : 'Failed to stop speech recognition');
      }
    }
  }, []);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
  };
}
