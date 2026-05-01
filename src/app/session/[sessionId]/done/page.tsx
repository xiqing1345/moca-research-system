'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type RecommendedGame = {
  id: string;
  name: string;
  tier: 'A' | 'B' | 'C';
  mocaRange: string;
  description: string;
  flow: string;
};

type TierRecommendation = {
  tier: 'A' | 'B' | 'C';
  mocaRange: string;
  rationale: string;
  games: RecommendedGame[];
};

export default function DonePage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [adviceError, setAdviceError] = useState('');
  const [advice, setAdvice] = useState('');
  const [recommendation, setRecommendation] = useState<TierRecommendation | null>(null);
  const [totalScore, setTotalScore] = useState<number | null>(null);

  const handleGetAdvice = useCallback(async () => {
    setLoadingAdvice(true);
    setAdviceError('');

    try {
      const response = await fetch(`/api/sessions/${sessionId}/advice`, {
        method: 'POST',
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          (data && typeof data.error === 'string' && data.error) ||
          `Failed to generate advice (HTTP ${response.status})`;
        throw new Error(message);
      }

      const adviceText = data && typeof data.advice === 'string' ? data.advice : '';
      if (!adviceText) {
        throw new Error('AI returned empty advice');
      }

      setAdvice(adviceText);
      setRecommendation(data?.recommendation ?? null);
      setTotalScore(typeof data?.totalScore === 'number' ? data.totalScore : null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate advice';
      setAdviceError(message);
    } finally {
      setLoadingAdvice(false);
    }
  }, [sessionId]);

  useEffect(() => {
    // Auto-generate recommendation on completion page load.
    handleGetAdvice();
  }, [handleGetAdvice]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-3xl font-bold mb-2">Thank You!</h1>
        <p className="text-gray-600 mb-6">
          Your assessment has been successfully submitted. We appreciate your
          participation in this research.
        </p>

        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <p className="text-sm text-gray-700">
            Your responses have been securely saved and will be reviewed by our
            research team.
          </p>
        </div>

        <a
          href={`/api/sessions/${sessionId}/report`}
          className="inline-block w-full mb-3 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold"
        >
          Download My Report
        </a>

        <button
          type="button"
          onClick={handleGetAdvice}
          disabled={loadingAdvice}
          className="inline-block w-full mb-3 px-6 py-3 bg-cyan-700 text-white rounded-lg hover:bg-cyan-800 disabled:bg-gray-400 font-semibold"
        >
          {loadingAdvice ? 'Generating AI Suggestions...' : 'Regenerate ChatGPT Suggestions'}
        </button>

        {adviceError && (
          <div className="mb-3 rounded border border-red-300 bg-red-50 p-3 text-left text-sm text-red-700">
            {adviceError}
          </div>
        )}

        {advice && (
          <div className="mb-3 rounded border border-cyan-200 bg-cyan-50 p-3 text-left">
            <h2 className="mb-2 text-sm font-semibold text-cyan-900">ChatGPT Suggestions</h2>
            <pre className="whitespace-pre-wrap text-sm text-cyan-900 font-sans">{advice}</pre>
          </div>
        )}

        {recommendation && (
          <div className="mb-3 rounded border border-indigo-200 bg-indigo-50 p-3 text-left">
            <h2 className="mb-2 text-sm font-semibold text-indigo-900">Recommended Training Games</h2>
            <p className="mb-2 text-sm text-indigo-900">
              {totalScore !== null ? `MoCA score: ${totalScore}. ` : ''}
              Tier {recommendation.tier} ({recommendation.mocaRange})
            </p>
            <p className="mb-3 text-xs text-indigo-800">{recommendation.rationale}</p>
            <div className="space-y-2">
              {recommendation.games.map((game) => (
                <div key={game.id} className="rounded border border-indigo-100 bg-white p-2">
                  <p className="text-sm font-semibold text-indigo-900">{game.name}</p>
                  <p className="text-xs text-indigo-800">{game.description}</p>
                  <p className="mt-1 text-xs text-indigo-700">Flow: {game.flow}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <Link
          href="/session/join"
          className="inline-block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
        >
          Return to Start
        </Link>
      </div>
    </div>
  );
}
