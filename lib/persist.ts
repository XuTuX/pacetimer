import AsyncStorage from '@react-native-async-storage/async-storage';
import { createId } from './id';
import { getStudyDateKey } from './studyDate';
import type { QuestionRecord, Segment, SegmentKind, Session, SessionMode, StudyStopwatch, Subject } from './types';

// Storage migration helpers for Zustand persist (`pacetime-storage`).
// v2 introduces Sessions + Segments and fixes question numbering by resetting per Segment.
export const PACETIME_STORAGE_VERSION = 2;

const LEGACY_EXAM_SESSIONS_KEY = '@pacetime_sessions';

type LegacyQuestionRecord = {
    id: string;
    userId: string;
    sessionId: string;
    subjectId: string;
    questionNo: number;
    durationMs: number;
    startedAt: number;
    endedAt: number;
    source: 'tap' | 'finish' | 'manual';
};

type LegacyPersistedStateV0 = {
    subjects?: Subject[];
    stopwatch?: StudyStopwatch;
    questionRecords?: LegacyQuestionRecord[];
    activeSubjectId?: string | null;
};

type LegacyExamSession = {
    id: string;
    title: string;
    categoryName: string;
    categoryId: string;
    date: string; // ISO string
    totalQuestions: number;
    totalSeconds: number;
    targetSeconds: number;
    laps: Array<{ questionNo: number; duration: number }>;
};

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function detectLegacyMode(record: LegacyQuestionRecord): SessionMode {
    const id = (record.sessionId || '').toLowerCase();
    if (id.includes('exam')) return 'mock-exam';
    return 'problem-solving';
}

function sortByStartedAtAsc<T extends { startedAt: number }>(a: T, b: T) {
    return a.startedAt - b.startedAt;
}

function clampNumber(value: unknown, fallback: number): number {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function normalizeLegacyQuestionRecords(records: LegacyQuestionRecord[], localUserId: string): LegacyQuestionRecord[] {
    return records
        .filter((r) => isObject(r))
        .map((r) => ({
            id: String(r.id ?? createId('qr')),
            userId: String(r.userId ?? localUserId),
            sessionId: String(r.sessionId ?? 'legacy'),
            subjectId: String(r.subjectId ?? 'unknown'),
            questionNo: clampNumber((r as any).questionNo, 1),
            durationMs: clampNumber((r as any).durationMs, 0),
            startedAt: clampNumber((r as any).startedAt, Date.now()),
            endedAt: clampNumber((r as any).endedAt, clampNumber((r as any).startedAt, Date.now())),
            source: (r as any).source === 'finish' || (r as any).source === 'manual' ? (r as any).source : 'tap',
        }))
        .sort(sortByStartedAtAsc);
}

function buildSessionsFromLegacyQuestionRecords(input: {
    records: LegacyQuestionRecord[];
    localUserId: string;
}): { sessions: Session[]; segments: Segment[]; questionRecords: QuestionRecord[] } {
    const { records, localUserId } = input;

    const NEW_SESSION_GAP_MS = 90 * 60 * 1000;
    const NEW_SEGMENT_GAP_MS = 12 * 60 * 1000;

    const sessions: Session[] = [];
    const segments: Segment[] = [];
    const questionRecords: QuestionRecord[] = [];

    let activeSessionId: string | null = null;
    let activeSegmentId: string | null = null;

    let lastRecord: LegacyQuestionRecord | null = null;
    let currentSessionMode: SessionMode | null = null;
    let currentStudyDate: string | null = null;
    let currentSegmentSubjectId: string | null = null;
    let currentSegmentQuestionNo = 0;
    let lastLegacyQuestionNo = 0;

    for (const r of records) {
        const mode = detectLegacyMode(r);
        const studyDate = getStudyDateKey(r.startedAt);

        const shouldStartNewSession =
            !activeSessionId ||
            !lastRecord ||
            mode !== currentSessionMode ||
            studyDate !== currentStudyDate ||
            r.startedAt - lastRecord.endedAt > NEW_SESSION_GAP_MS;

        if (shouldStartNewSession) {
            const now = r.startedAt;
            const sessionId = createId('sess');
            sessions.push({
                id: sessionId,
                userId: r.userId || localUserId,
                mode,
                studyDate,
                title: mode === 'mock-exam' ? '모의고사(이전 데이터)' : undefined,
                startedAt: now,
                endedAt: undefined,
                createdAt: now,
                updatedAt: now,
            });
            activeSessionId = sessionId;
            currentSessionMode = mode;
            currentStudyDate = studyDate;
            activeSegmentId = null;
            currentSegmentSubjectId = null;
            currentSegmentQuestionNo = 0;
            lastLegacyQuestionNo = 0;
        }

        const shouldStartNewSegment =
            !activeSegmentId ||
            !lastRecord ||
            r.subjectId !== currentSegmentSubjectId ||
            r.startedAt - lastRecord.endedAt > NEW_SEGMENT_GAP_MS ||
            (r.questionNo <= lastLegacyQuestionNo && lastLegacyQuestionNo > 0);

        if (shouldStartNewSegment) {
            const now = r.startedAt;
            const segmentId = createId('seg');
            segments.push({
                id: segmentId,
                userId: r.userId || localUserId,
                sessionId: activeSessionId!,
                subjectId: r.subjectId,
                kind: mode === 'mock-exam' ? 'solve' : 'study',
                startedAt: now,
                endedAt: undefined,
                createdAt: now,
                updatedAt: now,
            });
            activeSegmentId = segmentId;
            currentSegmentSubjectId = r.subjectId;
            currentSegmentQuestionNo = 0;
        }

        currentSegmentQuestionNo += 1;
        lastLegacyQuestionNo = r.questionNo;

        questionRecords.push({
            id: r.id,
            userId: r.userId || localUserId,
            sessionId: activeSessionId!,
            segmentId: activeSegmentId!,
            subjectId: r.subjectId,
            questionNo: currentSegmentQuestionNo,
            durationMs: r.durationMs,
            startedAt: r.startedAt,
            endedAt: r.endedAt,
            source: r.source,
        });

        lastRecord = r;
    }

    // Best-effort close times based on last record in each segment/session.
    const lastBySegment: Record<string, number> = {};
    for (const qr of questionRecords) lastBySegment[qr.segmentId] = Math.max(lastBySegment[qr.segmentId] ?? 0, qr.endedAt);
    const lastBySession: Record<string, number> = {};
    for (const seg of segments) {
        const endedAt = lastBySegment[seg.id];
        if (endedAt) seg.endedAt = endedAt;
        lastBySession[seg.sessionId] = Math.max(lastBySession[seg.sessionId] ?? 0, endedAt ?? seg.startedAt);
    }
    for (const sess of sessions) {
        const endedAt = lastBySession[sess.id];
        if (endedAt) sess.endedAt = endedAt;
        sess.updatedAt = endedAt || sess.updatedAt;
    }

    // Keep newest-first ordering for list screens.
    sessions.sort((a, b) => b.startedAt - a.startedAt);
    segments.sort((a, b) => b.startedAt - a.startedAt);
    questionRecords.sort((a, b) => b.startedAt - a.startedAt);

    return { sessions, segments, questionRecords };
}

async function migrateLegacyExamSessions(input: { localUserId: string }): Promise<{ sessions: Session[]; segments: Segment[]; questionRecords: QuestionRecord[] }> {
    const { localUserId } = input;
    try {
        const raw = await AsyncStorage.getItem(LEGACY_EXAM_SESSIONS_KEY);
        if (!raw) return { sessions: [], segments: [], questionRecords: [] };
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return { sessions: [], segments: [], questionRecords: [] };

        const legacySessions: LegacyExamSession[] = parsed;
        const sessions: Session[] = [];
        const segments: Segment[] = [];
        const questionRecords: QuestionRecord[] = [];

        for (const s of legacySessions) {
            if (!isObject(s)) continue;
            const endMs = Date.parse(String((s as any).date));
            if (!Number.isFinite(endMs)) continue;
            const totalSeconds = clampNumber((s as any).totalSeconds, 0);
            const startMs = endMs - totalSeconds * 1000;
            const now = startMs;

            const sessionId = createId('sess');
            const studyDate = getStudyDateKey(endMs);
            sessions.push({
                id: sessionId,
                userId: localUserId,
                mode: 'mock-exam',
                studyDate,
                title: String((s as any).title ?? '모의고사(이전 데이터)'),
                startedAt: startMs,
                endedAt: endMs,
                createdAt: now,
                updatedAt: endMs,
                metadata: {
                    mockExam: {
                        subjectIds: [],
                        timeLimitSec: clampNumber((s as any).targetSeconds, totalSeconds),
                        targetQuestions: clampNumber((s as any).totalQuestions, 0),
                    },
                },
            });

            const segmentId = createId('seg');
            const subjectId = `__legacy_category__:${String((s as any).categoryId ?? 'legacy')}`;
            segments.push({
                id: segmentId,
                userId: localUserId,
                sessionId,
                subjectId,
                kind: 'solve',
                startedAt: startMs,
                endedAt: endMs,
                createdAt: now,
                updatedAt: endMs,
            });

            const laps = Array.isArray((s as any).laps) ? (s as any).laps : [];
            let cursor = startMs;
            let qNo = 0;
            for (const lap of laps) {
                if (!isObject(lap)) continue;
                const durationSec = clampNumber((lap as any).duration, 0);
                const durationMs = Math.max(0, durationSec * 1000);
                const startedAt = cursor;
                const endedAt = cursor + durationMs;
                cursor = endedAt;
                qNo += 1;
                questionRecords.push({
                    id: createId('qr'),
                    userId: localUserId,
                    sessionId,
                    segmentId,
                    subjectId,
                    questionNo: qNo,
                    durationMs,
                    startedAt,
                    endedAt,
                    source: 'tap',
                });
            }
        }

        // Prevent double-import if something bumps versions again.
        await AsyncStorage.removeItem(LEGACY_EXAM_SESSIONS_KEY);
        return { sessions, segments, questionRecords };
    } catch {
        return { sessions: [], segments: [], questionRecords: [] };
    }
}

export async function migratePacetimePersistedState(input: {
    persisted: unknown;
    storedVersion: number;
    localUserId: string;
    defaultStopwatch: StudyStopwatch;
}): Promise<{
    subjects: Subject[];
    stopwatch: StudyStopwatch;
    stopwatchStudyDate: string;
    sessions: Session[];
    segments: Segment[];
    questionRecords: QuestionRecord[];
    activeSubjectId: string | null;
    activeSessionId: null;
    activeSegmentId: null;
}> {
    const { persisted, storedVersion, localUserId, defaultStopwatch } = input;

    if (storedVersion >= PACETIME_STORAGE_VERSION) return persisted as any;

    const legacy = (persisted ?? {}) as LegacyPersistedStateV0;
    const legacySubjects = Array.isArray(legacy.subjects) ? legacy.subjects : [];
    const legacyStopwatch = legacy.stopwatch && typeof legacy.stopwatch === 'object' ? legacy.stopwatch : defaultStopwatch;
    const legacyQuestionRecords = normalizeLegacyQuestionRecords(Array.isArray(legacy.questionRecords) ? legacy.questionRecords : [], localUserId);
    const rebuilt = buildSessionsFromLegacyQuestionRecords({ records: legacyQuestionRecords, localUserId });

    const migratedLegacyExams = await migrateLegacyExamSessions({ localUserId });
    const sessions = [...migratedLegacyExams.sessions, ...rebuilt.sessions];
    const segments = [...migratedLegacyExams.segments, ...rebuilt.segments];
    const questionRecords = [...migratedLegacyExams.questionRecords, ...rebuilt.questionRecords];

    // De-dupe by id (best-effort).
    const seenSess = new Set<string>();
    const dedupSessions = sessions.filter((s) => (seenSess.has(s.id) ? false : (seenSess.add(s.id), true)));
    const seenSeg = new Set<string>();
    const dedupSegments = segments.filter((s) => (seenSeg.has(s.id) ? false : (seenSeg.add(s.id), true)));
    const seenQr = new Set<string>();
    const dedupQuestions = questionRecords.filter((q) => (seenQr.has(q.id) ? false : (seenQr.add(q.id), true)));

    return {
        subjects: legacySubjects,
        stopwatch: legacyStopwatch,
        stopwatchStudyDate: getStudyDateKey(Date.now()),
        sessions: dedupSessions,
        segments: dedupSegments,
        questionRecords: dedupQuestions,
        activeSubjectId: legacy.activeSubjectId ?? null,
        activeSessionId: null,
        activeSegmentId: null,
    };
}
