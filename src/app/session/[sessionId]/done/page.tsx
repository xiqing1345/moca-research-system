'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function DonePage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

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
