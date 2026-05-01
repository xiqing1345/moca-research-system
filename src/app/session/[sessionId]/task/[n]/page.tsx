'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TaskShell } from '@/components/common/TaskShell';
import { Task1TrailMaking } from '@/components/tasks/Task1TrailMaking';
import { Task2CopyDrawing } from '@/components/tasks/Task2CopyDrawing';
import { Task3ClockDrawing } from '@/components/tasks/Task3ClockDrawing';
import { Task4Naming } from '@/components/tasks/Task4Naming';
import { Task5MemoryImmediate } from '@/components/tasks/Task5MemoryImmediate';
import { Task6Attention } from '@/components/tasks/Task6Attention';
import { Task7SentenceRepetition } from '@/components/tasks/Task7SentenceRepetition';
import { Task8VerbalFluency } from '@/components/tasks/Task8VerbalFluency';
import { Task9Abstraction } from '@/components/tasks/Task9Abstraction';
import { Task10DelayedRecall } from '@/components/tasks/Task10DelayedRecall';
import { Task11Orientation } from '@/components/tasks/Task11Orientation';

const TASK_CONFIGS = {
  1: {
    title: 'Alternating Trail Making',
    description: 'Connect numbers and letters in alternating order (1-A-2-B...)',
    defaultNeedsReview: false,
  },
  2: {
    title: 'Copy Chair',
    description: 'Copy the target chair pattern on the same-size grid',
    defaultNeedsReview: true,
  },
  3: {
    title: 'Clock Drawing',
    description: 'Adjust the preset clock hands to show a specific time',
    defaultNeedsReview: true,
  },
  4: {
    title: 'Animal Naming',
    description: 'Name the animals shown',
    defaultNeedsReview: false,
  },
  5: {
    title: 'Memory (Immediate)',
    description: 'Memorize and repeat word lists',
    defaultNeedsReview: false,
  },
  6: {
    title: 'Attention',
    description: 'Perform various attention tasks',
    defaultNeedsReview: false,
  },
  7: {
    title: 'Sentence Repetition',
    description: 'Repeat sentences read aloud',
    defaultNeedsReview: true,
  },
  8: {
    title: 'Verbal Fluency',
    description: 'Name as many words as possible starting with a letter',
    defaultNeedsReview: false,
  },
  9: {
    title: 'Abstraction',
    description: 'Identify similarities between word pairs',
    defaultNeedsReview: true,
  },
  10: {
    title: 'Delayed Recall',
    description: 'Recall the words from the memory task',
    defaultNeedsReview: false,
  },
  11: {
    title: 'Orientation',
    description: 'Answer questions about date, time, and location',
    defaultNeedsReview: false,
  },
};

function getTaskComponent(taskNumber: number) {
  switch (taskNumber) {
    case 1:
      return <Task1TrailMaking />;
    case 2:
      return <Task2CopyDrawing />;
    case 3:
      return <Task3ClockDrawing />;
    case 4:
      return <Task4Naming />;
    case 5:
      return <Task5MemoryImmediate />;
    case 6:
      return <Task6Attention />;
    case 7:
      return <Task7SentenceRepetition />;
    case 8:
      return <Task8VerbalFluency />;
    case 9:
      return <Task9Abstraction />;
    case 10:
      return <Task10DelayedRecall />;
    case 11:
      return <Task11Orientation />;
    default:
      return <PlaceholderTask taskNumber={taskNumber} />;
  }
}

function PlaceholderTask({ taskNumber }: { taskNumber: number }) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
      <p className="text-yellow-900 font-semibold">
        Unknown task number: {taskNumber}.
      </p>
    </div>
  );
}

export default function TaskPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = params.sessionId as string;
  const taskNumber = parseInt(params.n as string);

  const debug = searchParams.get('debug') === '1';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [initialRaw, setInitialRaw] = useState<any>(null);
  const [initialEvents, setInitialEvents] = useState<any[]>([]);
  const [initialArtifacts, setInitialArtifacts] = useState<any>(undefined);
  const [initialStartedAt, setInitialStartedAt] = useState<string | undefined>(undefined);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}`);
        if (!response.ok) {
          setError('Failed to load session');
          return;
        }

        const data = await response.json();

        if (data.session?.status === 'submitted') {
          router.replace(`/session/${sessionId}/done`);
          return;
        }

        const currentTask = Math.min(Math.max(data.session?.currentTask ?? 1, 1), 11);

        if (taskNumber > 11) {
          router.replace(`/session/${sessionId}/done`);
          return;
        }

        if (!debug && currentTask !== taskNumber) {
          router.replace(`/session/${sessionId}/task/${currentTask}`);
          return;
        }

        const existingResponse = (data.session?.responses ?? []).find(
          (r: any) => r.taskNumber === taskNumber
        );

        if (existingResponse) {
          setInitialRaw(existingResponse.raw ?? null);
          setInitialEvents(existingResponse.events ?? []);
          setInitialArtifacts(existingResponse.artifacts ?? undefined);
          setInitialStartedAt(existingResponse.startedAt ?? undefined);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading session:', err);
        setError('Failed to load session');
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionId, taskNumber, router, debug]);

  const handleNext = () => {
    if (taskNumber === 11) {
      router.push(`/session/${sessionId}/submit${debug ? '?debug=1' : ''}`);
    } else {
      router.push(`/session/${sessionId}/task/${taskNumber + 1}${debug ? '?debug=1' : ''}`);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">{error}</div>;
  }

  const config = TASK_CONFIGS[taskNumber as keyof typeof TASK_CONFIGS];

  return (
    <TaskShell
      sessionId={sessionId}
      taskNumber={taskNumber}
      title={config.title}
      description={config.description}
      initialRaw={initialRaw}
      initialEvents={initialEvents as any}
      initialArtifacts={initialArtifacts}
      initialStartedAt={initialStartedAt}
      defaultNeedsReview={config.defaultNeedsReview}
      debugSkipSave={debug}
      onNext={handleNext}
    >
      {getTaskComponent(taskNumber)}
    </TaskShell>
  );
}
