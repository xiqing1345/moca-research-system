'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';
import { NumberInput } from '@/components/inputs/FormInputs';
import { loadLocalSession, saveLocalSession } from '@/lib/utils/localSession';

export default function ConsentPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [consent, setConsent] = useState(false);
  const [educationYears, setEducationYears] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!consent) {
      setError('You must agree to participate');
      return;
    }

    if (educationYears === null) {
      setError('Please enter the number of education years');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Save consent data to localStorage.
      const session = loadLocalSession(sessionId);
      if (session) {
        saveLocalSession({
          ...session,
          educationYears,
          consentedAt: new Date().toISOString(),
          status: 'intro',
        });
      }

      // Fire-and-forget API call (no-op on server).
      fetch(`/api/sessions/${sessionId}/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentedAt: new Date().toISOString(), educationYears }),
      }).catch(() => {});

      router.push(`/session/${sessionId}/intro`);
    } catch (err) {
      setError('Failed to submit. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Informed Consent</h1>

        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-4">Study Information</h2>
          <div className="space-y-4 text-sm text-gray-700">
            <p>
              You are being invited to participate in a research study on cognitive
              assessment. This study aims to collect data on your cognitive abilities
              using the Montreal Cognitive Assessment (MoCA).
            </p>
            <p>
              The assessment will take approximately 10-15 minutes to complete. You
              will be presented with 11 different tasks that test various cognitive
              skills including memory, attention, and language.
            </p>
            <p>
              Your participation is entirely voluntary. You may withdraw at any time
              without penalty. All responses will be kept confidential and anonymous.
            </p>
            <p>
              If you have any questions about this study, please contact the research team.
            </p>
          </div>
        </div>

        <div className="mb-6">
          <label className="flex items-start cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 mr-3 w-4 h-4"
            />
            <span className="text-sm text-gray-700">
              I have read and understood the information above, and I voluntarily
              agree to participate in this research study.
            </span>
          </label>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Years of Education (required)
          </label>
          <NumberInput
            label=""
            value={educationYears}
            onChange={setEducationYears}
            placeholder="e.g., 16"
          />
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading || !consent}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
        >
          {loading ? 'Submitting...' : 'I Agree & Continue'}
        </button>
      </div>
    </div>
  );
}
