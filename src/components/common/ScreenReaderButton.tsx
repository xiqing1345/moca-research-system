'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

function normalizeText(input: string) {
  return input.replace(/\s+/g, ' ').trim();
}

function isVisible(el: HTMLElement) {
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function collectReadableSegments() {
  const main = document.querySelector('main');
  const source = (main as HTMLElement | null) ?? document.body;

  const selectors = [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'li',
    'label',
    'legend',
    'blockquote',
    'td',
    'th',
    'figcaption',
  ].join(',');

  const nodes = Array.from(source.querySelectorAll<HTMLElement>(selectors)).filter((el) => {
    if (!isVisible(el)) return false;
    if (el.closest('[data-no-tts-reader="true"]')) return false;
    return true;
  });

  const segments = nodes
    .map((el) => ({ element: el, text: normalizeText(el.innerText || '') }))
    .filter((seg) => seg.text.length > 0);

  if (segments.length > 0) return segments;

  const fallbackText = normalizeText(source.innerText || '');
  if (!fallbackText) return [];
  return [{ element: source, text: fallbackText }];
}

type ReadSpeed = 'slow' | 'normal';

export function ScreenReaderButton() {
  const pathname = usePathname();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [engineInfo, setEngineInfo] = useState('');
  const [speed, setSpeed] = useState<ReadSpeed>('normal');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentUrlRef = useRef<string | null>(null);

  const stopReading = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current);
      currentUrlRef.current = null;
    }
    setIsSpeaking(false);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    return () => stopReading();
  }, [stopReading]);

  const startReading = useCallback(async () => {
    const segments = collectReadableSegments();
    if (segments.length === 0) {
      window.alert('No readable text found on this screen.');
      return;
    }

    const text = segments.map((s) => normalizeText(s.text)).join('\n').slice(0, 5000);
    if (!text) {
      window.alert('No readable text found on this screen.');
      return;
    }

    setIsLoading(true);
    setIsSpeaking(false);

    try {
      const response = await fetch('/api/research/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, speed }),
      });

      if (!response.ok) {
        throw new Error(`TTS failed (${response.status})`);
      }

      const model = response.headers.get('X-OpenAI-TTS-Model') || '';
      const voice = response.headers.get('X-OpenAI-TTS-Voice') || '';
      const info = [model, voice].filter(Boolean).join(' / ');
      setEngineInfo(info);
      if (info) {
        console.info(`TTS engine: ${info}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      if (currentUrlRef.current) {
        URL.revokeObjectURL(currentUrlRef.current);
      }
      currentUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setIsSpeaking(false);
      };
      audio.onerror = () => {
        setIsSpeaking(false);
      };

      setIsSpeaking(true);
      await audio.play();
    } catch (error) {
      console.error('TTS playback failed:', error);
      setIsSpeaking(false);
      window.alert('Text-to-speech is unavailable. Please check OPENAI_API_KEY on server.');
    } finally {
      setIsLoading(false);
    }
  }, [speed]);

  useEffect(() => {
    stopReading();
  }, [pathname, stopReading]);

  return (
    <>
      <div data-no-tts-reader="true" className="fixed right-4 bottom-4 z-50 rounded-xl bg-white/95 border border-gray-200 shadow-lg p-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSpeed('slow')}
            className={`px-3 py-2 rounded text-sm font-semibold border ${speed === 'slow' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            aria-pressed={speed === 'slow'}
            title="Read at slower speed"
          >
            Slow
          </button>
          <button
            type="button"
            onClick={() => setSpeed('normal')}
            className={`px-3 py-2 rounded text-sm font-semibold border ${speed === 'normal' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            aria-pressed={speed === 'normal'}
            title="Read at normal speed"
          >
            Normal
          </button>
          <button
            type="button"
            onClick={isSpeaking ? stopReading : startReading}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-base font-semibold hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            aria-label={isSpeaking ? 'Stop reading this screen' : 'Read this screen'}
            title={isSpeaking ? 'Stop reading' : 'Read this screen'}
          >
            {isLoading ? 'Loading Voice...' : isSpeaking ? 'Stop Reading' : 'Read Screen'}
          </button>
        </div>
        {engineInfo ? (
          <div className="mt-1 text-[11px] text-gray-500">Engine: {engineInfo}</div>
        ) : null}
      </div>
    </>
  );
}
