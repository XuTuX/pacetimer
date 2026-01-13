import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { InsightCard } from "../../../../../components/analysis/InsightCard";
import { QuestionBar } from "../../../../../components/analysis/QuestionBar";
import { Card } from "../../../../../components/ui/Card";
import { ScreenHeader } from "../../../../../components/ui/ScreenHeader";
import { Section } from "../../../../../components/ui/Section";
import { Typography } from "../../../../../components/ui/Typography";
import type { Database } from "../../../../../lib/db-types";
import {
    analyzeQuestions,
    detectSolvingPattern,
    generateInsightCards,
    getMedian,
    getStdDev,
} from "../../../../../lib/insights";
import { useSupabase } from "../../../../../lib/supabase";
import { formatSupabaseError } from "../../../../../lib/supabaseError";
import { COLORS, RADIUS, SPACING } from "../../../../../lib/theme";

type RoomExamRow = Database["public"]["Tables"]["room_exams"]["Row"];
type RecordRow = Database["public"]["Tables"]["attempt_records"]["Row"];

function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

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
    const { id, examId } = useLocalSearchParams<{ id: string; examId: string }>();

    const roomId = Array.isArray(id) ? id[0] : id;
    const currentExamId = Array.isArray(examId) ? examId[0] : examId;

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

    // Solving pattern
    const solvingPattern = useMemo(() => {
        if (myRecords.length === 0) return null;
        const myDurations = myRecords.map(r => r.duration_ms);
        const roomMedian = getMedian(roomDurations);
        const roomVariance = getStdDev(roomDurations) ** 2;
        return detectSolvingPattern(myDurations, roomMedian, roomVariance);
    }, [myRecords, roomDurations]);

    // Insight cards
    const insights = useMemo(() => {
        if (questionAnalysis.length === 0 || !solvingPattern) return [];
        const roomAvgDuration = roomDurations.length > 0
            ? roomDurations.reduce((a, b) => a + b, 0) / roomDurations.length
            : myDurationMs;
        const roomMedianDuration = getMedian(roomDurations);
        return generateInsightCards(
            questionAnalysis,
            solvingPattern,
            myDurationMs,
            roomAvgDuration,
            roomMedianDuration
        );
    }, [questionAnalysis, solvingPattern, myDurationMs, roomDurations]);

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
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Summary Dashboard */}
                {stats && (
                    <View style={styles.dashboardContainer}>
                        <Card padding="xl" radius="xxl" style={styles.dashboardCard}>
                            {/* Position Badge */}
                            <View style={styles.positionRow}>
                                <View style={[
                                    styles.positionBadge,
                                    stats.percentile >= 75 && styles.positionBadgeTop
                                ]}>
                                    <Typography.Label bold color={COLORS.white}>
                                        상위 {100 - stats.percentile}%
                                    </Typography.Label>
                                </View>
                            </View>

                            {/* Stats Grid */}
                            <View style={styles.statsGrid}>
                                <View style={styles.statItem}>
                                    <Typography.H2 bold color={COLORS.primary}>
                                        {formatShortDuration(myDurationMs)}
                                    </Typography.H2>
                                    <Typography.Caption color={COLORS.textMuted}>
                                        총 소요시간
                                    </Typography.Caption>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <Typography.H2 bold color={stats.diffFromAvg < 0 ? '#10B981' : COLORS.error}>
                                        {stats.diffFromAvg < 0 ? '-' : '+'}{formatShortDuration(Math.abs(stats.diffFromAvg))}
                                    </Typography.H2>
                                    <Typography.Caption color={COLORS.textMuted}>
                                        평균 대비
                                    </Typography.Caption>
                                </View>
                            </View>

                            {/* Highlight Summary */}
                            <View style={styles.highlightSummary}>
                                {stats.slowQuestions.length > 0 && (
                                    <View style={[styles.highlightItem, { backgroundColor: '#FEF2F2' }]}>
                                        <Ionicons name="arrow-up" size={12} color="#EF4444" />
                                        <Typography.Caption color="#DC2626">
                                            개선 필요 {stats.slowQuestions.length}문항
                                        </Typography.Caption>
                                    </View>
                                )}
                                {stats.fastQuestions.length > 0 && (
                                    <View style={[styles.highlightItem, { backgroundColor: '#F0FDF4' }]}>
                                        <Ionicons name="arrow-down" size={12} color="#10B981" />
                                        <Typography.Caption color="#059669">
                                            강점 {stats.fastQuestions.length}문항
                                        </Typography.Caption>
                                    </View>
                                )}
                                {stats.commonHardQuestions.length > 0 && (
                                    <View style={[styles.highlightItem, { backgroundColor: '#FFFBEB' }]}>
                                        <Ionicons name="people" size={12} color="#F59E0B" />
                                        <Typography.Caption color="#D97706">
                                            공통 어려움 {stats.commonHardQuestions.length}문항
                                        </Typography.Caption>
                                    </View>
                                )}
                            </View>
                        </Card>
                    </View>
                )}

                {/* Insights Section */}
                {insights.length > 0 && (
                    <Section title="인사이트" style={styles.section}>
                        {insights.slice(0, 3).map((insight, idx) => (
                            <InsightCard
                                key={idx}
                                type={insight.type}
                                icon={insight.icon}
                                title={insight.title}
                                subtitle={insight.subtitle}
                                body={insight.body}
                                tip={insight.tip}
                                color={insight.color}
                            />
                        ))}
                    </Section>
                )}

                {/* Question-by-Question Analysis */}
                <Section
                    title="문항별 상세"
                    description="나의 기록 vs 방 평균 비교"
                    style={styles.section}
                >
                    {questionAnalysis.map((q) => (
                        <QuestionBar
                            key={q.questionNo}
                            data={q}
                            maxDuration={maxDuration}
                            showMedian={true}
                        />
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
        paddingHorizontal: SPACING.xl,
        marginTop: SPACING.lg,
    },

    // Dashboard
    dashboardContainer: {
        paddingHorizontal: SPACING.xl,
    },
    dashboardCard: {
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    positionRow: {
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    positionBadge: {
        backgroundColor: COLORS.textMuted,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.full,
    },
    positionBadgeTop: {
        backgroundColor: COLORS.primary,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: COLORS.border,
        marginHorizontal: SPACING.md,
    },
    highlightSummary: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: SPACING.sm,
    },
    highlightItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: RADIUS.full,
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
