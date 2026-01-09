import { getSegmentDurationMs } from './recordsIndex';
import { getStudyDateKey } from './studyDate';
import { QuestionRecord, Segment, Session } from './types';

export type DateRange = 'today' | '7days' | '30days';
export type SubjectFilter = 'all' | 'mock' | string; // string is subjectId

export interface AnalyticsData {
    totalDurationMs: number;
    totalQuestionCount: number;
    averageQuestionDurationMs: number;
    hourlyDistribution: number[]; // 24 numbers
    representativeDay: string; // YYYY-MM-DD
    timelineSessions: Session[];
    timelineSegments: Segment[];
    timelineQuestions: QuestionRecord[];
}

export function getDatesInRange(nowMs: number, range: DateRange): string[] {
    const days = range === 'today' ? 1 : range === '7days' ? 7 : 30;
    const dates: string[] = [];
    for (let i = 0; i < days; i++) {
        dates.push(getStudyDateKey(nowMs - i * 24 * 60 * 60 * 1000));
    }
    return dates;
}

export function processAnalytics(
    sessions: Session[],
    segments: Segment[],
    questionRecords: QuestionRecord[],
    range: DateRange,
    filter: SubjectFilter,
    nowMs: number
): AnalyticsData {
    const rangeDates = getDatesInRange(nowMs, range);
    const rangeDatesSet = new Set(rangeDates);

    // Filter sessions by range
    const filteredSessions = sessions.filter(s => rangeDatesSet.has(s.studyDate));

    // Apply subject filter to sessions/segments/questions
    let targetSessions = filteredSessions;
    if (filter === 'mock') {
        targetSessions = filteredSessions.filter(s => s.mode === 'mock-exam');
    } else if (filter !== 'all') {
        // If subject filter is active, we still look at all sessions but we will filter segments/questions later
    }

    const sessionIds = new Set(targetSessions.map(s => s.id));

    let targetSegments = segments.filter(seg => sessionIds.has(seg.sessionId));
    let targetQuestions = questionRecords.filter(qr => sessionIds.has(qr.sessionId));

    if (filter !== 'all' && filter !== 'mock') {
        // Individual subject filter
        targetSegments = targetSegments.filter(seg => seg.subjectId === filter);
        targetQuestions = targetQuestions.filter(qr => qr.subjectId === filter);
    }

    // Totals
    let totalDurationMs = 0;
    for (const seg of targetSegments) {
        totalDurationMs += getSegmentDurationMs(seg, nowMs);
    }

    const totalQuestionCount = targetQuestions.length;
    const averageQuestionDurationMs = totalQuestionCount > 0 ? totalDurationMs / totalQuestionCount : 0;

    // Hourly Distribution (based on segments in range)
    const hourlyDistribution = new Array(24).fill(0);
    for (const seg of targetSegments) {
        const start = new Date(seg.startedAt);
        const end = new Date(seg.endedAt ?? nowMs);

        let current = new Date(start);
        while (current < end) {
            const hour = current.getHours();
            const nextHour = new Date(current);
            nextHour.setHours(hour + 1, 0, 0, 0);

            const segmentEndInHour = end < nextHour ? end : nextHour;
            const durationInHour = segmentEndInHour.getTime() - current.getTime();

            hourlyDistribution[hour] += durationInHour;
            current = segmentEndInHour;
        }
    }

    // Representative Day Selection
    // Today: today
    // 7/30 days: most recent day with activity
    let representativeDay = rangeDates[0]; // default to today
    if (range !== 'today') {
        // Find most recent day with any segment
        const activeDates = new Set(targetSegments.map(seg => {
            const session = sessions.find(s => s.id === seg.sessionId);
            return session?.studyDate;
        }).filter(Boolean));

        for (const date of rangeDates) {
            if (activeDates.has(date)) {
                representativeDay = date!;
                break;
            }
        }
    }

    // Timeline data for representative day
    const timelineSessions = sessions.filter(s => s.studyDate === representativeDay)
        .sort((a, b) => a.startedAt - b.startedAt);

    // When showing timeline for a specific day, we usually want to show all segments of that day if filter is 'all'
    // but if filter is 'mock', only mock sessions.
    // Actually, the user said: "When 'Mock Exam' filter is selected, show only mock exam sessions for the day/range, same timeline model."
    // And for subject filter: "subject filter: All | each subject | Mock Exam"
    // I should probably filter the timeline elements based on the subject filter too.

    let timelineSessionsFiltered = timelineSessions;
    if (filter === 'mock') {
        timelineSessionsFiltered = timelineSessions.filter(s => s.mode === 'mock-exam');
    }

    const timelineSessionIds = new Set(timelineSessionsFiltered.map(s => s.id));
    let timelineSegments = segments.filter(seg => timelineSessionIds.has(seg.sessionId));
    let timelineQuestions = questionRecords.filter(qr => timelineSessionIds.has(qr.sessionId));

    if (filter !== 'all' && filter !== 'mock') {
        timelineSegments = timelineSegments.filter(seg => seg.subjectId === filter);
        timelineQuestions = timelineQuestions.filter(qr => qr.subjectId === filter);
    }

    return {
        totalDurationMs,
        totalQuestionCount,
        averageQuestionDurationMs,
        hourlyDistribution,
        representativeDay,
        timelineSessions: timelineSessionsFiltered,
        timelineSegments,
        timelineQuestions,
    };
}
