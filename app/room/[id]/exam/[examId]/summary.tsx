import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";
import { ParticipationStatus, type ParticipantInfo } from "../../../../../components/analysis/ParticipationStatus";
import { Button } from "../../../../../components/ui/Button";
import { Card } from "../../../../../components/ui/Card";
import { ScreenHeader } from "../../../../../components/ui/ScreenHeader";
import { Section } from "../../../../../components/ui/Section";
import { Typography } from "../../../../../components/ui/Typography";
import type { Database } from "../../../../../lib/db-types";
import { getMedian, getStdDev } from "../../../../../lib/insights";
import { useSupabase } from "../../../../../lib/supabase";
import { formatSupabaseError } from "../../../../../lib/supabaseError";
import { COLORS, RADIUS, SHADOWS, SPACING } from "../../../../../lib/theme";

type RoomExamRow = Database["public"]["Tables"]["room_exams"]["Row"];
type AttemptRow = Database["public"]["Tables"]["attempts"]["Row"];

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

export default function ExamSummaryScreen() {
    const supabase = useSupabase();
    const router = useRouter();
    const { userId } = useAuth();
    const { id, examId } = useLocalSearchParams<{ id: string; examId: string }>();
    const { width } = useWindowDimensions();

    const roomId = Array.isArray(id) ? id[0] : id;
    const currentExamId = Array.isArray(examId) ? examId[0] : examId;

    const [exam, setExam] = useState<RoomExamRow | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [myAttempt, setMyAttempt] = useState<AttemptRow | null>(null);
    const [allAttempts, setAllAttempts] = useState<AttemptRow[]>([]);
    const [participants, setParticipants] = useState<ParticipantInfo[]>([]);

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
            const { data: myAtt, error: maError } = await supabase
                .from("attempts")
                .select("*")
                .eq("exam_id", currentExamId)
                .eq("user_id", userId)
                .single();
            if (maError) throw maError;
            setMyAttempt(myAtt);

            // 3. Fetch all attempts
            const { data: allAtt, error: aaError } = await supabase
                .from("attempts")
                .select("*")
                .eq("exam_id", currentExamId);
            if (aaError) throw aaError;
            setAllAttempts(allAtt || []);

            // 4. Fetch room members for participant info
            const { data: mData, error: mError } = await supabase
                .from("room_members")
                .select(`*, profile:profiles(*)`)
                .eq("room_id", roomId);
            if (mError) throw mError;

            const members = (mData as any[]) || [];
            const participantList: ParticipantInfo[] = members.map(m => {
                const attempt = (allAtt || []).find(a => a.user_id === m.user_id);
                let status: 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED' = 'NOT_STARTED';
                if (attempt) {
                    status = attempt.ended_at ? 'COMPLETED' : 'IN_PROGRESS';
                }
                return {
                    userId: m.user_id,
                    name: m.profile?.display_name || `사용자 ${(m.user_id || "").slice(0, 4)}`,
                    status,
                    durationMs: attempt?.duration_ms || 0,
                    isMe: m.user_id === userId,
                };
            });
            setParticipants(participantList);

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

    // Stats calculations
    const stats = useMemo(() => {
        const completedAttempts = allAttempts.filter(a => a.ended_at);
        const durations = completedAttempts.map(a => a.duration_ms || 0);

        if (durations.length === 0 || !myAttempt) {
            return null;
        }

        const myDuration = myAttempt.duration_ms || 0;
        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
        const medianDuration = getMedian(durations);
        const stdDev = getStdDev(durations);
        const minDuration = Math.min(...durations);
        const maxDuration = Math.max(...durations);

        // Rank calculation
        const sorted = [...durations].sort((a, b) => a - b);
        const myRank = sorted.findIndex(d => d === myDuration) + 1;
        const percentile = Math.round((1 - (myRank - 1) / durations.length) * 100);

        // Top 25% threshold
        const top25Threshold = sorted[Math.floor(sorted.length * 0.25)];
        const isTop25 = myDuration <= top25Threshold;

        // Diff from average
        const diffFromAvg = myDuration - avgDuration;
        const diffPercent = avgDuration > 0 ? Math.round((diffFromAvg / avgDuration) * 100) : 0;

        return {
            myDuration,
            avgDuration,
            medianDuration,
            stdDev,
            minDuration,
            maxDuration,
            myRank,
            totalCompleted: durations.length,
            percentile,
            isTop25,
            diffFromAvg,
            diffPercent,
            allDurations: durations,
        };
    }, [allAttempts, myAttempt]);

    // Distribution Chart
    const renderDistributionChart = () => {
        if (!stats || stats.allDurations.length < 2) return null;

        const chartWidth = width - 80;
        const chartHeight = 100;
        const padding = { left: 10, right: 10, top: 20, bottom: 30 };
        const graphWidth = chartWidth - padding.left - padding.right;
        const graphHeight = chartHeight - padding.top - padding.bottom;

        const { allDurations, myDuration, minDuration, maxDuration } = stats;
        const range = maxDuration - minDuration || 1;

        // Create histogram buckets
        const bucketCount = Math.min(8, allDurations.length);
        const bucketWidth = range / bucketCount;
        const buckets = Array(bucketCount).fill(0);

        allDurations.forEach(d => {
            const bucketIdx = Math.min(
                Math.floor((d - minDuration) / bucketWidth),
                bucketCount - 1
            );
            buckets[bucketIdx]++;
        });

        const maxBucketCount = Math.max(...buckets);
        const barWidth = graphWidth / bucketCount - 4;

        // My position
        const myPosition = padding.left + ((myDuration - minDuration) / range) * graphWidth;

        return (
            <Svg width={chartWidth} height={chartHeight}>
                <Defs>
                    <LinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={COLORS.primary} stopOpacity="0.8" />
                        <Stop offset="1" stopColor={COLORS.primary} stopOpacity="0.3" />
                    </LinearGradient>
                </Defs>

                {/* Bars */}
                {buckets.map((count, idx) => {
                    const barHeight = maxBucketCount > 0 ? (count / maxBucketCount) * graphHeight : 0;
                    const x = padding.left + idx * (graphWidth / bucketCount) + 2;
                    const y = padding.top + (graphHeight - barHeight);
                    return (
                        <G key={idx}>
                            <Path
                                d={`M ${x} ${y + barHeight} L ${x} ${y + 4} Q ${x} ${y} ${x + 4} ${y} L ${x + barWidth - 4} ${y} Q ${x + barWidth} ${y} ${x + barWidth} ${y + 4} L ${x + barWidth} ${y + barHeight} Z`}
                                fill="url(#barGrad)"
                            />
                        </G>
                    );
                })}

                {/* My position indicator */}
                <Circle cx={myPosition} cy={padding.top - 8} r={6} fill={COLORS.primary} />
                <Line
                    x1={myPosition}
                    y1={padding.top}
                    x2={myPosition}
                    y2={padding.top + graphHeight}
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    strokeDasharray="4 2"
                />
                <SvgText
                    x={myPosition}
                    y={chartHeight - 5}
                    fontSize="10"
                    fontWeight="bold"
                    fill={COLORS.primary}
                    textAnchor="middle"
                >
                    나
                </SvgText>

                {/* Min/Max labels */}
                <SvgText
                    x={padding.left}
                    y={chartHeight - 5}
                    fontSize="9"
                    fill={COLORS.textMuted}
                    textAnchor="start"
                >
                    {formatShortDuration(minDuration)}
                </SvgText>
                <SvgText
                    x={chartWidth - padding.right}
                    y={chartHeight - 5}
                    fontSize="9"
                    fill={COLORS.textMuted}
                    textAnchor="end"
                >
                    {formatShortDuration(maxDuration)}
                </SvgText>
            </Svg>
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
                <ScreenHeader title="시험 완료" />
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
                    <Typography.Body1 color={COLORS.error} style={{ marginTop: SPACING.md }}>
                        {error}
                    </Typography.Body1>
                </View>
            </View>
        );
    }

    // Participation stats
    const avgDurationMs = stats ? stats.avgDuration : undefined;
    const bestDurationMs = stats ? stats.minDuration : undefined;
    const bestUser = stats && allAttempts.length > 0
        ? participants.find(p => {
            const attempt = allAttempts.find(a => a.user_id === p.userId);
            return attempt?.duration_ms === stats.minDuration;
        })
        : undefined;

    return (
        <View style={styles.container}>
            <ScreenHeader title="시험 완료" />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Card - My Result */}
                {stats && (
                    <Card padding="xl" radius="xxl" style={styles.heroCard}>
                        {/* Celebration Icon */}
                        <View style={styles.celebrationIcon}>
                            <Ionicons
                                name={stats.isTop25 ? "trophy" : "checkmark-circle"}
                                size={48}
                                color={stats.isTop25 ? "#FFD700" : COLORS.primary}
                            />
                        </View>

                        <Typography.H2 bold color={COLORS.text} align="center" style={{ marginTop: SPACING.md }}>
                            {exam?.title.replace(/^(\[.*?\]\s*|.*?•\s*)+/, "")}
                        </Typography.H2>

                        {/* Position */}
                        <View style={styles.positionContainer}>
                            <View style={[
                                styles.positionBadge,
                                stats.isTop25 && styles.positionBadgeTop
                            ]}>
                                <Typography.H3 bold color={COLORS.white}>
                                    {stats.myRank}위
                                </Typography.H3>
                                <Typography.Caption color="rgba(255,255,255,0.8)">
                                    / {stats.totalCompleted}명
                                </Typography.Caption>
                            </View>
                            <Typography.Caption color={COLORS.textMuted} style={{ marginTop: SPACING.xs }}>
                                상위 {100 - stats.percentile}%
                            </Typography.Caption>
                        </View>

                        {/* Time Stats */}
                        <View style={styles.timeStatsRow}>
                            <View style={styles.timeStatItem}>
                                <Typography.Caption color={COLORS.textMuted}>나의 기록</Typography.Caption>
                                <Typography.H3 bold color={COLORS.primary}>
                                    {formatDuration(stats.myDuration)}
                                </Typography.H3>
                            </View>
                            <View style={styles.timeStatDivider} />
                            <View style={styles.timeStatItem}>
                                <Typography.Caption color={COLORS.textMuted}>평균 대비</Typography.Caption>
                                <Typography.H3 bold color={stats.diffFromAvg < 0 ? '#10B981' : COLORS.error}>
                                    {stats.diffFromAvg < 0 ? '' : '+'}{stats.diffPercent}%
                                </Typography.H3>
                            </View>
                        </View>

                        {/* Distribution Chart */}
                        <View style={styles.distributionContainer}>
                            {renderDistributionChart()}
                        </View>

                        {/* Insight Message */}
                        <View style={styles.insightMessage}>
                            <Ionicons name="bulb-outline" size={16} color={COLORS.primary} />
                            <Typography.Body2 color={COLORS.text} style={{ flex: 1, marginLeft: 8 }}>
                                {stats.diffFromAvg < 0
                                    ? `평균보다 ${formatDuration(Math.abs(stats.diffFromAvg))} 빨랐어요! 🎉`
                                    : stats.diffFromAvg === 0
                                        ? '평균과 동일한 페이스로 풀었어요.'
                                        : `평균보다 ${formatDuration(stats.diffFromAvg)} 더 걸렸어요. 다음엔 더 빠르게!`}
                            </Typography.Body2>
                        </View>
                    </Card>
                )}

                {/* Statistics Grid */}
                {stats && (
                    <Section title="상세 통계" style={styles.section}>
                        <View style={styles.statsGrid}>
                            <Card padding="md" radius="lg" style={styles.gridStatItem}>
                                <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                                <Typography.Subtitle1 bold color={COLORS.text} style={{ marginTop: SPACING.xs }}>
                                    {formatShortDuration(stats.avgDuration)}
                                </Typography.Subtitle1>
                                <Typography.Caption color={COLORS.textMuted}>평균</Typography.Caption>
                            </Card>
                            <Card padding="md" radius="lg" style={styles.gridStatItem}>
                                <Ionicons name="analytics-outline" size={20} color={COLORS.warning} />
                                <Typography.Subtitle1 bold color={COLORS.text} style={{ marginTop: SPACING.xs }}>
                                    {formatShortDuration(stats.medianDuration)}
                                </Typography.Subtitle1>
                                <Typography.Caption color={COLORS.textMuted}>중앙값</Typography.Caption>
                            </Card>
                            <Card padding="md" radius="lg" style={styles.gridStatItem}>
                                <Ionicons name="flash-outline" size={20} color="#10B981" />
                                <Typography.Subtitle1 bold color={COLORS.text} style={{ marginTop: SPACING.xs }}>
                                    {formatShortDuration(stats.minDuration)}
                                </Typography.Subtitle1>
                                <Typography.Caption color={COLORS.textMuted}>최고 기록</Typography.Caption>
                            </Card>
                            <Card padding="md" radius="lg" style={styles.gridStatItem}>
                                <Ionicons name="stats-chart-outline" size={20} color={COLORS.error} />
                                <Typography.Subtitle1 bold color={COLORS.text} style={{ marginTop: SPACING.xs }}>
                                    ±{formatShortDuration(stats.stdDev)}
                                </Typography.Subtitle1>
                                <Typography.Caption color={COLORS.textMuted}>표준편차</Typography.Caption>
                            </Card>
                        </View>
                    </Section>
                )}

                {/* Participation Status */}
                <Section title="참여 현황" style={styles.section}>
                    <ParticipationStatus
                        participants={participants}
                        avgDurationMs={avgDurationMs}
                        bestDurationMs={bestDurationMs}
                        bestUserName={bestUser?.name}
                        currentUserId={userId ?? undefined}
                    />
                </Section>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <Button
                        label="문항별 분석 보기"
                        onPress={() => router.push({
                            pathname: "/room/[id]/exam/[examId]/question-analysis",
                            params: { id: roomId, examId: currentExamId }
                        })}
                        size="lg"
                        icon="bar-chart-outline"
                    />
                    <Pressable
                        onPress={() => router.replace({
                            pathname: `/room/${roomId}/analysis` as any,
                            params: { initialExamId: currentExamId }
                        })}
                        style={styles.secondaryButton}
                    >
                        <Typography.Body2 bold color={COLORS.primary}>
                            분석 탭으로 돌아가기
                        </Typography.Body2>
                    </Pressable>
                </View>

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
    scrollContent: {
        paddingTop: SPACING.md,
        paddingHorizontal: SPACING.xl,
    },
    section: {
        marginTop: SPACING.xl,
    },

    // Hero Card
    heroCard: {
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.medium,
    },
    celebrationIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    positionContainer: {
        alignItems: 'center',
        marginTop: SPACING.lg,
    },
    positionBadge: {
        flexDirection: 'row',
        alignItems: 'baseline',
        backgroundColor: COLORS.textMuted,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.full,
        gap: 4,
    },
    positionBadgeTop: {
        backgroundColor: COLORS.primary,
    },
    timeStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.xl,
        width: '100%',
    },
    timeStatItem: {
        flex: 1,
        alignItems: 'center',
    },
    timeStatDivider: {
        width: 1,
        height: 40,
        backgroundColor: COLORS.border,
    },
    distributionContainer: {
        marginTop: SPACING.lg,
        width: '100%',
        alignItems: 'center',
    },
    insightMessage: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.lg,
        padding: SPACING.md,
        backgroundColor: COLORS.primaryLight,
        borderRadius: RADIUS.lg,
        width: '100%',
    },

    // Stats Grid
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    gridStatItem: {
        flex: 1,
        minWidth: '45%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },

    // Action Buttons
    actionButtons: {
        marginTop: SPACING.xl,
        gap: SPACING.md,
    },
    secondaryButton: {
        alignItems: 'center',
        padding: SPACING.md,
    },
});
