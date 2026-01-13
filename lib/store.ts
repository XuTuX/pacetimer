import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createId } from './id';
import { PACETIME_STORAGE_VERSION, migratePacetimePersistedState } from './persist';
import { getStudyDateKey } from './studyDate';
import type { QuestionRecord, Segment, SegmentKind, Session, SessionMode, StudyStopwatch, Subject } from './types';

const LOCAL_USER_ID = 'local-user';

const DEFAULT_STOPWATCH: StudyStopwatch = {
    userId: LOCAL_USER_ID,
    isRunning: false,
    accumulatedMs: 0,
};

interface AppState {
    // Subjects
    subjects: Subject[];
    addSubject: (name: string) => void;
    updateSubject: (id: string, updates: Partial<Subject>) => void;
    deleteSubject: (id: string) => void;

    // Global Timer (Study Stopwatch)
    stopwatch: StudyStopwatch;
    stopwatchStudyDate: string;
    startStopwatch: () => void;
    pauseStopwatch: () => void;
    resetStopwatch: () => void;

    // Sessions / Segments (persisted)
    sessions: Session[];
    segments: Segment[];

    activeSessionId: string | null;
    activeSegmentId: string | null;

    startSession: (mode: SessionMode, opts?: { title?: string; mockExam?: NonNullable<Session['metadata']>['mockExam'] }) => string;
    endSession: () => void;
    startSegment: (input: { sessionId: string; subjectId: string; kind: SegmentKind; startedAt?: number }) => string;
    endSegment: (segmentId: string, endedAt?: number) => void;

    // Records
    questionRecords: QuestionRecord[];
    addQuestionRecord: (input: {
        sessionId: string;
        segmentId: string;
        subjectId: string;
        durationMs: number;
        startedAt: number;
        endedAt: number;
        source: QuestionRecord['source'];
    }) => QuestionRecord;
    addQuestionRecordForActiveSegment: (input: {
        durationMs: number;
        startedAt: number;
        endedAt: number;
        source: QuestionRecord['source'];
    }) => QuestionRecord | null;
    undoLastQuestionInSegment: (segmentId: string) => QuestionRecord | null;

    // Active State
    activeSubjectId: string | null;
    setActiveSubjectId: (id: string | null) => void;

    // Utils
    addAccumulatedMs: (ms: number) => void;
    clearAllData: () => void;

    // User Profile (Persisted)
    nickname: string | null;
    setNickname: (name: string | null) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
            // --- Subjects ---
            subjects: [],
            addSubject: (name) => {
                const newSubject: Subject = {
                    id: createId('subj'),
                    userId: LOCAL_USER_ID, // Update with real auth later
                    name,
                    order: get().subjects.length,
                    isArchived: false,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                };
                set((state) => ({ subjects: [...state.subjects, newSubject] }));
            },
            updateSubject: (id, updates) => {
                set((state) => ({
                    subjects: state.subjects.map((s) =>
                        s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s
                    ),
                }));
            },
            deleteSubject: (id) => {
                // Soft delete
                set((state) => ({
                    subjects: state.subjects.map((s) =>
                        s.id === id ? { ...s, isArchived: true, updatedAt: Date.now() } : s
                    ),
                }));
            },

            // --- Stopwatch ---
            stopwatch: DEFAULT_STOPWATCH,
            stopwatchStudyDate: getStudyDateKey(Date.now()),
            addAccumulatedMs: (ms) => {
                set((prev) => ({
                    stopwatch: {
                        ...prev.stopwatch,
                        accumulatedMs: prev.stopwatch.accumulatedMs + ms,
                    },
                }));
            },
            startStopwatch: () => {
                const state = get();
                if (state.stopwatch.isRunning) return;
                if (!state.activeSubjectId) return;

                const now = Date.now();
                const today = getStudyDateKey(now);
                const isNewStudyDay = state.stopwatchStudyDate !== today;

                // Ensure an active "problem-solving" session for today.
                const activeSession = state.activeSessionId ? state.sessions.find((s) => s.id === state.activeSessionId) : null;
                const needsNewSession = !activeSession || activeSession.mode !== 'problem-solving' || activeSession.endedAt || activeSession.studyDate !== today;

                let sessionId = activeSession?.id ?? null;

                if (needsNewSession) {
                    // Best-effort close any dangling session/segment.
                    if (activeSession && !activeSession.endedAt) {
                        set((prev) => ({
                            sessions: prev.sessions.map((s) => (s.id === activeSession.id ? { ...s, endedAt: now, updatedAt: now } : s)),
                        }));
                    }
                    if (state.activeSegmentId) {
                        set((prev) => ({
                            segments: prev.segments.map((seg) => (seg.id === state.activeSegmentId ? { ...seg, endedAt: now, updatedAt: now } : seg)),
                        }));
                    }

                    const newSession: Session = {
                        id: createId('sess'),
                        userId: LOCAL_USER_ID,
                        mode: 'problem-solving',
                        studyDate: today,
                        startedAt: now,
                        endedAt: undefined,
                        createdAt: now,
                        updatedAt: now,
                    };
                    sessionId = newSession.id;
                    set((prev) => ({
                        sessions: [newSession, ...prev.sessions],
                        activeSessionId: sessionId,
                        activeSegmentId: null,
                        stopwatch: isNewStudyDay ? { ...prev.stopwatch, accumulatedMs: 0 } : prev.stopwatch,
                        stopwatchStudyDate: today,
                    }));
                } else if (isNewStudyDay) {
                    set((prev) => ({
                        stopwatch: { ...prev.stopwatch, accumulatedMs: 0 },
                        stopwatchStudyDate: today,
                    }));
                }

                // Segment rule: every start after a stop/pause creates a new Segment.
                const segment: Segment = {
                    id: createId('seg'),
                    userId: LOCAL_USER_ID,
                    sessionId: sessionId!,
                    subjectId: state.activeSubjectId,
                    kind: 'study',
                    startedAt: now,
                    endedAt: undefined,
                    createdAt: now,
                    updatedAt: now,
                };

                set((prev) => ({
                    segments: [segment, ...prev.segments],
                    activeSegmentId: segment.id,
                    stopwatch: {
                        ...prev.stopwatch,
                        isRunning: true,
                        startedAt: now,
                    },
                    stopwatchStudyDate: today,
                }));
            },
            pauseStopwatch: () => {
                const state = get();
                const { stopwatch } = state;
                if (!stopwatch.isRunning || !stopwatch.startedAt) return;

                const now = Date.now();
                const elapsed = now - stopwatch.startedAt;
                const activeSegmentId = state.activeSegmentId;

                set((prev) => ({
                    stopwatch: {
                        ...prev.stopwatch,
                        isRunning: false,
                        startedAt: undefined,
                        accumulatedMs: prev.stopwatch.accumulatedMs + elapsed,
                    },
                    segments: activeSegmentId
                        ? prev.segments.map((seg) => (seg.id === activeSegmentId ? { ...seg, endedAt: now, updatedAt: now } : seg))
                        : prev.segments,
                    activeSegmentId: null,
                }));
            },
            resetStopwatch: () => {
                const now = Date.now();
                const state = get();
                if (state.activeSegmentId) {
                    set((prev) => ({
                        segments: prev.segments.map((seg) => (seg.id === state.activeSegmentId ? { ...seg, endedAt: now, updatedAt: now } : seg)),
                    }));
                }
                set({ stopwatch: DEFAULT_STOPWATCH, stopwatchStudyDate: getStudyDateKey(now), activeSegmentId: null, activeSessionId: null });
            },

            // --- Sessions / Segments ---
            sessions: [],
            segments: [],
            activeSessionId: null,
            activeSegmentId: null,
            startSession: (mode, opts) => {
                const now = Date.now();
                const newSession: Session = {
                    id: createId('sess'),
                    userId: LOCAL_USER_ID,
                    mode,
                    studyDate: getStudyDateKey(now),
                    title: opts?.title,
                    startedAt: now,
                    endedAt: undefined,
                    createdAt: now,
                    updatedAt: now,
                    metadata: opts?.mockExam ? { mockExam: opts.mockExam } : undefined,
                };
                set((prev) => ({
                    sessions: [newSession, ...prev.sessions],
                    activeSessionId: newSession.id,
                    activeSegmentId: null,
                }));
                return newSession.id;
            },
            endSession: () => {
                const state = get();
                const now = Date.now();
                const activeSessionId = state.activeSessionId;
                if (!activeSessionId) return;

                const session = state.sessions.find(s => s.id === activeSessionId);
                const elapsed = session ? now - session.startedAt : 0;

                set((prev) => ({
                    sessions: prev.sessions.map((s) => (s.id === activeSessionId ? { ...s, endedAt: now, updatedAt: now } : s)),
                    segments: prev.activeSegmentId
                        ? prev.segments.map((seg) => (seg.id === prev.activeSegmentId ? { ...seg, endedAt: now, updatedAt: now } : seg))
                        : prev.segments,
                    activeSessionId: null,
                    activeSegmentId: null,
                    // If it's a mock exam, add its duration to the global stopwatch accumulated time
                    stopwatch: (session?.mode === 'mock-exam')
                        ? { ...prev.stopwatch, accumulatedMs: prev.stopwatch.accumulatedMs + elapsed }
                        : prev.stopwatch
                }));
            },
            startSegment: ({ sessionId, subjectId, kind, startedAt }) => {
                const now = startedAt ?? Date.now();
                const segment: Segment = {
                    id: createId('seg'),
                    userId: LOCAL_USER_ID,
                    sessionId,
                    subjectId,
                    kind,
                    startedAt: now,
                    endedAt: undefined,
                    createdAt: now,
                    updatedAt: now,
                };
                set((prev) => ({
                    segments: [segment, ...prev.segments],
                    activeSegmentId: segment.id,
                }));
                return segment.id;
            },
            endSegment: (segmentId, endedAt) => {
                const now = endedAt ?? Date.now();
                set((prev) => ({
                    segments: prev.segments.map((seg) => (seg.id === segmentId ? { ...seg, endedAt: now, updatedAt: now } : seg)),
                    activeSegmentId: prev.activeSegmentId === segmentId ? null : prev.activeSegmentId,
                }));
            },

            // --- Records ---
            questionRecords: [],
            addQuestionRecord: ({ sessionId, segmentId, subjectId, durationMs, startedAt, endedAt, source }) => {
                const state = get();
                const nextNo =
                    state.questionRecords.reduce((acc, r) => (r.segmentId === segmentId ? acc + 1 : acc), 0) + 1;

                // Question rule: numbering resets per Segment and derives from record count (not max questionNo).
                const record: QuestionRecord = {
                    id: createId('qr'),
                    userId: LOCAL_USER_ID,
                    sessionId,
                    segmentId,
                    subjectId,
                    questionNo: nextNo,
                    durationMs,
                    startedAt,
                    endedAt,
                    source,
                };

                set((prev) => ({
                    questionRecords: [record, ...prev.questionRecords],
                }));
                return record;
            },
            addQuestionRecordForActiveSegment: ({ durationMs, startedAt, endedAt, source }) => {
                const state = get();
                if (!state.activeSessionId || !state.activeSegmentId || !state.activeSubjectId) return null;
                return get().addQuestionRecord({
                    sessionId: state.activeSessionId,
                    segmentId: state.activeSegmentId,
                    subjectId: state.activeSubjectId,
                    durationMs,
                    startedAt,
                    endedAt,
                    source,
                });
            },
            undoLastQuestionInSegment: (segmentId) => {
                const state = get();
                const idx = state.questionRecords.findIndex((r) => r.segmentId === segmentId);
                if (idx < 0) return null;
                const removed = state.questionRecords[idx];
                set((prev) => ({
                    questionRecords: prev.questionRecords.filter((_, i) => i !== idx),
                }));
                return removed;
            },

            // --- Active State ---
            activeSubjectId: null,
            setActiveSubjectId: (id) => {
                const state = get();
                if (state.activeSubjectId === id) return;
                const now = Date.now();

                // If switching while running, close current segment and start a new one under the new subject.
                if (state.stopwatch.isRunning && state.activeSegmentId) {
                    set((prev) => ({
                        segments: prev.segments.map((seg) => (seg.id === prev.activeSegmentId ? { ...seg, endedAt: now, updatedAt: now } : seg)),
                        activeSegmentId: null,
                    }));
                }

                set({ activeSubjectId: id });

                if (state.stopwatch.isRunning && id) {
                    const activeSession = state.activeSessionId ? state.sessions.find((s) => s.id === state.activeSessionId) : null;
                    if (activeSession && activeSession.mode === 'problem-solving' && !activeSession.endedAt) {
                        const newSeg: Segment = {
                            id: createId('seg'),
                            userId: LOCAL_USER_ID,
                            sessionId: activeSession.id,
                            subjectId: id,
                            kind: 'study',
                            startedAt: now,
                            endedAt: undefined,
                            createdAt: now,
                            updatedAt: now,
                        };
                        set((prev) => ({
                            segments: [newSeg, ...prev.segments],
                            activeSegmentId: newSeg.id,
                        }));
                    }
                }
            },
            clearAllData: () => {
                set({
                    subjects: [],
                    sessions: [],
                    segments: [],
                    questionRecords: [],
                    activeSessionId: null,
                    activeSegmentId: null,
                    activeSubjectId: null,
                    stopwatch: DEFAULT_STOPWATCH,
                    stopwatchStudyDate: getStudyDateKey(Date.now()),
                    nickname: null,
                });
            },

            // --- User Profile ---
            nickname: null,
            setNickname: (name) => set({ nickname: name }),
        }),
        {
            // AsyncStorage schema is versioned via `PACETIME_STORAGE_VERSION`.
            name: 'pacetime-storage',
            storage: createJSONStorage(() => AsyncStorage),
            version: PACETIME_STORAGE_VERSION,
            migrate: async (persisted, version) =>
                migratePacetimePersistedState({
                    persisted,
                    storedVersion: version,
                    localUserId: LOCAL_USER_ID,
                    defaultStopwatch: DEFAULT_STOPWATCH,
                }),
            // Clean up running timers/sessions when app restarts after force quit
            // IMPORTANT: Do NOT add downtime to accumulatedMs or use Date.now() for endedAt.
            // We simply reset the running state without calculating elapsed time.
            // The accumulatedMs retains the last persisted value before force quit.
            onRehydrateStorage: () => (state) => {
                if (!state) return;

                // If stopwatch was running, just reset the running state.
                // Do NOT add (now - startedAt) to accumulatedMs - that would include downtime!
                if (state.stopwatch.isRunning) {
                    state.stopwatch = {
                        ...state.stopwatch,
                        isRunning: false,
                        startedAt: undefined,
                        // accumulatedMs stays as-is (last value before force quit)
                    };
                }

                // Close dangling segments: set endedAt = startedAt (zero duration).
                // This ensures data integrity (no null endedAt rows) without adding downtime.
                if (state.activeSegmentId) {
                    state.segments = state.segments.map((seg) => {
                        if (seg.id === state.activeSegmentId && !seg.endedAt) {
                            // Use startedAt as endedAt → duration = 0 (safe, no downtime)
                            return { ...seg, endedAt: seg.startedAt, updatedAt: seg.startedAt };
                        }
                        return seg;
                    });
                    state.activeSegmentId = null;
                }

                // Close dangling sessions: set endedAt = startedAt (zero duration).
                if (state.activeSessionId) {
                    state.sessions = state.sessions.map((s) => {
                        if (s.id === state.activeSessionId && !s.endedAt) {
                            return { ...s, endedAt: s.startedAt, updatedAt: s.startedAt };
                        }
                        return s;
                    });
                    state.activeSessionId = null;
                }
            },
        }
    )
);
