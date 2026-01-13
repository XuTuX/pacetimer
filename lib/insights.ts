/**
 * Analytics Insights Generator
 * 사용자가 자기 실력을 이해하고 행동하게 만드는 인사이트 생성 로직
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface QuestionAnalysis {
    questionNo: number;
    myDurationMs: number;
    roomAvgMs: number;
    roomMedianMs: number;
    roomStdDev: number;
    zScore: number;
    percentile: number;
    highlight: 'slow' | 'fast' | 'common_hard' | 'best' | null;
}

export interface InsightCard {
    type: 'positive' | 'warning' | 'trend' | 'strength' | 'pattern';
    icon: string;
    title: string;
    subtitle?: string;
    body: string;
    tip?: string;
    color: string;
}

export interface SolvingPattern {
    type: 'fast_unstable' | 'slow_stable' | 'balanced' | 'inconsistent';
    label: string;
    description: string;
    avgSpeed: number; // compared to room median (negative = faster)
    variance: number;  // compared to room variance
}

export interface GrowthStats {
    improvement: number;        // % change from first to last
    avgPerQuestion: number;     // average time per question
    bestPerQuestion: number;    // best time per question
    worstPerQuestion: number;   // worst time per question
    totalExams: number;
    stabilityScore: number;     // 0-100, higher = more stable
}

// ─────────────────────────────────────────────────────────────
// Statistical Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Calculate standard deviation
 */
export function getStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
}

/**
 * Calculate median
 */
export function getMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate percentile rank (lower is better for time)
 */
export function getPercentileRank(myValue: number, allValues: number[], lowerIsBetter: boolean = true): number {
    if (allValues.length <= 1) return 100;
    const sorted = [...allValues].sort((a, b) => lowerIsBetter ? a - b : b - a);
    const myIndex = sorted.findIndex(v => v === myValue);
    if (myIndex === -1) {
        // Find position where myValue would be inserted
        let insertIndex = 0;
        for (let i = 0; i < sorted.length; i++) {
            if (lowerIsBetter ? sorted[i] > myValue : sorted[i] < myValue) break;
            insertIndex = i + 1;
        }
        return Math.round(((sorted.length - insertIndex) / sorted.length) * 100);
    }
    const percentile = ((sorted.length - 1 - myIndex) / (sorted.length - 1)) * 100;
    return Math.round(percentile);
}

/**
 * Calculate Z-score
 */
export function getZScore(value: number, mean: number, stdDev: number): number {
    if (stdDev === 0) return 0;
    return (value - mean) / stdDev;
}

/**
 * Get percentile value (e.g., top 25%)
 */
export function getPercentileValue(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.floor((percentile / 100) * (sorted.length - 1));
    return sorted[index];
}

// ─────────────────────────────────────────────────────────────
// Question-Level Analysis
// ─────────────────────────────────────────────────────────────

/**
 * Analyze individual questions compared to room performance
 */
export function analyzeQuestions(
    myRecords: Array<{ question_no: number; duration_ms: number }>,
    allRecords: Array<{ question_no: number; duration_ms: number; user_id?: string }>,
    totalQuestions: number,
    myUserId?: string
): QuestionAnalysis[] {
    const results: QuestionAnalysis[] = [];

    // Group room records by question
    const roomRecordsByQ: Map<number, number[]> = new Map();
    allRecords.forEach(r => {
        if (!myUserId || r.user_id !== myUserId) {
            const existing = roomRecordsByQ.get(r.question_no) || [];
            existing.push(r.duration_ms);
            roomRecordsByQ.set(r.question_no, existing);
        }
    });

    // Create map of my records
    const myRecordMap = new Map(myRecords.map(r => [r.question_no, r.duration_ms]));

    // Find global stats for common hard detection
    const allRoomTimes: number[] = [];
    roomRecordsByQ.forEach(times => allRoomTimes.push(...times));
    const globalAvg = allRoomTimes.length > 0
        ? allRoomTimes.reduce((a, b) => a + b, 0) / allRoomTimes.length
        : 0;

    for (let q = 1; q <= totalQuestions; q++) {
        const myDurationMs = myRecordMap.get(q) || 0;
        const roomTimes = roomRecordsByQ.get(q) || [];

        if (roomTimes.length === 0) {
            results.push({
                questionNo: q,
                myDurationMs,
                roomAvgMs: 0,
                roomMedianMs: 0,
                roomStdDev: 0,
                zScore: 0,
                percentile: 100,
                highlight: null,
            });
            continue;
        }

        const roomAvgMs = roomTimes.reduce((a, b) => a + b, 0) / roomTimes.length;
        const roomMedianMs = getMedian(roomTimes);
        const roomStdDev = getStdDev(roomTimes);
        const zScore = getZScore(myDurationMs, roomAvgMs, roomStdDev);
        const percentile = getPercentileRank(myDurationMs, [...roomTimes, myDurationMs]);

        // Determine highlight
        let highlight: QuestionAnalysis['highlight'] = null;
        const isCommonHard = roomAvgMs > globalAvg * 1.5;
        const isMyBest = percentile >= 90; // Top 10%

        if (zScore > 1.5) {
            highlight = 'slow'; // I'm significantly slower than room
        } else if (zScore < -1.5) {
            highlight = 'fast'; // I'm significantly faster than room
        } else if (isCommonHard) {
            highlight = 'common_hard';
        }

        // Override with best if I have the best time
        if (isMyBest && roomTimes.length > 1) {
            highlight = 'best';
        }

        results.push({
            questionNo: q,
            myDurationMs,
            roomAvgMs,
            roomMedianMs,
            roomStdDev,
            zScore,
            percentile,
            highlight,
        });
    }

    return results;
}

// ─────────────────────────────────────────────────────────────
// Pattern Detection
// ─────────────────────────────────────────────────────────────

/**
 * Detect solving pattern based on performance data
 */
export function detectSolvingPattern(
    myDurations: number[],
    roomMedian: number,
    roomVariance: number
): SolvingPattern {
    if (myDurations.length === 0) {
        return {
            type: 'balanced',
            label: '분석 중',
            description: '아직 분석할 데이터가 부족해요',
            avgSpeed: 0,
            variance: 0,
        };
    }

    const myAvg = myDurations.reduce((a, b) => a + b, 0) / myDurations.length;
    const myVariance = getStdDev(myDurations);
    const avgSpeed = ((myAvg - roomMedian) / roomMedian) * 100; // % difference
    const varianceRatio = roomVariance > 0 ? myVariance / Math.sqrt(roomVariance) : 1;

    const isFast = avgSpeed < -10; // 10% faster than median
    const isSlow = avgSpeed > 10;  // 10% slower than median
    const isStable = varianceRatio < 0.8;
    const isUnstable = varianceRatio > 1.2;

    if (isFast && isUnstable) {
        return {
            type: 'fast_unstable',
            label: '빠르지만 불안정한 타입',
            description: '쉬운 문항은 빠르지만, 어려운 문항에서 급격히 느려져요',
            avgSpeed,
            variance: varianceRatio,
        };
    } else if (isSlow && isStable) {
        return {
            type: 'slow_stable',
            label: '신중하고 안정적인 타입',
            description: '전체적으로 조금 느리지만, 일관된 페이스를 유지해요',
            avgSpeed,
            variance: varianceRatio,
        };
    } else if (isUnstable) {
        return {
            type: 'inconsistent',
            label: '편차가 큰 타입',
            description: '문항별 소요시간 차이가 커요. 특정 유형에 약점이 있을 수 있어요',
            avgSpeed,
            variance: varianceRatio,
        };
    } else {
        return {
            type: 'balanced',
            label: '균형 잡힌 타입',
            description: '속도와 안정성 모두 양호해요',
            avgSpeed,
            variance: varianceRatio,
        };
    }
}

// ─────────────────────────────────────────────────────────────
// Insight Card Generation
// ─────────────────────────────────────────────────────────────

/**
 * Generate insight cards based on analysis
 */
export function generateInsightCards(
    questionAnalysis: QuestionAnalysis[],
    pattern: SolvingPattern,
    myTotalDuration: number,
    roomAvgDuration: number,
    roomMedianDuration: number
): InsightCard[] {
    const cards: InsightCard[] = [];

    // 1. Pattern insight
    const patternColors: Record<SolvingPattern['type'], string> = {
        fast_unstable: '#FFB800',
        slow_stable: '#3B82F6',
        inconsistent: '#EF4444',
        balanced: '#10B981',
    };

    cards.push({
        type: 'pattern',
        icon: pattern.type === 'balanced' ? 'checkmark-circle' : 'analytics',
        title: pattern.label,
        body: pattern.description,
        tip: getPatternTip(pattern.type),
        color: patternColors[pattern.type],
    });

    // 2. Position insight
    const diffFromMedian = myTotalDuration - roomMedianDuration;
    const diffPercent = Math.round((diffFromMedian / roomMedianDuration) * 100);
    const isFaster = diffFromMedian < 0;

    cards.push({
        type: isFaster ? 'positive' : 'warning',
        icon: isFaster ? 'trending-up' : 'trending-down',
        title: isFaster
            ? `방 중앙값보다 ${Math.abs(diffPercent)}% 빠름`
            : `방 중앙값보다 ${diffPercent}% 느림`,
        body: isFaster
            ? '현재 페이스를 유지하세요!'
            : '조금 더 속도를 올려볼 수 있어요',
        color: isFaster ? '#10B981' : '#F97316',
    });

    // 3. Strength discovery
    const fastQuestions = questionAnalysis.filter(q => q.highlight === 'fast' || q.highlight === 'best');
    if (fastQuestions.length > 0) {
        const qNumbers = fastQuestions.map(q => q.questionNo).join(', ');
        cards.push({
            type: 'strength',
            icon: 'star',
            title: '다들 막히는 문항인데 나는 빨랐어요!',
            subtitle: `문항 ${qNumbers}`,
            body: `${fastQuestions.length}개 문항에서 방 평균보다 빠른 기록을 남겼어요`,
            color: '#8B5CF6',
        });
    }

    // 4. Improvement needed
    const slowQuestions = questionAnalysis.filter(q => q.highlight === 'slow');
    if (slowQuestions.length > 0) {
        const qNumbers = slowQuestions.slice(0, 3).map(q => q.questionNo).join(', ');
        cards.push({
            type: 'warning',
            icon: 'alert-circle',
            title: '개선이 필요한 문항',
            subtitle: `문항 ${qNumbers}${slowQuestions.length > 3 ? ' 외' : ''}`,
            body: `${slowQuestions.length}개 문항에서 방 평균보다 많이 느렸어요`,
            tip: '비슷한 유형의 문제를 더 연습해보세요',
            color: '#EF4444',
        });
    }

    // 5. Common difficulty
    const hardQuestions = questionAnalysis.filter(q => q.highlight === 'common_hard');
    if (hardQuestions.length > 0) {
        const qNumbers = hardQuestions.map(q => q.questionNo).join(', ');
        cards.push({
            type: 'trend',
            icon: 'people',
            title: '모두에게 어려웠던 문항',
            subtitle: `문항 ${qNumbers}`,
            body: '방 전체가 평균보다 오래 걸린 문항이에요',
            color: '#6B7280',
        });
    }

    return cards;
}

function getPatternTip(type: SolvingPattern['type']): string | undefined {
    switch (type) {
        case 'fast_unstable':
            return '어려운 문항 유형을 집중 연습해보세요';
        case 'slow_stable':
            return '쉬운 문항에서 더 과감하게 넘어가보세요';
        case 'inconsistent':
            return '약점 유형을 파악하고 집중 연습하세요';
        default:
            return undefined;
    }
}

// ─────────────────────────────────────────────────────────────
// Growth Analysis
// ─────────────────────────────────────────────────────────────

/**
 * Calculate growth statistics from exam history
 */
export function calculateGrowthStats(
    examHistory: Array<{ avgPerQuestion: number; date: Date }>
): GrowthStats | null {
    if (examHistory.length < 2) return null;

    const values = examHistory.map(e => e.avgPerQuestion);
    const first = values[0];
    const last = values[values.length - 1];

    const improvement = ((first - last) / first) * 100;
    const avgPerQuestion = values.reduce((a, b) => a + b, 0) / values.length;
    const bestPerQuestion = Math.min(...values);
    const worstPerQuestion = Math.max(...values);

    // Stability: compare recent 3 stddev vs all stddev
    const recentValues = values.slice(-3);
    const recentStdDev = getStdDev(recentValues);
    const totalStdDev = getStdDev(values);
    const stabilityScore = totalStdDev > 0
        ? Math.max(0, Math.min(100, 100 - (recentStdDev / totalStdDev) * 100))
        : 100;

    return {
        improvement: Math.round(improvement),
        avgPerQuestion,
        bestPerQuestion,
        worstPerQuestion,
        totalExams: examHistory.length,
        stabilityScore: Math.round(stabilityScore),
    };
}

// ─────────────────────────────────────────────────────────────
// Formatting Helpers
// ─────────────────────────────────────────────────────────────

export function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

export function formatShortDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    if (m > 0) return `${m}:${s.toString().padStart(2, '0')}`;
    return `${s}초`;
}

export function formatDiffPercent(diff: number): string {
    const abs = Math.abs(Math.round(diff));
    if (diff < 0) return `-${abs}%`;
    if (diff > 0) return `+${abs}%`;
    return '동일';
}
