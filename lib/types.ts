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

export type Session = {
    id: string;
    userId: string;
    type: 'study' | 'exam';
    startedAt: number;
    endedAt?: number;
    examId?: string; // If part of a mock exam
    roomId?: string; // If part of a room
};

export type QuestionRecord = {
    id: string;
    userId: string;
    sessionId: string;
    subjectId: string;
    questionNo: number;
    durationMs: number;
    startedAt: number;
    endedAt: number;
    source: 'tap';
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
