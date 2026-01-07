import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { QuestionRecord, Session, StudyStopwatch, Subject } from './types';

// Mock Data for initial dev (if needed) or empty defaults
const DEFAULT_STOPWATCH: StudyStopwatch = {
    userId: 'local-user', // replaced by Clerk ID later
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
    startStopwatch: () => void;
    pauseStopwatch: () => void;
    resetStopwatch: () => void;

    // Current Session (if any)
    currentSession: Session | null;
    startSession: (type: 'study' | 'exam', examId?: string) => void;
    endSession: () => void;

    // Records
    questionRecords: QuestionRecord[];
    addQuestionRecord: (record: QuestionRecord) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
            // --- Subjects ---
            subjects: [],
            addSubject: (name) => {
                const newSubject: Subject = {
                    id: Math.random().toString(36).substr(2, 9),
                    userId: 'local-user', // Update with real auth later
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
            startStopwatch: () => {
                const { stopwatch } = get();
                if (stopwatch.isRunning) return;
                set({
                    stopwatch: {
                        ...stopwatch,
                        isRunning: true,
                        startedAt: Date.now(),
                    },
                });
            },
            pauseStopwatch: () => {
                const { stopwatch } = get();
                if (!stopwatch.isRunning || !stopwatch.startedAt) return;
                const elapsed = Date.now() - stopwatch.startedAt;
                set({
                    stopwatch: {
                        ...stopwatch,
                        isRunning: false,
                        startedAt: undefined,
                        accumulatedMs: stopwatch.accumulatedMs + elapsed,
                    },
                });
            },
            resetStopwatch: () => {
                set({ stopwatch: DEFAULT_STOPWATCH });
            },

            // --- Session ---
            currentSession: null,
            startSession: (type, examId) => {
                const newSession: Session = {
                    id: Math.random().toString(36).substr(2, 9),
                    userId: 'local-user',
                    type,
                    startedAt: Date.now(),
                    examId, // Could serve as session ID or "Exam Instance ID"
                };
                set({ currentSession: newSession });
            },
            endSession: () => {
                set((state) => {
                    if (!state.currentSession) return {};
                    return {
                        currentSession: null,
                    };
                });
            },

            // --- Records ---
            questionRecords: [],
            addQuestionRecord: (record) => {
                set((state) => ({
                    questionRecords: [...state.questionRecords, record]
                }));
            },
        }),
        {
            name: 'pacetime-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
