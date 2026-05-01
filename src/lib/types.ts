// ===============================
// Event System Types
// ===============================

export type EventType = 
  | "input" 
  | "click" 
  | "tap" 
  | "draw" 
  | "audio_start" 
  | "audio_stop" 
  | "repeat_instruction" 
  | "nav_blur" 
  | "nav_focus" 
  | "raw_update" 
  | "submit";

export interface TaskEvent {
  type: EventType;
  taskNumber: number;
  t: number; // timestamp in ms
  meta?: Record<string, any>;
}

// ===============================
// Artifact Types
// ===============================

export interface ArtifactFile {
  kind: "png" | "audio" | "json" | "other";
  path: string;
  mime: string;
  size: number;
  createdAt: string;
}

export interface Artifacts {
  files: ArtifactFile[];
}

// ===============================
// Task-Specific Raw Data Types
// ===============================

// Task 1 - Alternating Trail Making
export interface Task1Raw {
  trail: {
    mode: "click_connect";
    sequence: string[];
    layout: string[];
    userPath: string[];
    errors: Array<{
      kind: "wrong_next";
      at: string;
      expected: string;
    }>;
    completed: boolean;
  };
}

// Task 2 - Copy Cube/Chair
export interface Task2Raw {
  copyGrid?: {
    mode: "grid_copy";
    size: number;
    prompt: {
      kind: "chair";
      chairId: string;
    };
    targetCells: string[];
    userCells: string[];
    stats?: {
      overlap: number;
      precision: number;
      recall: number;
      f1: number;
    };
  };
  // Legacy fallback for old records.
  drawing?: {
    tool: "canvas";
    prompt?: {
      kind: 'chair';
      chairId: string;
      chairPath: string;
    };
    strokes: Array<{
      id: string;
      points: Array<{
        x: number;
        y: number;
        t: number;
      }>;
    }>;
  };
}

// Task 3 - Clock Drawing
export interface Task3Raw {
  clock: {
    mode?: "set_hands" | "draw";
    // New mode: preset clock face, user adjusts hand positions.
    answer?: {
      hour: number;   // 1-12
      minute: number; // 0-59
    };
    // Legacy fallback: old free-draw clock data.
    strokes?: Array<{
      id: string;
      points: Array<{
        x: number;
        y: number;
        t: number;
      }>;
    }>;
    targetTime: string;
  };
}

// Task 4 - Naming
export interface Task4Raw {
  naming: Array<{
    item: number;
    promptId: string;
    answer: string;
  }>;
}

// Task 5 - Memory (Immediate)
export interface Task5Raw {
  memoryImmediate: {
    wordListId: string;
    phase?: "study" | "trial1" | "trial2";
    trial1: string[];
    trial2: string[];
    presentedAt: string;
  };
}

// Task 6 - Attention
export interface Task6Raw {
  attention: {
    digitForward: {
      prompt: number[];
      answer: number[];
      correct: boolean;
    };
    digitBackward: {
      prompt: number[];
      answer: number[];
      correct: boolean;
    };
    vigilance: {
      sequence: string[];
      taps: Array<{ t: number; index?: number; letter?: string; rtMs?: number }>;
      presentations?: Array<{
        index: number;
        letter: string;
        onsetMs: number;
        tapMs?: number;
        rtMs?: number;
      }>;
      errors: {
        falseTap: number;
        miss: number;
      };
    };
    serial7: {
      start: number;
      answers: number[];
    };
  };
}

// Task 7 - Sentence Repetition
export interface Task7Raw {
  sentenceRepetition: Array<{
    item: number;
    audio: {
      recorded: boolean;
      // Optional uploaded artifact metadata (stored in artifacts as well)
      file?: ArtifactFile & { meta?: Record<string, any> };
    };
    transcript?: {
      text: string;
      confidence?: number;
      engine: "webspeech" | "other";
      updatedAt: string;
    };
  }>;
}

// Task 8 - Verbal Fluency
export interface Task8Raw {
  fluency: {
    letter: string;
    durationSec: number;
    words: Array<{
      w: string;
      t: number;
    }>;
    uniqueCount: number;
  };
}

// Task 9 - Abstraction
export interface Task9Raw {
  abstraction: Array<{
    pair: string;
    answer: string;
  }>;
}

// Task 10 - Delayed Recall
export interface Task10Raw {
  delayedRecall: {
    targetWords: string[];
    freeRecall: string[];
    cues: Array<{
      word: string;
      categoryCue: string;
      recalledWith: "category" | "mc" | "missed";
    }>;
    mis: {
      free: number;
      category: number;
      mc: number;
      score: number;
    };
  };
}

// Task 11 - Orientation
export interface Task11Raw {
  orientation: {
    year: string;
    month: string;
    date: string;
    dayOfWeek: string;
    place: string;
    city: string;
  };
}

// Union type for all task raw data
export type TaskRaw =
  | Task1Raw
  | Task2Raw
  | Task3Raw
  | Task4Raw
  | Task5Raw
  | Task6Raw
  | Task7Raw
  | Task8Raw
  | Task9Raw
  | Task10Raw
  | Task11Raw;

// ===============================
// Session Types
// ===============================

export interface SessionState {
  id: string;
  participantId: string;
  status: "consent" | "intro" | "task" | "submitted";
  currentTask: number;
  consentedAt?: Date;
  educationYears?: number;
  startedAt: Date;
  submittedAt?: Date;
}

// ===============================
// API Request/Response Types
// ===============================

export interface SaveTaskRequest {
  taskNumber: number;
  startedAt?: string;
  endedAt?: string;
  raw?: Record<string, any>;
  events?: TaskEvent[];
  artifacts?: Artifacts;
  autoScore?: number;
  needsReview?: boolean;
  currentTask?: number;
}

export interface SubmitSessionRequest {
  submittedAt: string;
}
