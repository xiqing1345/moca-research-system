'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SubmitPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/sessions/${sessionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submittedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit');
      }

      router.push(`/session/${sessionId}/done`);
    } catch (err) {
      console.error('Error submitting:', err);
      setError('Failed to submit. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-6 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="bg-gray-50 p-6 rounded-lg text-center">
          <h1 className="text-2xl font-bold mb-4">Assessment Complete</h1>
          <p className="text-gray-700 mb-6">
            You have completed all 11 tasks. Click the button below to submit
            your responses.
          </p>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold"
          >
            {loading ? 'Submitting...' : 'Submit Assessment'}
          </button>
        </div>
      </div>
    </div>
  );
}
