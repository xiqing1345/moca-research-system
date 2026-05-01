'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { loadLocalSession, saveLocalSession } from '@/lib/utils/localSession';

export default function IntroPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [loading, setLoading] = useState(false);
  const [currentTask, setCurrentTask] = useState(1);

  useEffect(() => {
    const session = loadLocalSession(sessionId);
    if (!session) return;
    const nextTask = Math.min(Math.max(session.currentTask ?? 1, 1), 11) || 1;
    setCurrentTask(nextTask);
    if (session.status === 'submitted') {
      router.replace(`/session/${sessionId}/done`);
    }
    if (session.status === 'consent') {
      router.replace(`/session/${sessionId}/consent`);
    }
  }, [router, sessionId]);

  const handleStart = async () => {
    setLoading(true);
    // Update localStorage status.
    const session = loadLocalSession(sessionId);
    if (session) {
      saveLocalSession({
        ...session,
        status: 'task',
        currentTask: session.currentTask > 0 ? session.currentTask : 1,
      });
    }
    router.push(`/session/${sessionId}/task/${currentTask}`);
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Test Instructions</h1>

        <div className="space-y-6 mb-8">
          <section className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-3">Overview</h2>
            <p className="text-gray-700">
              This cognitive assessment contains 11 different tasks that evaluate
              various aspects of your cognitive function, including:
            </p>
            <ul className="list-disc list-inside mt-3 text-gray-700 space-y-2">
              <li>Visuospatial and executive function</li>
              <li>Naming and language abilities</li>
              <li>Attention and concentration</li>
              <li>Memory (both immediate and delayed)</li>
              <li>Orientation to time and place</li>
            </ul>
          </section>

          <section className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-3">Duration</h2>
            <p className="text-gray-700">
              The entire assessment should take approximately 10-15 minutes to complete.
            </p>
          </section>

          <section className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-3">Important Notes</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>You can repeat the instructions for each task once</li>
              <li>Your progress is automatically saved as you go</li>
              <li>You can come back to any point if you need to</li>
              <li>Please answer all questions to the best of your ability</li>
            </ul>
          </section>

          <section className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-3 text-yellow-900">Ready?</h2>
            <p className="text-yellow-900">
              Click the button below when you are ready to begin the assessment.
            </p>
          </section>
        </div>

        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold text-lg"
        >
          {loading ? 'Starting...' : currentTask > 1 ? `Continue from Task ${currentTask}` : 'Start Assessment'}
        </button>
      </div>
    </div>
  );
}
