import type { QuestionRecord, Segment, Session, SessionMode } from './types';

export type SessionStats = {
    durationMs: number;
    questionCount: number;
    segmentCount: number;
    subjectIds: string[];
};

export type DayStats = {
    date: string; // Session.studyDate
    durationMs: number;
    questionCount: number;
    sessionCount: number;
    byMode: Record<SessionMode, { durationMs: number; questionCount: number; sessionCount: number }>;
};

export type RecordsIndex = {
    sessionsById: Record<string, Session>;
    sessionsByDate: Record<string, Session[]>;
    segmentsBySessionId: Record<string, Segment[]>;
    questionsBySegmentId: Record<string, QuestionRecord[]>;
    sessionStatsById: Record<string, SessionStats>;
    dayStatsByDate: Record<string, DayStats>;
};

export function getSegmentDurationMs(segment: Segment, nowMs: number): number {
    const end = segment.endedAt ?? nowMs;
    return Math.max(0, end - segment.startedAt);
}

export function buildRecordsIndex(input: {
    sessions: Session[];
    segments: Segment[];
    questionRecords: QuestionRecord[];
    nowMs: number;
}): RecordsIndex {
    const { sessions, segments, questionRecords, nowMs } = input;

    const sessionsById: Record<string, Session> = {};
    const sessionsByDate: Record<string, Session[]> = {};
    const segmentsBySessionId: Record<string, Segment[]> = {};
    const questionsBySegmentId: Record<string, QuestionRecord[]> = {};
    const sessionStatsById: Record<string, SessionStats> = {};
    const dayStatsByDate: Record<string, DayStats> = {};

    for (const session of sessions) {
        sessionsById[session.id] = session;
        const date = session.studyDate;
        if (!sessionsByDate[date]) sessionsByDate[date] = [];
        sessionsByDate[date].push(session);
    }

    for (const [date, list] of Object.entries(sessionsByDate)) {
        sessionsByDate[date] = list.slice().sort((a, b) => b.startedAt - a.startedAt);
    }

    for (const segment of segments) {
        if (!segmentsBySessionId[segment.sessionId]) segmentsBySessionId[segment.sessionId] = [];
        segmentsBySessionId[segment.sessionId].push(segment);
    }
    for (const [sessionId, list] of Object.entries(segmentsBySessionId)) {
        segmentsBySessionId[sessionId] = list.slice().sort((a, b) => a.startedAt - b.startedAt);
    }

    for (const record of questionRecords) {
        if (!questionsBySegmentId[record.segmentId]) questionsBySegmentId[record.segmentId] = [];
        questionsBySegmentId[record.segmentId].push(record);
    }
    for (const [segmentId, list] of Object.entries(questionsBySegmentId)) {
        questionsBySegmentId[segmentId] = list.slice().sort((a, b) => a.startedAt - b.startedAt);
    }

    for (const session of sessions) {
        const segs = segmentsBySessionId[session.id] ?? [];
        const subjectIdSet = new Set<string>();
        let durationMs = 0;
        let questionCount = 0;

        for (const seg of segs) {
            subjectIdSet.add(seg.subjectId);
            durationMs += getSegmentDurationMs(seg, nowMs);
            questionCount += (questionsBySegmentId[seg.id]?.length ?? 0);
        }

        sessionStatsById[session.id] = {
            durationMs,
            questionCount,
            segmentCount: segs.length,
            subjectIds: Array.from(subjectIdSet),
        };
    }

    const emptyByMode: DayStats['byMode'] = {
        'problem-solving': { durationMs: 0, questionCount: 0, sessionCount: 0 },
        'mock-exam': { durationMs: 0, questionCount: 0, sessionCount: 0 },
    };

    for (const session of sessions) {
        const date = session.studyDate;
        const stats = sessionStatsById[session.id] ?? { durationMs: 0, questionCount: 0, segmentCount: 0, subjectIds: [] };
        if (!dayStatsByDate[date]) {
            dayStatsByDate[date] = {
                date,
                durationMs: 0,
                questionCount: 0,
                sessionCount: 0,
                byMode: {
                    'problem-solving': { ...emptyByMode['problem-solving'] },
                    'mock-exam': { ...emptyByMode['mock-exam'] },
                },
            };
        }

        dayStatsByDate[date].durationMs += stats.durationMs;
        dayStatsByDate[date].questionCount += stats.questionCount;
        dayStatsByDate[date].sessionCount += 1;

        dayStatsByDate[date].byMode[session.mode].durationMs += stats.durationMs;
        dayStatsByDate[date].byMode[session.mode].questionCount += stats.questionCount;
        dayStatsByDate[date].byMode[session.mode].sessionCount += 1;
    }

    return {
        sessionsById,
        sessionsByDate,
        segmentsBySessionId,
        questionsBySegmentId,
        sessionStatsById,
        dayStatsByDate,
    };
}

