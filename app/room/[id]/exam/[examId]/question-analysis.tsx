import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { QuestionBar } from "../../../../../components/analysis/QuestionBar";
import { Card } from "../../../../../components/ui/Card";
import { ScreenHeader } from "../../../../../components/ui/ScreenHeader";
import { Section } from "../../../../../components/ui/Section";
import { Typography } from "../../../../../components/ui/Typography";
import type { Database } from "../../../../../lib/db-types";
import {
    analyzeQuestions,
    detectSolvingPattern,
    getMedian,
    getStdDev,
    type QuestionAnalysis,
} from "../../../../../lib/insights";
import { useSupabase } from "../../../../../lib/supabase";
import { formatSupabaseError } from "../../../../../lib/supabaseError";
import { COLORS, RADIUS, SPACING } from "../../../../../lib/theme";

type RoomExamRow = Database["public"]["Tables"]["room_exams"]["Row"];
type RecordRow = Database["public"]["Tables"]["attempt_records"]["Row"];

function formatShortDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    if (m > 0) return `${m}:${s.toString().padStart(2, '0')}`;
    return `${s}초`;
}

export default function QuestionAnalysisScreen() {
    const supabase = useSupabase();
    const router = useRouter();
    const { userId } = useAuth();
    const { id, examId, questionNo } = useLocalSearchParams<{ id: string; examId: string; questionNo?: string }>();

    const roomId = Array.isArray(id) ? id[0] : id;
    const currentExamId = Array.isArray(examId) ? examId[0] : examId;
    const targetQuestionNo = useMemo(() => {
        const parsed = Number(Array.isArray(questionNo) ? questionNo[0] : questionNo);
        return Number.isFinite(parsed) ? parsed : null;
    }, [questionNo]);
    const scrollRef = useRef<ScrollView>(null);
    const hasAutoScrolledRef = useRef(false);

    useEffect(() => {
        hasAutoScrolledRef.current = false;
    }, [targetQuestionNo]);

    const [exam, setExam] = useState<RoomExamRow | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [myRecords, setMyRecords] = useState<RecordRow[]>([]);
    const [allRecords, setAllRecords] = useState<RecordRow[]>([]);
    const [myDurationMs, setMyDurationMs] = useState(0);
    const [roomDurations, setRoomDurations] = useState<number[]>([]);

    const loadData = useCallback(async () => {
        if (!roomId || !currentExamId || !userId) return;
        setLoading(true);
        setError(null);
        try {
            // 1. Fetch Exam
            const { data: eData, error: eError } = await supabase
                .from("room_exams")
                .select("*")
                .eq("id", currentExamId)
                .single();
            if (eError) throw eError;
            setExam(eData);

            // 2. Fetch my attempt
            const { data: myAttempt, error: maError } = await supabase
                .from("attempts")
                .select("id, duration_ms")
                .eq("exam_id", currentExamId)
                .eq("user_id", userId)
                .single();
            if (maError) throw maError;
            setMyDurationMs(myAttempt.duration_ms || 0);

            // 3. Fetch my records
            const { data: myRecs, error: mrError } = await supabase
                .from("attempt_records")
                .select("*")
                .eq("attempt_id", myAttempt.id)
                .order("question_no", { ascending: true });
            if (mrError) throw mrError;
            setMyRecords(myRecs || []);

            // 4. Fetch all attempts for this exam
            const { data: allAttempts, error: aaError } = await supabase
                .from("attempts")
                .select("id, duration_ms, user_id")
                .eq("exam_id", currentExamId)
                .not("ended_at", "is", null);
            if (aaError) throw aaError;

            // Room durations for comparison
            setRoomDurations((allAttempts || []).map(a => a.duration_ms || 0));

            // 5. Fetch all records
            const attemptIds = (allAttempts || []).map(a => a.id);
            if (attemptIds.length > 0) {
                const { data: allRecs, error: arError } = await supabase
                    .from("attempt_records")
                    .select("*")
                    .in("attempt_id", attemptIds);
                if (!arError) {
                    setAllRecords(allRecs || []);
                }
            }
        } catch (err: any) {
            setError(formatSupabaseError(err));
        } finally {
            setLoading(false);
        }
    }, [roomId, currentExamId, userId, supabase]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    // Analyze questions
    const questionAnalysis = useMemo(() => {
        if (!exam || myRecords.length === 0) return [];
        return analyzeQuestions(
            myRecords.map(r => ({ question_no: r.question_no, duration_ms: r.duration_ms })),
            allRecords.map(r => ({ question_no: r.question_no, duration_ms: r.duration_ms })),
            exam.total_questions,
            userId || undefined
        );
    }, [exam, myRecords, allRecords, userId]);

    const roomSolveCounts = useMemo(() => {
        const counts: Record<number, number> = {};
        allRecords.forEach((record) => {
            if (record.duration_ms > 0) {
                counts[record.question_no] = (counts[record.question_no] ?? 0) + 1;
            }
        });
        return counts;
    }, [allRecords]);

    const questionAnalysisForDisplay = useMemo(() => {
        if (questionAnalysis.length === 0) return [];
        return questionAnalysis.map((q) => {
            const solvedCount = roomSolveCounts[q.questionNo] ?? 0;
            if (solvedCount < 3 && (q.highlight === 'slow' || q.highlight === 'fast')) {
                return { ...q, highlight: null };
            }
            return q;
        });
    }, [questionAnalysis, roomSolveCounts]);

    // Solving pattern
    const solvingPattern = useMemo(() => {
        if (myRecords.length === 0) return null;
        // 0초(건너뜀/시간부족)는 패턴 분석(속도/안정성)에서 제외
        const validRecords = myRecords.filter(r => r.duration_ms > 0);
        if (validRecords.length === 0) return null;

        const myDurations = validRecords.map(r => r.duration_ms);
        const roomMedian = getMedian(roomDurations);
        const roomVariance = getStdDev(roomDurations) ** 2;
        return detectSolvingPattern(myDurations, roomMedian, roomVariance);
    }, [myRecords, roomDurations]);

    // Stats
    const stats = useMemo(() => {
        if (questionAnalysis.length === 0) return null;

        const slowQuestions = questionAnalysis.filter(q => q.highlight === 'slow');
        const fastQuestions = questionAnalysis.filter(q => q.highlight === 'fast');
        const commonHardQuestions = questionAnalysis.filter(q => q.highlight === 'common_hard');
        const bestQuestions = questionAnalysis.filter(q => q.highlight === 'best');

        const roomAvg = roomDurations.length > 0
            ? roomDurations.reduce((a, b) => a + b, 0) / roomDurations.length
            : myDurationMs;
        const diffFromAvg = myDurationMs - roomAvg;

        const completedCount = roomDurations.length;
        const sorted = [...roomDurations].sort((a, b) => a - b);
        const myRank = sorted.findIndex(d => d >= myDurationMs) + 1;
        const percentile = completedCount > 0
            ? Math.round((1 - (myRank - 1) / completedCount) * 100)
            : 100;

        return {
            slowQuestions,
            fastQuestions,
            commonHardQuestions,
            bestQuestions,
            diffFromAvg,
            percentile,
            myRank,
            completedCount,
        };
    }, [questionAnalysis, myDurationMs, roomDurations]);

    const maxDuration = useMemo(() => {
        if (questionAnalysis.length === 0) return 60000;
        return Math.max(
            ...questionAnalysis.map(q => Math.max(q.myDurationMs, q.roomAvgMs))
        );
    }, [questionAnalysis]);

    const renderQuestionBarChart = (
        data: QuestionAnalysis[],
        maxDur: number
    ) => {
        const chartHeight = 160;
        const padding = { top: 16, right: 16, bottom: 28, left: 40 };
        const barWidth = 10;
        const gap = 6;
        const screenWidth = 375; // fallback
        const chartWidth = Math.max(
            screenWidth - 72,
            data.length * (barWidth + gap) + padding.left + padding.right
        );
        const chartInnerHeight = chartHeight - padding.top - padding.bottom;
        const labelEvery = data.length > 24 ? 5 : data.length > 14 ? 3 : 1;
        const tickCount = 4;

        const getBarColor = (item: QuestionAnalysis) => {
            if (item.myDurationMs === 0) return COLORS.border;
            if (item.highlight === 'slow') return COLORS.error;
            if (item.highlight === 'fast') return '#10B981';
            if (item.highlight === 'common_hard') return COLORS.warning;
            if (item.highlight === 'best') return COLORS.primaryDark;
            return COLORS.primary;
        };

        return (
            <View style={{ height: chartHeight, marginBottom: SPACING.lg }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {/* SVG Implementation simplified for this screen */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingLeft: padding.left, height: chartInnerHeight + padding.top }}>
                        {data.map((item, idx) => {
                            const h = (item.myDurationMs / maxDur) * chartInnerHeight;
                            const avgH = (item.roomAvgMs / maxDur) * chartInnerHeight;
                            return (
                                <View key={item.questionNo} style={{ width: barWidth, marginRight: gap, alignItems: 'center' }}>
                                    <View style={{ width: '100%', height: h, backgroundColor: getBarColor(item), borderRadius: 2 }} />
                                    {item.roomAvgMs > 0 && (
                                        <View style={{ position: 'absolute', bottom: avgH, width: '140%', height: 2, backgroundColor: COLORS.textMuted, opacity: 0.6 }} />
                                    )}
                                    <View style={{ height: 16, marginTop: 4 }}>
                                        {(idx % labelEvery === 0 || idx === data.length - 1) && (
                                            <Typography.Label color={COLORS.textMuted}>{item.questionNo}</Typography.Label>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="문항별 분석" />
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
                    <Typography.Body1 color={COLORS.error} style={{ marginTop: SPACING.md }}>
                        {error}
                    </Typography.Body1>
                    <Pressable onPress={loadData} style={styles.retryButton}>
                        <Typography.Body2 bold color={COLORS.primary}>다시 시도</Typography.Body2>
                    </Pressable>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader title="문항별 분석" />

            <ScrollView
                ref={scrollRef}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Overview Graph */}
                {questionAnalysis.length > 0 && (
                    <Section title="전체 비교 그래프" description="막대(나) vs 가로선(통계)">
                        <Card padding="lg" radius="xl">
                            {renderQuestionBarChart(questionAnalysis, maxDuration)}
                            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: SPACING.lg }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <View style={{ width: 12, height: 8, borderRadius: 2, backgroundColor: COLORS.primary }} />
                                    <Typography.Caption color={COLORS.textMuted}>나</Typography.Caption>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <View style={{ width: 12, height: 2, backgroundColor: COLORS.textMuted }} />
                                    <Typography.Caption color={COLORS.textMuted}>평균</Typography.Caption>
                                </View>
                            </View>
                        </Card>
                    </Section>
                )}

                {/* Recap */}
                {stats && (
                    <Section title="요약 리캡" style={styles.section} contentStyle={styles.recapContent}>
                        <View style={styles.recapGrid}>
                            <View style={styles.recapCard}>
                                <Typography.Caption color={COLORS.textMuted}>총 시간</Typography.Caption>
                                <Typography.H2 bold color={COLORS.text}>
                                    {formatShortDuration(myDurationMs)}
                                </Typography.H2>
                            </View>
                            <View style={styles.recapCard}>
                                <Typography.Caption color={COLORS.textMuted}>평균 대비</Typography.Caption>
                                <View style={styles.recapValueRow}>
                                    <Ionicons
                                        name={stats.diffFromAvg <= 0 ? "arrow-down" : "arrow-up"}
                                        size={14}
                                        color={stats.diffFromAvg <= 0 ? "#10B981" : COLORS.error}
                                    />
                                    <Typography.H2 bold color={stats.diffFromAvg <= 0 ? "#10B981" : COLORS.error}>
                                        {stats.diffFromAvg === 0 ? "0초" : `${stats.diffFromAvg < 0 ? "-" : "+"}${formatShortDuration(Math.abs(stats.diffFromAvg))}`}
                                    </Typography.H2>
                                </View>
                            </View>
                            <View style={styles.recapCard}>
                                <Typography.Caption color={COLORS.textMuted}>상위</Typography.Caption>
                                <Typography.H2 bold color={COLORS.primary}>
                                    {100 - stats.percentile}%
                                </Typography.H2>
                            </View>
                        </View>

                        {questionAnalysis.length > 0 && (
                            <View style={styles.heatmapContainer}>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.heatmapRow}
                                >
                                    {questionAnalysis.map((q) => {
                                        const ratio = maxDuration > 0 ? q.myDurationMs / maxDuration : 0;
                                        const opacity = q.myDurationMs === 0 ? 1 : Math.min(1, 0.15 + ratio * 0.85);
                                        return (
                                            <View
                                                key={q.questionNo}
                                                style={[
                                                    styles.heatmapCell,
                                                    { backgroundColor: q.myDurationMs === 0 ? COLORS.border : COLORS.primary, opacity }
                                                ]}
                                            />
                                        );
                                    })}
                                </ScrollView>
                                <View style={styles.heatmapLegend}>
                                    <Typography.Caption color={COLORS.textMuted}>빠름</Typography.Caption>
                                    <Typography.Caption color={COLORS.textMuted}>느림</Typography.Caption>
                                </View>
                            </View>
                        )}
                    </Section>
                )}

                {/* Question-by-Question Analysis */}
                <Section
                    title="문항별 상세"
                    description="나의 기록 vs 방 평균 비교"
                    style={styles.section}
                >
                    {questionAnalysisForDisplay.map((q) => (
                        <View
                            key={q.questionNo}
                            onLayout={
                                targetQuestionNo === q.questionNo
                                    ? (event) => {
                                        if (hasAutoScrolledRef.current) return;
                                        hasAutoScrolledRef.current = true;
                                        scrollRef.current?.scrollTo({
                                            y: Math.max(0, event.nativeEvent.layout.y - SPACING.lg),
                                            animated: true,
                                        });
                                    }
                                    : undefined
                            }
                            style={targetQuestionNo === q.questionNo ? styles.focusedQuestion : undefined}
                        >
                            <QuestionBar
                                data={q}
                                maxDuration={maxDuration}
                                showMedian={true}
                            />
                        </View>
                    ))}
                </Section>

                {/* Solving Pattern */}
                {solvingPattern && (
                    <Section title="풀이 패턴" style={styles.section}>
                        <Card padding="lg" radius="xl" style={styles.patternCard}>
                            <View style={styles.patternHeader}>
                                <View style={styles.patternIcon}>
                                    <Ionicons
                                        name={solvingPattern.type === 'fast_unstable' ? 'flash' :
                                            solvingPattern.type === 'slow_stable' ? 'shield-checkmark' :
                                                solvingPattern.type === 'balanced' ? 'checkmark-circle' : 'shuffle'}
                                        size={24}
                                        color={COLORS.primary}
                                    />
                                </View>
                                <View style={styles.patternInfo}>
                                    <Typography.Subtitle1 bold color={COLORS.text}>
                                        {solvingPattern.label}
                                    </Typography.Subtitle1>
                                    <Typography.Body2 color={COLORS.textMuted}>
                                        {solvingPattern.description}
                                    </Typography.Body2>
                                </View>
                            </View>

                            <View style={styles.patternStats}>
                                <View style={styles.patternStatItem}>
                                    <Typography.Caption color={COLORS.textMuted}>평균 속도</Typography.Caption>
                                    <Typography.Subtitle2 bold color={COLORS.text}>
                                        {formatShortDuration(solvingPattern.avgSpeed)}
                                    </Typography.Subtitle2>
                                </View>
                                <View style={styles.patternStatDivider} />
                                <View style={styles.patternStatItem}>
                                    <Typography.Caption color={COLORS.textMuted}>편차</Typography.Caption>
                                    <Typography.Subtitle2 bold color={COLORS.text}>
                                        ±{formatShortDuration(Math.sqrt(solvingPattern.variance))}
                                    </Typography.Subtitle2>
                                </View>
                            </View>
                        </Card>
                    </Section>
                )}

                {/* Bottom Padding */}
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.bg,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    retryButton: {
        marginTop: SPACING.lg,
        padding: SPACING.md,
    },
    scrollContent: {
        paddingTop: SPACING.md,
    },
    section: {

        marginTop: SPACING.lg,
    },
    focusedQuestion: {
        borderWidth: 1,
        borderColor: COLORS.primary,
        borderRadius: RADIUS.lg,
        padding: 2,
    },

    // Recap
    recapContent: {
        gap: SPACING.md,
    },
    recapGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.md,
    },
    recapCard: {
        flex: 1,
        minWidth: '30%',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    recapValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    heatmapContainer: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    heatmapRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: SPACING.xs,
    },
    heatmapCell: {
        width: 8,
        height: 10,
        borderRadius: 3,
    },
    heatmapLegend: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: SPACING.sm,
        paddingHorizontal: SPACING.xs,
    },

    // Pattern Card
    patternCard: {
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    patternHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    patternIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    patternInfo: {
        flex: 1,
    },
    patternStats: {
        flexDirection: 'row',
        marginTop: SPACING.lg,
        paddingTop: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    patternStatItem: {
        flex: 1,
        alignItems: 'center',
    },
    patternStatDivider: {
        width: 1,
        height: 30,
        backgroundColor: COLORS.border,
    },
});
