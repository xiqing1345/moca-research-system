'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { TextAnswer } from '@/components/inputs/FormInputs';

export default function JoinPage() {
  const router = useRouter();
  const [participantCode, setParticipantCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async () => {
    if (!participantCode.trim()) {
      setError('Please enter a participant code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: participantCode.trim() }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const msg =
          (data && typeof data.error === 'string' && data.error) ||
          `Join failed (HTTP ${response.status})`;
        throw new Error(msg);
      }

      router.push(data.nextPath ?? `/session/${data.sessionId}/consent`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Failed to join.');
      console.error('Join failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold mb-2 text-center">MoCA Study</h1>
        <p className="text-gray-600 text-center mb-6">
          Montreal Cognitive Assessment Online Platform
        </p>

        <div className="mb-6">
          <TextAnswer
            label="Participant Code"
            value={participantCode}
            onChange={setParticipantCode}
            placeholder="Enter your participant code"
          />
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        <button
          onClick={handleJoin}
          disabled={loading}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
        >
          {loading ? 'Joining...' : 'Join Study'}
        </button>
      </div>
    </div>
  );
}
