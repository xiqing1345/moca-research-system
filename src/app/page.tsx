'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        router.push('/research');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-4xl font-bold mb-2 text-center">MoCA Study</h1>
        <p className="text-center text-gray-600 mb-8">
          Montreal Cognitive Assessment Online Platform
        </p>

        <div className="space-y-3 mb-6">
          <p className="text-sm text-gray-700">
            This platform enables researchers to conduct the Montreal Cognitive
            Assessment (MoCA) online, collecting comprehensive cognitive data for
            analysis and research purposes.
          </p>
        </div>

        <Link
          href="/session/join"
          className="block w-full px-6 py-3 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 font-semibold transition"
        >
          Start Assessment
        </Link>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Designed for research use only. All data is confidential.
          </p>
        </div>
      </div>
    </div>
  );
}
