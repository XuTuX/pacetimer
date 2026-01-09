import type { QuestionRecord, Segment, Session, Subject } from './types';
import { getStudyDateKey } from './studyDate';
import { getSegmentDurationMs } from './recordsIndex';

export type RangeKey = 'today' | 'week';

export type DailyTotal = { date: string; durationMs: number; questionCount: number };

export type SubjectTotal = {
    subjectId: string;
    subjectName: string;
    durationMs: number;
    questionCount: number;
};

export type BottleneckQuestion = {
    id: string;
    subjectId: string;
    subjectName: string;
    durationMs: number;
    overAvgMs: number;
    startedAt: number;
    studyDate: string;
};

export type MockExamSessionSummary = {
    sessionId: string;
    title: string;
    studyDate: string;
    startedAt: number;
    durationMs: number;
    questionCount: number;
    timeLimitSec?: number;
    targetQuestions?: number;
};

export type AnalyticsSnapshot = {
    today: { durationMs: number; questionCount: number };
    week: { durationMs: number; questionCount: number };
    daily: DailyTotal[]; // last N days (problem-solving only)
    subjectsWeek: SubjectTotal[];
    bottlenecksWeek: { averageMs: number; count: number; items: BottleneckQuestion[] };
    mockExam: {
        week: { durationMs: number; questionCount: number; sessionCount: number };
        recent: MockExamSessionSummary[];
        latest?: MockExamSessionSummary;
    };
};

export function getRecentStudyDates(nowMs: number, days: number): string[] {
    const out: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
        out.push(getStudyDateKey(nowMs - i * 24 * 60 * 60 * 1000));
    }
    return out;
}

export function buildAnalyticsSnapshot(input: {
    sessions: Session[];
    segments: Segment[];
    questionRecords: QuestionRecord[];
    subjects: Subject[];
    nowMs: number;
    dailyDays?: number; // default 14
}): AnalyticsSnapshot {
    const { sessions, segments, questionRecords, subjects, nowMs } = input;
    const dailyDays = input.dailyDays ?? 14;

    // Main analytics are strictly "problem-solving" sessions.
    // Mock-exam analytics are computed separately and never mixed into study totals.
    const subjectsById: Record<string, Subject> = Object.fromEntries(subjects.map((s) => [s.id, s]));

    const sessionById: Record<string, Session> = {};
    for (const s of sessions) sessionById[s.id] = s;

    const segmentsBySessionId: Record<string, Segment[]> = {};
    for (const seg of segments) {
        if (!segmentsBySessionId[seg.sessionId]) segmentsBySessionId[seg.sessionId] = [];
        segmentsBySessionId[seg.sessionId].push(seg);
    }

    const questionCountBySessionId: Record<string, number> = {};
    for (const qr of questionRecords) {
        questionCountBySessionId[qr.sessionId] = (questionCountBySessionId[qr.sessionId] ?? 0) + 1;
    }

    const todayKey = getStudyDateKey(nowMs);
    const weekKeys = new Set(getRecentStudyDates(nowMs, 7));
    const dailyKeys = getRecentStudyDates(nowMs, dailyDays);

    const isProblemSession = (sessionId: string) => sessionById[sessionId]?.mode === 'problem-solving';
    const isMockSession = (sessionId: string) => sessionById[sessionId]?.mode === 'mock-exam';

    const problemSessionIdsToday = new Set<string>();
    const problemSessionIdsWeek = new Set<string>();
    const mockSessionIdsWeek = new Set<string>();

    for (const s of sessions) {
        if (s.mode === 'problem-solving') {
            if (s.studyDate === todayKey) problemSessionIdsToday.add(s.id);
            if (weekKeys.has(s.studyDate)) problemSessionIdsWeek.add(s.id);
        } else if (s.mode === 'mock-exam') {
            if (weekKeys.has(s.studyDate)) mockSessionIdsWeek.add(s.id);
        }
    }

    const sumProblemDuration = (sessionIds: Set<string>) => {
        let durationMs = 0;
        for (const sessionId of sessionIds) {
            const segs = segmentsBySessionId[sessionId] ?? [];
            for (const seg of segs) durationMs += getSegmentDurationMs(seg, nowMs);
        }
        return durationMs;
    };

    const todayDurationMs = sumProblemDuration(problemSessionIdsToday);
    const weekDurationMs = sumProblemDuration(problemSessionIdsWeek);

    let todayQuestionCount = 0;
    let weekQuestionCount = 0;
    for (const qr of questionRecords) {
        const s = sessionById[qr.sessionId];
        if (!s || s.mode !== 'problem-solving') continue;
        if (s.studyDate === todayKey) todayQuestionCount += 1;
        if (weekKeys.has(s.studyDate)) weekQuestionCount += 1;
    }

    const daily: DailyTotal[] = dailyKeys.map((date) => ({ date, durationMs: 0, questionCount: 0 }));
    const dailyIndex: Record<string, number> = Object.fromEntries(daily.map((d, i) => [d.date, i]));

    for (const s of sessions) {
        if (s.mode !== 'problem-solving') continue;
        const idx = dailyIndex[s.studyDate];
        if (idx === undefined) continue;
        const segs = segmentsBySessionId[s.id] ?? [];
        for (const seg of segs) daily[idx].durationMs += getSegmentDurationMs(seg, nowMs);
    }
    for (const qr of questionRecords) {
        const s = sessionById[qr.sessionId];
        if (!s || s.mode !== 'problem-solving') continue;
        const idx = dailyIndex[s.studyDate];
        if (idx === undefined) continue;
        daily[idx].questionCount += 1;
    }

    const subjectTotals: Record<string, { durationMs: number; questionCount: number }> = {};
    for (const sessionId of problemSessionIdsWeek) {
        const segs = segmentsBySessionId[sessionId] ?? [];
        for (const seg of segs) {
            if (!subjectTotals[seg.subjectId]) subjectTotals[seg.subjectId] = { durationMs: 0, questionCount: 0 };
            subjectTotals[seg.subjectId].durationMs += getSegmentDurationMs(seg, nowMs);
        }
    }
    for (const qr of questionRecords) {
        if (!problemSessionIdsWeek.has(qr.sessionId)) continue;
        if (!subjectTotals[qr.subjectId]) subjectTotals[qr.subjectId] = { durationMs: 0, questionCount: 0 };
        subjectTotals[qr.subjectId].questionCount += 1;
    }

    const subjectsWeek: SubjectTotal[] = Object.entries(subjectTotals)
        .map(([subjectId, v]) => ({
            subjectId,
            subjectName: subjectsById[subjectId]?.name ?? (subjectId === '__review__' ? '검토' : '기타'),
            durationMs: v.durationMs,
            questionCount: v.questionCount,
        }))
        .filter((s) => s.durationMs > 0 || s.questionCount > 0)
        .sort((a, b) => b.durationMs - a.durationMs);

    // Bottlenecks (week, problem-solving only)
    let sumQMs = 0;
    let qCount = 0;
    const problemWeekQuestions: QuestionRecord[] = [];
    for (const qr of questionRecords) {
        if (!problemSessionIdsWeek.has(qr.sessionId)) continue;
        sumQMs += qr.durationMs;
        qCount += 1;
        problemWeekQuestions.push(qr);
    }
    const averageMs = qCount > 0 ? Math.round(sumQMs / qCount) : 0;
    const bottlenecksWeekAll: BottleneckQuestion[] = problemWeekQuestions
        .map((qr) => {
            const s = sessionById[qr.sessionId];
            const subjectName = subjectsById[qr.subjectId]?.name ?? '기타';
            return {
                id: qr.id,
                subjectId: qr.subjectId,
                subjectName,
                durationMs: qr.durationMs,
                overAvgMs: qr.durationMs - averageMs,
                startedAt: qr.startedAt,
                studyDate: s?.studyDate ?? getStudyDateKey(qr.startedAt),
            };
        })
        .filter((q) => q.overAvgMs > 0)
        .sort((a, b) => b.durationMs - a.durationMs);

    // Mock exam summaries
    const mockSessions = sessions
        .filter((s) => s.mode === 'mock-exam')
        .slice()
        .sort((a, b) => b.startedAt - a.startedAt);

    const computeMockSummary = (s: Session): MockExamSessionSummary => {
        const segs = segmentsBySessionId[s.id] ?? [];
        let durationMs = 0;
        for (const seg of segs) durationMs += getSegmentDurationMs(seg, nowMs);
        const questionCount = questionCountBySessionId[s.id] ?? 0;
        return {
            sessionId: s.id,
            title: s.title ?? '모의고사',
            studyDate: s.studyDate,
            startedAt: s.startedAt,
            durationMs,
            questionCount,
            timeLimitSec: s.metadata?.mockExam?.timeLimitSec,
            targetQuestions: s.metadata?.mockExam?.targetQuestions,
        };
    };

    const recentMock = mockSessions.slice(0, 6).map(computeMockSummary);
    const latest = recentMock[0];

    let mockWeekDurationMs = 0;
    let mockWeekQuestionCount = 0;
    let mockWeekSessionCount = 0;
    for (const s of mockSessions) {
        if (!weekKeys.has(s.studyDate)) continue;
        mockWeekSessionCount += 1;
        const summary = computeMockSummary(s);
        mockWeekDurationMs += summary.durationMs;
        mockWeekQuestionCount += summary.questionCount;
    }

    return {
        today: { durationMs: todayDurationMs, questionCount: todayQuestionCount },
        week: { durationMs: weekDurationMs, questionCount: weekQuestionCount },
        daily,
        subjectsWeek,
        bottlenecksWeek: { averageMs, count: bottlenecksWeekAll.length, items: bottlenecksWeekAll },
        mockExam: {
            week: { durationMs: mockWeekDurationMs, questionCount: mockWeekQuestionCount, sessionCount: mockWeekSessionCount },
            recent: recentMock,
            latest,
        },
    };
}
