export type Subject = {
    id: string;
    userId: string;
    name: string;
    order: number;
    isArchived: boolean;
    createdAt: number;
    updatedAt: number;
};

export type StudyStopwatch = {
    userId: string;
    isRunning: boolean;
    startedAt?: number; // timestamp when started/resumed
    accumulatedMs: number; // time stored before current start
};

export type SessionMode = 'problem-solving' | 'mock-exam';

export type Session = {
    id: string;
    userId: string;
    mode: SessionMode;
    studyDate: string; // YYYY-MM-DD (uses 11:57 "study day" boundary)
    title?: string;
    startedAt: number;
    endedAt?: number;
    createdAt: number;
    updatedAt: number;
    metadata?: {
        mockExam?: {
            subjectIds: string[];
            timeLimitSec: number;
            targetQuestions: number;
        };
    };
};

export type SegmentKind = 'study' | 'solve' | 'review';

export type Segment = {
    id: string;
    userId: string;
    sessionId: string;
    subjectId: string; // can be a real Subject id, or a special pseudo id like "__review__"
    kind: SegmentKind;
    startedAt: number;
    endedAt?: number;
    createdAt: number;
    updatedAt: number;
};

export type QuestionRecord = {
    id: string;
    userId: string;
    sessionId: string;
    segmentId: string;
    subjectId: string;
    questionNo: number; // resets per Segment (1..N)
    durationMs: number;
    startedAt: number;
    endedAt: number;
    source: 'tap' | 'finish' | 'manual';
};

export type Room = {
    id: string;
    title: string;
    createdBy: string;
    examId?: string;
    createdAt: number;
    participants: string[]; // userIds
};

export type ExamTemplate = {
    id: string;
    name: string; // e.g., "5급 공채 1차"
    subjectIds: string[]; // Default subjects included
    timeLimitMin: number; // e.g., 90
};
