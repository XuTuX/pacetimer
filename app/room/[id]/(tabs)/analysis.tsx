import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useGlobalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from "react-native-svg";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { ResponsiveContainer, useBreakpoint } from "../../../../components/ui/Layout";
import { ScreenHeader } from "../../../../components/ui/ScreenHeader";
import { Section } from "../../../../components/ui/Section";
import { Typography } from "../../../../components/ui/Typography";
import type { Database } from "../../../../lib/db-types";
import { analyzeQuestions, type QuestionAnalysis } from "../../../../lib/insights";
import { getRoomExamSubjectFromTitle } from "../../../../lib/roomExam";
import { useSupabase } from "../../../../lib/supabase";
import { formatSupabaseError } from "../../../../lib/supabaseError";
import { COLORS, RADIUS, SHADOWS, SPACING } from "../../../../lib/theme";

type RoomExamRow = Database["public"]["Tables"]["room_exams"]["Row"];
type RecordRow = Database["public"]["Tables"]["attempt_records"]["Row"];

interface ParticipantResult {
    userId: string;
    name: string;
    status: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED";
    durationMs: number;
    progressCount: number;
    lastUpdated?: string;
    isMe: boolean;
    records: RecordRow[];
}

interface MyAttemptData {
    id: string;
    exam_id: string;
    duration_ms: number;
    created_at: string;
    ended_at: string | null;
    room_exams: {
        id: string;
        title: string;
        created_at: string;
        total_questions: number;
    };
}

function formatDuration(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

function formatShortDuration(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    if (m > 0) return `${m}:${s.toString().padStart(2, '0')}`;
    return `${s}초`;
}

// Helper to calculate percentile rank
function getPercentileRank(myValue: number, allValues: number[], lowerIsBetter: boolean = true): number {
    if (allValues.length <= 1) return 100;
    const sorted = [...allValues].sort((a, b) => lowerIsBetter ? a - b : b - a);
    const myIndex = sorted.findIndex(v => v === myValue);
    const percentile = ((sorted.length - 1 - myIndex) / (sorted.length - 1)) * 100;
    return Math.round(percentile);
}

type ViewMode = "my_progress" | "exam_analysis" | "question_analysis";

export default function AnalysisScreen() {
    const supabase = useSupabase();
    const { userId } = useAuth();
    const router = useRouter();
    const { id, initialExamId } = useGlobalSearchParams<{ id: string, initialExamId?: string }>();
    const roomId = Array.isArray(id) ? id[0] : id;
    const { width } = useWindowDimensions();
    const { isAtLeastTablet } = useBreakpoint();

    const [viewMode, setViewMode] = useState<ViewMode>("my_progress");
    const [exams, setExams] = useState<RoomExamRow[]>([]);
    const [selectedExamId, setSelectedExamId] = useState<string | null>(initialExamId || null);
    const [selectedSubject, setSelectedSubject] = useState<string>("전체");
    const [loading, setLoading] = useState(true);
    const [participants, setParticipants] = useState<ParticipantResult[]>([]);
    const [myAttempts, setMyAttempts] = useState<MyAttemptData[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [showSubjectModal, setShowSubjectModal] = useState(false);
    const [showExamModal, setShowExamModal] = useState(false);

    // Derived data
    const uniqueSubjects = useMemo(() => {
        const set = new Set<string>();
        exams.forEach((e) => {
            const subjectLabel = getRoomExamSubjectFromTitle(e.title) ?? "기타";
            set.add(subjectLabel);
        });
        return ["전체", ...Array.from(set)];
    }, [exams]);

    const filteredExams = useMemo(() => {
        if (selectedSubject === "전체") return exams;
        return exams.filter((e) => {
            const subjectLabel = getRoomExamSubjectFromTitle(e.title) ?? "기타";
            return subjectLabel === selectedSubject;
        });
    }, [exams, selectedSubject]);

    const exam = useMemo(() => exams.find(e => e.id === selectedExamId), [exams, selectedExamId]);

    const completedParticipants = useMemo(
        () => participants.filter(p => p.status === "COMPLETED"),
        [participants]
    );

    const myResult = useMemo(() => participants.find(p => p.isMe), [participants]);

    // Load data functions
    const loadExams = useCallback(async () => {
        if (!roomId || roomId === 'undefined') {
            setLoading(false);
            return;
        }
        try {
            const { data, error } = await supabase
                .from("room_exams")
                .select("*")
                .eq("room_id", roomId)
                .order("created_at", { ascending: false });
            if (error) throw error;

            const fetchedExams = data || [];
            setExams(fetchedExams);

            if (fetchedExams.length > 0 && !selectedExamId) {
                setSelectedExamId(fetchedExams[0].id);
            }
        } catch (err: any) {
            console.error("loadExams error:", err);
        }
    }, [roomId, supabase, selectedExamId]);

    const loadExamData = useCallback(async (examId: string) => {
        setLoading(true);
        setError(null);
        try {
            const { data: mData, error: mError } = await supabase
                .from("room_members")
                .select(`*, profile:profiles(*)`)
                .eq("room_id", roomId);
            if (mError) throw mError;
            const members = (mData as any[]) || [];

            const { data: aData, error: aError } = await supabase
                .from("attempts")
                .select("*")
                .eq("exam_id", examId);
            if (aError) throw aError;
            const attempts = aData || [];

            const attemptIds = attempts.map(a => a.id);
            let rData: RecordRow[] = [];
            if (attemptIds.length > 0) {
                const { data: recData, error: rError } = await supabase
                    .from("attempt_records")
                    .select("*")
                    .in("attempt_id", attemptIds);
                if (!rError) rData = recData || [];
            }

            const results: ParticipantResult[] = members.map(m => {
                const attempt = attempts.find(a => a.user_id === m.user_id);
                const records = rData.filter(r => r.attempt_id === attempt?.id);

                let status: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED" = "NOT_STARTED";
                if (attempt) {
                    status = attempt.ended_at ? "COMPLETED" : "IN_PROGRESS";
                }

                return {
                    userId: m.user_id,
                    name: m.profile?.display_name || `사용자 ${(m.user_id || "").slice(0, 4)}`,
                    status,
                    durationMs: attempt?.duration_ms || 0,
                    progressCount: records.length,
                    lastUpdated: attempt?.started_at
                        ? new Date(attempt.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : undefined,
                    isMe: m.user_id === userId,
                    records,
                };
            });

            setParticipants(results);
        } catch (err: any) {
            setError(formatSupabaseError(err));
        } finally {
            setLoading(false);
        }
    }, [roomId, userId, supabase]);

    const loadMyAttempts = useCallback(async () => {
        if (!userId) return;
        try {
            const { data, error } = await supabase
                .from("attempts")
                .select("*, room_exams!inner(id, title, created_at, total_questions)")
                .eq("room_exams.room_id", roomId)
                .eq("user_id", userId)
                .order("created_at", { ascending: true });

            if (data) setMyAttempts(data as MyAttemptData[]);
        } catch (err) {
            console.error("loadMyAttempts error:", err);
        }
    }, [roomId, userId, supabase]);

    useFocusEffect(
        useCallback(() => {
            const init = async () => {
                if (exams.length === 0) setLoading(true);
                await loadExams();
                if (userId) await loadMyAttempts();
                setLoading(false);
            };
            init();
        }, [roomId, loadExams, loadMyAttempts, userId, exams.length])
    );

    // Activity & Participation Stats
    const activityStats = useMemo(() => {
        if (myAttempts.length === 0) return null;

        const dates = myAttempts.map(a => {
            const d = new Date(a.created_at);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
        });

        const uniqueDates = Array.from(new Set(dates)).sort((a, b) => b - a);

        // Streak calculation
        let streak = 0;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        let checkDate = uniqueDates.includes(today.getTime()) ? today : yesterday;
        if (uniqueDates.includes(checkDate.getTime())) {
            streak = 1;
            const tempDate = new Date(checkDate);
            while (true) {
                tempDate.setDate(tempDate.getDate() - 1);
                if (uniqueDates.includes(tempDate.getTime())) {
                    streak++;
                } else {
                    break;
                }
            }
        }

        // Recent activity (last 7 days counts)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            return d.getTime();
        }).reverse();

        const dailyCounts = last7Days.map(time => ({
            time,
            count: dates.filter(d => d === time).length
        }));

        return {
            totalExams: myAttempts.length,
            activeDays: uniqueDates.length,
            streak,
            dailyCounts,
            lastSeen: uniqueDates[0] ? new Date(uniqueDates[0]) : null,
        };
    }, [myAttempts]);

    // Load exam data when selected exam changes
    useFocusEffect(
        useCallback(() => {
            if (selectedExamId && viewMode === "exam_analysis") {
                loadExamData(selectedExamId);
            }
        }, [selectedExamId, viewMode, loadExamData])
    );

    // My Progress View - Subject Growth Analysis
    const renderMyProgressView = () => {
        // Get valid completed attempts only
        const validMyAttempts = myAttempts.filter(a => a.duration_ms > 0);

        // Get subject-specific history (excluding invalid 0-second records)
        const getSubjectHistory = (subject: string) => {
            if (subject === "전체") {
                return validMyAttempts.map(a => ({
                    id: a.id,
                    examId: a.exam_id,
                    title: a.room_exams.title.replace(/^(\[.*?\]\s*|.*?•\s*)+/, ""),
                    date: new Date(a.created_at),
                    val: a.duration_ms / (a.room_exams.total_questions || 1),
                    totalTime: a.duration_ms,
                    questions: a.room_exams.total_questions,
                }));
            }
            return validMyAttempts
                .filter(a => (getRoomExamSubjectFromTitle(a.room_exams.title) ?? "기타") === subject)
                .map(a => ({
                    id: a.id,
                    examId: a.exam_id,
                    title: a.room_exams.title.replace(/^(\[.*?\]\s*|.*?•\s*)+/, ""),
                    date: new Date(a.created_at),
                    val: a.duration_ms / (a.room_exams.total_questions || 1),
                    totalTime: a.duration_ms,
                    questions: a.room_exams.total_questions,
                }));
        };

        const history = getSubjectHistory(selectedSubject);

        // Calculate improvement stats
        const getImprovementStats = () => {
            if (history.length < 2) return null;
            const first = history[0];
            const last = history[history.length - 1];
            const prev = history[history.length - 2];

            const improvementFromFirst = ((first.val - last.val) / first.val) * 100;
            const improvementFromPrev = ((prev.val - last.val) / prev.val) * 100;

            const avgVal = history.reduce((sum, h) => sum + h.val, 0) / history.length;
            const bestVal = Math.min(...history.map(h => h.val));
            const worstVal = Math.max(...history.map(h => h.val));

            return {
                improvementFromFirst: Math.round(improvementFromFirst),
                improvementFromPrev: Math.round(improvementFromPrev),
                avgPerQ: avgVal,
                bestPerQ: bestVal,
                worstPerQ: worstVal,
                totalExams: history.length,
            };
        };

        const stats = getImprovementStats();

        return (
            <>
                {/* Subject Dropdown Selector */}
                {uniqueSubjects.length > 1 && (
                    <View style={styles.dropdownSection}>
                        <Pressable
                            style={styles.dropdownButton}
                            onPress={() => setShowSubjectModal(true)}
                        >
                            <Typography.Body1 bold color={COLORS.text}>{selectedSubject}</Typography.Body1>
                            <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
                        </Pressable>
                    </View>
                )}

                {/* Subject Selection Modal moved to global return */}

                {history.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconBox}>
                            <Ionicons name="analytics-outline" size={48} color={COLORS.textMuted} />
                        </View>
                        <Typography.H3 align="center" color={COLORS.text} bold style={{ marginTop: SPACING.lg }}>
                            아직 기록이 없어요
                        </Typography.H3>
                        <Typography.Body2 align="center" color={COLORS.textMuted} style={{ marginTop: SPACING.sm }}>
                            {selectedSubject === "전체"
                                ? "시험을 완료하면 이곳에서\n나의 성장 추이를 확인할 수 있어요"
                                : `${selectedSubject} 과목의 시험을 완료하면\n성장 추이를 확인할 수 있어요`}
                        </Typography.Body2>
                    </View>
                ) : history.length === 1 ? (
                    <Section title="첫 번째 기록">
                        <Card padding="xl" radius="xl" style={styles.singleRecordCard}>
                            <View style={styles.singleRecordHeader}>
                                <View style={styles.recordBadge}>
                                    <Ionicons name="ribbon" size={16} color={COLORS.primary} />
                                    <Typography.Caption bold color={COLORS.primary}>첫 시험</Typography.Caption>
                                </View>
                            </View>
                            <Typography.H2 bold color={COLORS.text} style={{ marginTop: SPACING.md }}>
                                {history[0].title}
                            </Typography.H2>
                            <View style={styles.singleRecordStats}>
                                <View style={styles.recordStatItem}>
                                    <Typography.Caption color={COLORS.textMuted}>총 소요 시간</Typography.Caption>
                                    <Typography.Subtitle1 bold color={COLORS.primary}>
                                        {formatDuration(history[0].totalTime)}
                                    </Typography.Subtitle1>
                                </View>
                                <View style={styles.recordStatDivider} />
                                <View style={styles.recordStatItem}>
                                    <Typography.Caption color={COLORS.textMuted}>문항당 평균</Typography.Caption>
                                    <Typography.Subtitle1 bold color={COLORS.text}>
                                        {formatDuration(history[0].val)}
                                    </Typography.Subtitle1>
                                </View>
                            </View>
                            <Typography.Caption color={COLORS.textMuted} style={{ marginTop: SPACING.lg, textAlign: 'center' }}>
                                다음 시험을 완료하면 성장 그래프를 확인할 수 있어요
                            </Typography.Caption>
                        </Card>
                    </Section>
                ) : (
                    <>
                        {/* Improvement Summary Cards */}
                        {selectedSubject !== "전체" && stats && (
                            <Section title="성장 요약" description={`총 ${stats.totalExams}회 응시`}>
                                <View style={styles.summaryGrid}>
                                    <Card padding="lg" radius="xl" style={[
                                        styles.summaryCard,
                                        isAtLeastTablet && styles.summaryCardTablet,
                                        stats.improvementFromPrev > 0 ? styles.positiveCard : styles.negativeCard
                                    ]}>
                                        <View style={styles.summaryCardHeader}>
                                            <Ionicons
                                                name={stats.improvementFromPrev > 0 ? "trending-up" : "trending-down"}
                                                size={20}
                                                color={stats.improvementFromPrev > 0 ? "#10B981" : COLORS.error}
                                            />
                                        </View>
                                        <Typography.H2 bold color={stats.improvementFromPrev > 0 ? "#10B981" : COLORS.error}>
                                            {stats.improvementFromPrev > 0 ? "-" : "+"}{Math.abs(stats.improvementFromPrev)}%
                                        </Typography.H2>
                                        <Typography.Caption color={COLORS.textMuted}>이전 시험 대비</Typography.Caption>
                                    </Card>
                                    <Card padding="lg" radius="xl" style={[styles.summaryCard, isAtLeastTablet && styles.summaryCardTablet]}>
                                        <View style={styles.summaryCardHeader}>
                                            <Ionicons name="flash" size={20} color={COLORS.warning} />
                                        </View>
                                        <Typography.H2 bold color={COLORS.text}>
                                            {formatShortDuration(stats.bestPerQ)}
                                        </Typography.H2>
                                        <Typography.Caption color={COLORS.textMuted}>최고 기록</Typography.Caption>
                                    </Card>
                                </View>
                                <View style={{ marginTop: SPACING.sm, alignItems: 'center' }}>
                                    <View style={styles.firstExamBadge}>
                                        <Typography.Caption color={COLORS.textMuted}>
                                            첫 시험 대비 총 {stats.improvementFromFirst > 0 ? "—" : "+"}{Math.abs(stats.improvementFromFirst)}% 단축됨
                                        </Typography.Caption>
                                    </View>
                                </View>
                            </Section>
                        )}

                        {/* Growth or Activity Chart */}
                        {selectedSubject === "전체" ? (
                            <Section
                                title="최근 활동량"
                            >
                                <Card padding="lg" radius="xl" style={styles.chartCard}>
                                    {renderActivityBarChart()}
                                </Card>
                            </Section>
                        ) : (
                            <Section
                                title="문항당 시간 추이"
                                description="시험을 거듭할수록 어떻게 변화했는지 확인하세요"
                            >
                                <Card padding="lg" radius="xl" style={styles.chartCard}>
                                    {renderGrowthChart(history)}
                                </Card>
                            </Section>
                        )}

                        {/* Exam History List */}
                        <Section title="응시 기록">
                            <View style={styles.historyList}>
                                {[...history].reverse().map((h, idx) => {
                                    const rank = history.length - idx;
                                    const prevVal = idx < history.length - 1 ? history[history.length - idx - 2]?.val : null;
                                    const diff = prevVal ? ((prevVal - h.val) / prevVal) * 100 : null;

                                    return (
                                        <Pressable
                                            key={h.id}
                                            onPress={() => {
                                                setSelectedExamId(h.examId);
                                                setViewMode("exam_analysis");
                                            }}
                                            style={({ pressed }) => [
                                                styles.historyItem,
                                                isAtLeastTablet && styles.historyItemTablet,
                                                pressed && styles.historyItemPressed
                                            ]}
                                        >
                                            <View style={[styles.historyRank, isAtLeastTablet && styles.historyRankTablet]}>
                                                <Typography.Caption bold color={COLORS.textMuted}>#{rank}</Typography.Caption>
                                            </View>
                                            <View style={styles.historyContent}>
                                                <Typography.Body1 bold numberOfLines={1}>{h.title}</Typography.Body1>
                                                <Typography.Caption color={COLORS.textMuted}>
                                                    {h.date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} • {h.questions}문항
                                                </Typography.Caption>
                                            </View>
                                            <View style={[styles.historyStats, isAtLeastTablet && styles.historyStatsTablet]}>
                                                <Typography.Subtitle2 bold color={COLORS.primary} style={isAtLeastTablet ? { fontSize: 22 } : undefined}>
                                                    {formatShortDuration(h.val)}
                                                </Typography.Subtitle2>
                                                {diff !== null && (
                                                    <View style={[styles.diffBadge, isAtLeastTablet && styles.diffBadgeTablet, diff > 0 ? styles.diffPositive : styles.diffNegative]}>
                                                        <Ionicons
                                                            name={diff > 0 ? "arrow-down" : "arrow-up"}
                                                            size={isAtLeastTablet ? 14 : 10}
                                                            color={diff > 0 ? "#10B981" : COLORS.error}
                                                        />
                                                        <Typography.Label color={diff > 0 ? "#10B981" : COLORS.error} style={isAtLeastTablet ? { fontSize: 14 } : undefined}>
                                                            {Math.abs(Math.round(diff))}%
                                                        </Typography.Label>
                                                    </View>
                                                )}
                                            </View>
                                            <Ionicons name="chevron-forward" size={isAtLeastTablet ? 24 : 16} color={COLORS.textMuted} />
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </Section>
                    </>
                )}
            </>
        );
    };

    // Activity Bar Chart for Total Progress
    const renderActivityBarChart = () => {
        if (!activityStats) return null;

        const graphWidth = isAtLeastTablet ? Math.min(width - 120, 800) : Math.min(width - 72, 500);
        const graphHeight = isAtLeastTablet ? 300 : 180;
        const padding = isAtLeastTablet
            ? { top: 40, right: 30, bottom: 60, left: 60 }
            : { top: 30, right: 20, bottom: 40, left: 40 };

        const maxCount = Math.max(...activityStats.dailyCounts.map(d => d.count), 1);
        const barWidth = 24;
        const dataCount = activityStats.dailyCounts.length;
        const totalBarWidth = dataCount * barWidth;
        const gap = (graphWidth - padding.left - padding.right - totalBarWidth) / (dataCount - 1);

        return (
            <Svg width={graphWidth} height={graphHeight}>
                <Defs>
                    <LinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={COLORS.primary} stopOpacity="1" />
                        <Stop offset="1" stopColor={COLORS.primaryLight} stopOpacity="0.8" />
                    </LinearGradient>
                </Defs>

                {/* Grid Lines */}
                {[0, 0.5, 1].map((p, i) => {
                    const y = padding.top + (1 - p) * (graphHeight - padding.top - padding.bottom);
                    const val = Math.round(p * maxCount);
                    return (
                        <G key={`grid-${i}`}>
                            <Line
                                x1={padding.left}
                                y1={y}
                                x2={graphWidth - padding.right}
                                y2={y}
                                stroke={COLORS.border}
                                strokeWidth={1}
                                strokeDasharray="4 4"
                            />
                            <SvgText
                                x={padding.left - 8}
                                y={y + 4}
                                fontSize="10"
                                fill={COLORS.textMuted}
                                textAnchor="end"
                            >
                                {val}
                            </SvgText>
                        </G>
                    );
                })}

                {/* Bars */}
                {activityStats.dailyCounts.map((d, i) => {
                    const x = padding.left + i * (barWidth + gap);
                    const barHeight = (d.count / maxCount) * (graphHeight - padding.top - padding.bottom);
                    const y = graphHeight - padding.bottom - barHeight;
                    const date = new Date(d.time);

                    return (
                        <G key={i}>
                            <Rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={Math.max(barHeight, 4)}
                                rx={6}
                                fill={d.count > 0 ? "url(#barGrad)" : COLORS.surfaceVariant}
                            />
                            {d.count > 0 && (
                                <SvgText
                                    x={x + barWidth / 2}
                                    y={y - 8}
                                    fontSize="10"
                                    fontWeight="bold"
                                    fill={COLORS.primary}
                                    textAnchor="middle"
                                >
                                    {d.count}
                                </SvgText>
                            )}
                            <SvgText
                                x={x + barWidth / 2}
                                y={graphHeight - padding.bottom + 16}
                                fontSize="10"
                                fill={COLORS.textMuted}
                                textAnchor="middle"
                            >
                                {`${date.getMonth() + 1}/${date.getDate()}`}
                            </SvgText>
                        </G>
                    );
                })}
            </Svg>
        );
    };

    // Growth Chart Component
    const renderGrowthChart = (history: { id: string; title: string; date: Date; val: number }[]) => {
        const graphWidth = isAtLeastTablet ? Math.min(width - 120, 800) : Math.min(width - 72, 500);
        const graphHeight = isAtLeastTablet ? 300 : 180;
        const padding = isAtLeastTablet
            ? { top: 40, right: 30, bottom: 60, left: 80 }
            : { top: 30, right: 20, bottom: 40, left: 50 };

        const maxVal = Math.max(...history.map(h => h.val));
        const minVal = Math.min(...history.map(h => h.val));
        const valRange = maxVal - minVal || 1;

        // Calculate axis values
        const yAxisSteps = 4;
        const yAxisValues = Array.from({ length: yAxisSteps + 1 }, (_, i) =>
            maxVal - (i * valRange / yAxisSteps)
        );

        const points = history.map((h, i) => {
            const x = padding.left + (i / (history.length - 1)) * (graphWidth - padding.left - padding.right);
            const normalizedY = (h.val - minVal) / valRange;
            const y = padding.top + (1 - normalizedY) * (graphHeight - padding.top - padding.bottom);
            return { x, y, val: h.val, date: h.date, title: h.title };
        });

        // Create smooth curve path
        const createSmoothPath = (pts: typeof points) => {
            if (pts.length < 2) return "";
            let d = `M ${pts[0].x},${pts[0].y}`;
            for (let i = 1; i < pts.length; i++) {
                const prev = pts[i - 1];
                const curr = pts[i];
                const cp1x = prev.x + (curr.x - prev.x) / 3;
                const cp2x = prev.x + 2 * (curr.x - prev.x) / 3;
                d += ` C ${cp1x},${prev.y} ${cp2x},${curr.y} ${curr.x},${curr.y}`;
            }
            return d;
        };

        const pathD = createSmoothPath(points);
        const areaPath = pathD + ` L ${points[points.length - 1].x},${graphHeight - padding.bottom} L ${points[0].x},${graphHeight - padding.bottom} Z`;

        return (
            <Svg width={graphWidth} height={graphHeight}>
                <Defs>
                    <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={COLORS.primary} stopOpacity="0.3" />
                        <Stop offset="1" stopColor={COLORS.primary} stopOpacity="0" />
                    </LinearGradient>
                    <LinearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0" stopColor={COLORS.primary} stopOpacity="0.8" />
                        <Stop offset="1" stopColor={COLORS.primaryDark} stopOpacity="1" />
                    </LinearGradient>
                </Defs>

                {/* Y-axis labels */}
                {yAxisValues.map((val, i) => {
                    const y = padding.top + (i * (graphHeight - padding.top - padding.bottom) / yAxisSteps);
                    return (
                        <G key={`y-${i}`}>
                            <Line
                                x1={padding.left}
                                y1={y}
                                x2={graphWidth - padding.right}
                                y2={y}
                                stroke={COLORS.border}
                                strokeWidth={1}
                                strokeDasharray={i === yAxisSteps ? undefined : "4 4"}
                            />
                            <SvgText
                                x={padding.left - 8}
                                y={y + 4}
                                fontSize="10"
                                fill={COLORS.textMuted}
                                textAnchor="end"
                            >
                                {formatShortDuration(val)}
                            </SvgText>
                        </G>
                    );
                })}

                {/* Area Fill */}
                <Path d={areaPath} fill="url(#areaGrad)" />

                {/* Line */}
                <Path d={pathD} stroke="url(#lineGrad)" strokeWidth={3} fill="none" strokeLinecap="round" />

                {/* Points and Labels */}
                {points.map((p, i) => (
                    <G key={i}>
                        {/* Outer glow */}
                        <Circle cx={p.x} cy={p.y} r={8} fill={COLORS.primary} opacity={0.2} />
                        {/* Main dot */}
                        <Circle cx={p.x} cy={p.y} r={5} fill={COLORS.white} stroke={COLORS.primary} strokeWidth={2.5} />

                        {/* Value label for first, last, and min/max */}
                        {(i === 0 || i === points.length - 1 || p.val === Math.min(...points.map(pt => pt.val)) || p.val === Math.max(...points.map(pt => pt.val))) && (
                            <SvgText
                                x={p.x}
                                y={p.y - 14}
                                fontSize="11"
                                fontWeight="bold"
                                fill={i === points.length - 1 ? COLORS.primary : COLORS.text}
                                textAnchor="middle"
                            >
                                {formatShortDuration(p.val)}
                            </SvgText>
                        )}

                        {/* Date label */}
                        <SvgText
                            x={p.x}
                            y={graphHeight - padding.bottom + (isAtLeastTablet ? 24 : 16)}
                            fontSize={isAtLeastTablet ? 14 : 10}
                            fill={COLORS.textMuted}
                            textAnchor="middle"
                        >
                            {`${p.date.getMonth() + 1}/${p.date.getDate()}`}
                        </SvgText>
                    </G>
                ))}
            </Svg>
        );
    };

    // Helper to calculate top 3 hard questions
    const getTopHardQuestions = (analysis: QuestionAnalysis[]) => {
        return [...analysis].sort((a, b) => b.roomAvgMs - a.roomAvgMs).slice(0, 3);
    };

    // Helper to calculate participant ranking
    const getParticipantRankings = (results: ParticipantResult[]) => {
        const completed = results
            .filter(p => p.status === "COMPLETED")
            .sort((a, b) => {
                // Pace is duration / count
                const paceA = a.durationMs / (exam?.total_questions || 1);
                const paceB = b.durationMs / (exam?.total_questions || 1);
                return paceA - paceB;
            });

        return completed.map((p, index) => ({
            ...p,
            rank: index + 1,
            avgPace: p.durationMs / (exam?.total_questions || 1)
        }));
    };

    // Exam Analysis View - Compare with others
    const renderExamAnalysisView = () => {
        if (!exam) {
            return (
                <View style={styles.emptyContainer}>
                    <Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} />
                    <Typography.Body1 align="center" color={COLORS.textMuted} style={{ marginTop: SPACING.md }}>
                        분석할 시험을 선택해주세요
                    </Typography.Body1>
                </View>
            );
        }

        if (loading) {
            return (
                <View style={styles.centerLoading}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            );
        }

        const completedCount = completedParticipants.length;
        const totalCount = participants.length;
        const inProgressCount = participants.filter(p => p.status === "IN_PROGRESS").length;
        const notStartedCount = participants.filter(p => p.status === "NOT_STARTED").length;

        // Statistics
        const durations = completedParticipants.map(p => p.durationMs);
        const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
        const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
        const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
        const avgPerQuestion = exam.total_questions > 0 ? avgDuration / exam.total_questions : 0;
        const myPerQuestion = myResult?.status === "COMPLETED" && exam.total_questions > 0
            ? myResult.durationMs / exam.total_questions
            : null;
        const paceMax = Math.max(avgPerQuestion, myPerQuestion ?? 0, 1);

        const myPercentile = myResult?.status === "COMPLETED" && durations.length > 0
            ? getPercentileRank(myResult.durationMs, durations, true)
            : null;
        const myRecords = myResult?.records ?? [];
        const questionAnalysis = myResult?.status === "COMPLETED" && myRecords.length > 0 && exam
            ? analyzeQuestions(
                myRecords.map(r => ({ question_no: r.question_no, duration_ms: r.duration_ms })),
                completedParticipants
                    .flatMap(p => p.records)
                    .map(r => ({ question_no: r.question_no, duration_ms: r.duration_ms })),
                exam.total_questions,
                userId || undefined
            )
            : [];
        const maxQuestionDuration = questionAnalysis.length > 0
            ? Math.max(...questionAnalysis.map(q => Math.max(q.myDurationMs, q.roomAvgMs)), 1)
            : 1;
        const validMyQuestions = questionAnalysis.filter(q => q.myDurationMs > 0);
        const validRoomQuestions = questionAnalysis.filter(q => q.roomAvgMs > 0);
        const slowestRoomQuestion = [...validRoomQuestions].sort((a, b) => b.roomAvgMs - a.roomAvgMs)[0];
        const slowestMyQuestion = [...validMyQuestions].sort((a, b) => b.myDurationMs - a.myDurationMs)[0];
        const fastestMyQuestion = [...validMyQuestions].sort((a, b) => a.myDurationMs - b.myDurationMs)[0];
        const highlightCandidates: Array<{ key: string; label: string; data?: QuestionAnalysis }> = [
            { key: "slowest_room", label: "가장 오래 걸린 문항", data: slowestRoomQuestion },
            { key: "slowest_me", label: "내가 가장 오래 걸린 문항", data: slowestMyQuestion },
            { key: "fastest_me", label: "내가 가장 빨리 푼 문항", data: fastestMyQuestion },
        ];
        const highlightQuestions = highlightCandidates.reduce<Array<{ key: string; label: string; data: QuestionAnalysis }>>((acc, item) => {
            if (!item.data) return acc;
            if (acc.some(existing => existing.data.questionNo === item.data?.questionNo)) return acc;
            acc.push({ key: item.key, label: item.label, data: item.data });
            return acc;
        }, []);

        const handleQuestionSelect = (questionNo: number) => {
            if (!exam) return;
            router.push({
                pathname: "/room/[id]/exam/[examId]/question-analysis",
                params: { id: roomId, examId: exam.id, questionNo: String(questionNo) }
            });
        };

        const topHardQuestions = getTopHardQuestions(questionAnalysis);
        const rankings = getParticipantRankings(participants);
        const myRankInfo = rankings.find(r => r.isMe);

        return (
            <>
                {/* Selection Section */}
                <View style={{ gap: SPACING.sm, marginBottom: SPACING.md }}>
                    {/* Subject Selector */}
                    <View style={styles.dropdownSection}>
                        <Pressable
                            style={styles.dropdownButton}
                            onPress={() => setShowSubjectModal(true)}
                        >
                            <View style={{ flex: 1 }}>
                                <Typography.Caption color={COLORS.textMuted}>과목 선택</Typography.Caption>
                                <Typography.Body1 bold color={COLORS.text}>{selectedSubject}</Typography.Body1>
                            </View>
                            <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
                        </Pressable>
                    </View>

                    {/* Exam Selector */}
                    <View style={styles.dropdownSection}>
                        <Pressable
                            style={[styles.dropdownButton, filteredExams.length === 0 && { opacity: 0.5 }]}
                            onPress={() => filteredExams.length > 0 && setShowExamModal(true)}
                            disabled={filteredExams.length === 0}
                        >
                            <View style={{ flex: 1 }}>
                                <Typography.Caption color={COLORS.textMuted}>시험 선택</Typography.Caption>
                                <Typography.Body1 bold color={COLORS.text} numberOfLines={1}>
                                    {exam?.title?.replace(/^(\[.*?\]\s*|.*?•\s*)+/, "") ?? "해당 과목에 시험이 없습니다"}
                                </Typography.Body1>
                            </View>
                            <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
                        </Pressable>
                    </View>
                </View>

                {!exam ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} />
                        <Typography.Body1 align="center" color={COLORS.textMuted} style={{ marginTop: SPACING.md }}>
                            분석할 시험을 선택해주세요
                        </Typography.Body1>
                    </View>
                ) : (
                    <>
                        {/* Summary: My Rank & Leaderboard */}
                        {myRankInfo && (
                            <Section title="나의 순위">
                                <Card padding="xl" radius="xxl" style={styles.heroCard}>
                                    <View style={styles.heroHeader}>
                                        <View style={styles.percentileBadge}>
                                            <Typography.Label bold color={COLORS.white}>페이스 순위</Typography.Label>
                                        </View>
                                    </View>
                                    <Typography.H1 bold color={COLORS.text} style={styles.heroPercentile}>
                                        {myRankInfo.rank}위
                                    </Typography.H1>
                                    <Typography.Body2 color={COLORS.textMuted} align="center">
                                        완료 인원 {rankings.length}명 중
                                    </Typography.Body2>

                                    <View style={styles.heroStats}>
                                        <View style={styles.heroStatItem}>
                                            <Typography.Caption color={COLORS.textMuted}>나의 페이스</Typography.Caption>
                                            <Typography.Subtitle1 bold color={COLORS.primary}>
                                                {formatShortDuration(myRankInfo.avgPace)}
                                            </Typography.Subtitle1>
                                        </View>
                                        <View style={styles.heroStatDivider} />
                                        <View style={styles.heroStatItem}>
                                            <Typography.Caption color={COLORS.textMuted}>스터디 평균</Typography.Caption>
                                            <Typography.Subtitle1 bold color={COLORS.text}>
                                                {formatShortDuration(avgPerQuestion)}
                                            </Typography.Subtitle1>
                                        </View>
                                    </View>
                                </Card>
                            </Section>
                        )}

                        {/* Top 3 Hardest Questions */}
                        {topHardQuestions.length > 0 && (
                            <Section title="가장 오래 걸린 문항 TOP 3" description="스터디 평균 소요 시간 기준">
                                <View style={styles.highlightGrid}>
                                    {topHardQuestions.map((q, idx) => {
                                        const myRatio = q.myDurationMs > 0 ? (q.myDurationMs / maxQuestionDuration) * 100 : 0;
                                        const roomRatio = q.roomAvgMs > 0 ? (q.roomAvgMs / maxQuestionDuration) * 100 : 0;

                                        return (
                                            <Pressable
                                                key={q.questionNo}
                                                onPress={() => handleQuestionSelect(q.questionNo)}
                                                style={({ pressed }) => [
                                                    styles.highlightCard,
                                                    pressed && styles.highlightCardPressed
                                                ]}
                                            >
                                                <View style={styles.highlightHeader}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                        <View style={[styles.topBadge, idx === 0 && { backgroundColor: COLORS.error }]}>
                                                            <Typography.Label bold color={COLORS.white}>{idx + 1}</Typography.Label>
                                                        </View>
                                                        <Typography.Subtitle1 bold color={COLORS.text}>{q.questionNo}번</Typography.Subtitle1>
                                                    </View>
                                                    <Typography.Caption color={COLORS.textMuted}>평균 {formatShortDuration(q.roomAvgMs)}</Typography.Caption>
                                                </View>
                                                <View style={styles.highlightBars}>
                                                    <View style={styles.highlightRow}>
                                                        <Typography.Caption color={COLORS.textMuted} style={styles.highlightLabel}>나</Typography.Caption>
                                                        <View style={styles.highlightTrack}>
                                                            {q.myDurationMs > 0 && <View style={[styles.highlightFill, { width: `${myRatio}%` }]} />}
                                                        </View>
                                                        <Typography.Caption color={COLORS.textMuted} style={styles.highlightValue}>
                                                            {q.myDurationMs > 0 ? formatShortDuration(q.myDurationMs) : "—"}
                                                        </Typography.Caption>
                                                    </View>
                                                    <View style={styles.highlightRow}>
                                                        <Typography.Caption color={COLORS.textMuted} style={styles.highlightLabel}>평균</Typography.Caption>
                                                        <View style={styles.highlightTrack}>
                                                            <View style={[styles.highlightFill, styles.highlightFillAvg, { width: `${roomRatio}%` }]} />
                                                        </View>
                                                        <Typography.Caption color={COLORS.textMuted} style={styles.highlightValue}>
                                                            {formatShortDuration(q.roomAvgMs)}
                                                        </Typography.Caption>
                                                    </View>
                                                </View>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </Section>
                        )}

                        {/* Participant Pace List */}
                        {rankings.length > 0 && (
                            <Section title="참여자별 평균 페이스">
                                <View style={styles.historyList}>
                                    {rankings.map((p) => (
                                        <View key={p.userId} style={[styles.historyItem, p.isMe && { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight + '20' }]}>
                                            <View style={[styles.historyRank, p.isMe && { backgroundColor: COLORS.primary }]}>
                                                <Typography.Caption bold color={p.isMe ? COLORS.white : COLORS.textMuted}>{p.rank}</Typography.Caption>
                                            </View>
                                            <View style={styles.historyContent}>
                                                <Typography.Body1 bold>{p.name}</Typography.Body1>
                                                <Typography.Caption color={COLORS.textMuted}>{p.status === "COMPLETED" ? "응시 완료" : "응시 중"}</Typography.Caption>
                                            </View>
                                            <View style={styles.historyStats}>
                                                <Typography.Subtitle2 bold color={COLORS.text}>
                                                    {formatShortDuration(p.avgPace)}/문항
                                                </Typography.Subtitle2>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </Section>
                        )}

                        {/* Detailed View Button */}
                        <Section title="상세 분석">
                            <Card padding="lg" radius="xl" style={styles.questionChartCard}>
                                <Typography.Body2 color={COLORS.textMuted} style={{ marginBottom: SPACING.md }}>
                                    문항별로 '나의 페이스'와 '그룹 평균 페이스'를 상세하게 비교합니다.
                                </Typography.Body2>
                                <Button
                                    label="문항별 상세 분석 보기"
                                    variant="outline"
                                    onPress={() => router.push({
                                        pathname: "/room/[id]/exam/[examId]/question-analysis",
                                        params: { id: roomId, examId: exam.id }
                                    })}
                                    icon="analytics-outline"
                                />
                                {questionAnalysis.length > 0 && (
                                    <View style={{ marginTop: SPACING.lg }}>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            {renderQuestionBarChart(questionAnalysis, maxQuestionDuration, handleQuestionSelect)}
                                        </ScrollView>
                                    </View>
                                )}
                            </Card>
                        </Section>
                    </>
                )}
            </>
        );
    };

    // Distribution Chart (Bell curve-ish visualization)
    const renderDistributionChart = (durations: number[], myDuration: number, min: number, max: number) => {
        const chartWidth = width - 80;
        const chartHeight = 80;
        const range = max - min || 1;

        // Create histogram buckets
        const bucketCount = Math.min(10, durations.length);
        const bucketSize = range / bucketCount;
        const buckets = Array(bucketCount).fill(0);

        durations.forEach(d => {
            const bucketIndex = Math.min(Math.floor((d - min) / bucketSize), bucketCount - 1);
            buckets[bucketIndex]++;
        });

        const maxBucket = Math.max(...buckets);
        const myBucketIndex = Math.min(Math.floor((myDuration - min) / bucketSize), bucketCount - 1);
        const myPosition = ((myDuration - min) / range) * chartWidth;

        return (
            <View style={{ width: chartWidth, height: chartHeight, marginTop: SPACING.lg }}>
                <Svg width={chartWidth} height={chartHeight}>
                    {/* Histogram bars */}
                    {buckets.map((count, i) => {
                        const barWidth = chartWidth / bucketCount - 2;
                        const barHeight = maxBucket > 0 ? (count / maxBucket) * (chartHeight - 30) : 0;
                        const x = i * (chartWidth / bucketCount) + 1;
                        const y = chartHeight - 20 - barHeight;

                        return (
                            <Rect
                                key={i}
                                x={x}
                                y={y}
                                width={barWidth}
                                height={barHeight}
                                rx={4}
                                fill={i === myBucketIndex ? COLORS.primary : COLORS.surfaceVariant}
                                opacity={i === myBucketIndex ? 1 : 0.7}
                            />
                        );
                    })}

                    {/* My position indicator */}
                    <Line
                        x1={myPosition}
                        y1={0}
                        x2={myPosition}
                        y2={chartHeight - 20}
                        stroke={COLORS.primary}
                        strokeWidth={2}
                        strokeDasharray="4 2"
                    />
                    <Circle cx={myPosition} cy={chartHeight - 20} r={6} fill={COLORS.primary} />

                    {/* Labels */}
                    <SvgText x={0} y={chartHeight - 4} fontSize="10" fill={COLORS.textMuted}>
                        빠름
                    </SvgText>
                    <SvgText x={chartWidth} y={chartHeight - 4} fontSize="10" fill={COLORS.textMuted} textAnchor="end">
                        느림
                    </SvgText>
                </Svg>
            </View>
        );
    };

    const renderQuestionBarChart = (
        data: QuestionAnalysis[],
        maxDuration: number,
        onSelect?: (questionNo: number) => void
    ) => {
        const chartHeight = 180;
        const padding = { top: 16, right: 16, bottom: 28, left: 40 };
        const barWidth = 10;
        const gap = 6;
        const chartWidth = Math.max(
            width - 72,
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
            <Svg width={chartWidth} height={chartHeight}>
                {Array.from({ length: tickCount + 1 }).map((_, idx) => {
                    const value = (maxDuration / tickCount) * idx;
                    const y = chartHeight - padding.bottom - (value / maxDuration) * chartInnerHeight;
                    return (
                        <G key={`tick-${idx}`}>
                            <Line
                                x1={padding.left}
                                y1={y}
                                x2={chartWidth - padding.right}
                                y2={y}
                                stroke={COLORS.border}
                                strokeWidth={1}
                            />
                            <SvgText
                                x={padding.left - 6}
                                y={y + 3}
                                fontSize="9"
                                fill={COLORS.textMuted}
                                textAnchor="end"
                            >
                                {formatShortDuration(value)}
                            </SvgText>
                        </G>
                    );
                })}
                <Line
                    x1={padding.left}
                    y1={chartHeight - padding.bottom}
                    x2={chartWidth - padding.right}
                    y2={chartHeight - padding.bottom}
                    stroke={COLORS.border}
                    strokeWidth={1}
                />
                <SvgText x={padding.left} y={padding.top} fontSize="10" fill={COLORS.textMuted}>
                    느림
                </SvgText>
                <SvgText x={padding.left} y={chartHeight - 6} fontSize="10" fill={COLORS.textMuted}>
                    빠름
                </SvgText>

                {data.map((item, idx) => {
                    const barHeight = Math.max(
                        2,
                        (item.myDurationMs / maxDuration) * chartInnerHeight
                    );
                    const x = padding.left + idx * (barWidth + gap);
                    const y = chartHeight - padding.bottom - barHeight;
                    const avgY = chartHeight - padding.bottom - (item.roomAvgMs / maxDuration) * chartInnerHeight;

                    return (
                        <G key={item.questionNo}>
                            <Rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={barHeight}
                                rx={3}
                                fill={getBarColor(item)}
                                onPress={() => onSelect?.(item.questionNo)}
                            />
                            {item.roomAvgMs > 0 && (
                                <Line
                                    x1={x}
                                    x2={x + barWidth}
                                    y1={avgY}
                                    y2={avgY}
                                    stroke={COLORS.textMuted}
                                    strokeWidth={1}
                                />
                            )}
                            {(idx % labelEvery === 0 || idx === data.length - 1) && (
                                <SvgText
                                    x={x + barWidth / 2}
                                    y={chartHeight - padding.bottom + 16}
                                    fontSize="9"
                                    fill={COLORS.textMuted}
                                    textAnchor="middle"
                                >
                                    {item.questionNo}
                                </SvgText>
                            )}
                        </G>
                    );
                })}
            </Svg>
        );
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </View>
        );
    }

    return (
        <>
            <View style={styles.container}>
                <ScreenHeader
                    title="분석"
                    showBack={false}
                    align="left"
                    rightElement={
                        <TouchableOpacity
                            onPress={() => router.push(`/room/${roomId}/settings`)}
                            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Ionicons name="settings-outline" size={22} color={COLORS.text} />
                        </TouchableOpacity>
                    }
                />

                {/* View Mode Toggle */}
                <View style={[styles.toggleContainer, isAtLeastTablet && styles.toggleContainerTablet]}>
                    <ResponsiveContainer maxWidth={isAtLeastTablet ? 600 : undefined}>
                        <View style={[styles.toggleWrapper, isAtLeastTablet && styles.toggleWrapperTablet]}>
                            <Pressable
                                onPress={() => setViewMode("my_progress")}
                                style={[styles.toggleButton, isAtLeastTablet && styles.toggleButtonTablet, viewMode === "my_progress" && styles.toggleButtonActive]}
                            >
                                <Ionicons
                                    name="trending-up"
                                    size={isAtLeastTablet ? 24 : 18}
                                    color={viewMode === "my_progress" ? COLORS.primary : COLORS.textMuted}
                                />
                                <Text style={[
                                    styles.toggleText,
                                    isAtLeastTablet && styles.toggleTextTablet,
                                    viewMode === "my_progress" ? styles.toggleTextActive : styles.toggleTextInactive
                                ]}>
                                    나의 성장
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={() => setViewMode("exam_analysis")}
                                style={[styles.toggleButton, isAtLeastTablet && styles.toggleButtonTablet, viewMode === "exam_analysis" && styles.toggleButtonActive]}
                            >
                                <Ionicons
                                    name="people"
                                    size={isAtLeastTablet ? 24 : 18}
                                    color={viewMode === "exam_analysis" ? COLORS.primary : COLORS.textMuted}
                                />
                                <Text style={[
                                    styles.toggleText,
                                    isAtLeastTablet && styles.toggleTextTablet,
                                    viewMode === "exam_analysis" ? styles.toggleTextActive : styles.toggleTextInactive
                                ]}>
                                    시험 분석
                                </Text>
                            </Pressable>
                        </View>
                    </ResponsiveContainer>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <ResponsiveContainer maxWidth={isAtLeastTablet ? 1200 : 800}>
                        {exams.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <View style={styles.emptyIconBox}>
                                    <Ionicons name="layers-outline" size={48} color={COLORS.textMuted} />
                                </View>
                                <Typography.H3 align="center" color={COLORS.text} bold style={{ marginTop: SPACING.lg }}>
                                    아직 시험이 없어요
                                </Typography.H3>
                                <Typography.Body2 align="center" color={COLORS.textMuted} style={{ marginTop: SPACING.sm }}>
                                    시험이 등록되면 이곳에서{"\n"}분석 결과를 확인할 수 있어요
                                </Typography.Body2>
                            </View>
                        ) : (
                            viewMode === "my_progress" ? renderMyProgressView() : renderExamAnalysisView()
                        )}
                    </ResponsiveContainer>
                </ScrollView>
            </View>

            {/* Global Selection Modals */}
            <Modal
                visible={showSubjectModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowSubjectModal(false)}
            >
                <Pressable style={styles.modalBackdrop} onPress={() => setShowSubjectModal(false)}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Typography.Subtitle1 bold>과목 선택</Typography.Subtitle1>
                            <Pressable onPress={() => setShowSubjectModal(false)}>
                                <Ionicons name="close" size={24} color={COLORS.textMuted} />
                            </Pressable>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} style={styles.modalList}>
                            {uniqueSubjects.map(s => {
                                const examCount = s === "전체"
                                    ? myAttempts.length
                                    : myAttempts.filter(a => (getRoomExamSubjectFromTitle(a.room_exams.title) ?? "기타") === s).length;
                                return (
                                    <Pressable
                                        key={s}
                                        style={[styles.modalItem, selectedSubject === s && styles.modalItemActive]}
                                        onPress={() => {
                                            setSelectedSubject(s);
                                            setShowSubjectModal(false);
                                            // Reset exam if it doesn't belong to the new subject
                                            const subjectExams = exams.filter(e => (getRoomExamSubjectFromTitle(e.title) ?? "기타") === s);
                                            if (s !== "전체" && subjectExams.length > 0) {
                                                setSelectedExamId(subjectExams[0].id);
                                            }
                                        }}
                                    >
                                        <View style={styles.modalItemContent}>
                                            <Typography.Body1 bold={selectedSubject === s} color={selectedSubject === s ? COLORS.primary : COLORS.text}>
                                                {s}
                                            </Typography.Body1>
                                            <Typography.Caption color={COLORS.textMuted}>
                                                {examCount}회 응시
                                            </Typography.Caption>
                                        </View>
                                        {selectedSubject === s && (
                                            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                                        )}
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>

            <Modal
                visible={showExamModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowExamModal(false)}
            >
                <Pressable style={styles.modalBackdrop} onPress={() => setShowExamModal(false)}>
                    <View style={[styles.modalContent, styles.modalContentLarge]}>
                        <View style={styles.modalHeader}>
                            <Typography.Subtitle1 bold>시험 선택</Typography.Subtitle1>
                            <Pressable onPress={() => setShowExamModal(false)}>
                                <Ionicons name="close" size={24} color={COLORS.textMuted} />
                            </Pressable>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} style={styles.modalList}>
                            {filteredExams.map(e => (
                                <Pressable
                                    key={e.id}
                                    style={[styles.modalItem, selectedExamId === e.id && styles.modalItemActive]}
                                    onPress={() => {
                                        setSelectedExamId(e.id);
                                        setShowExamModal(false);
                                    }}
                                >
                                    <View style={styles.modalItemContent}>
                                        <Typography.Body1 bold={selectedExamId === e.id} color={selectedExamId === e.id ? COLORS.primary : COLORS.text} numberOfLines={1}>
                                            {e.title.replace(/^(\[.*?\]\s*|.*?•\s*)+/, "")}
                                        </Typography.Body1>
                                        <View style={styles.modalItemMeta}>
                                            <Typography.Caption color={COLORS.textMuted}>
                                                {e.total_questions}문항 • {new Date(e.created_at).toLocaleDateString()}
                                            </Typography.Caption>
                                        </View>
                                    </View>
                                    {selectedExamId === e.id && (
                                        <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                                    )}
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    scrollContent: {
        padding: SPACING.lg,
        paddingBottom: 40,
        gap: SPACING.xl,
    },
    toggleContainer: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
    },
    toggleContainerTablet: {
        paddingTop: SPACING.md,
        paddingBottom: SPACING.xl,
        alignItems: 'center',
    },
    toggleWrapper: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.small,
    },
    toggleWrapperTablet: {
        padding: 6,
        borderRadius: RADIUS.xxl,
    },
    toggleButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.xs,
        paddingVertical: 12,
        borderRadius: RADIUS.lg,
    },
    toggleButtonTablet: {
        paddingVertical: 16,
        gap: SPACING.sm,
        borderRadius: RADIUS.xl,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '700',
    },
    toggleTextTablet: {
        fontSize: 16,
    },
    toggleTextActive: {
        color: COLORS.text,
    },
    toggleTextInactive: {
        color: COLORS.textMuted,
    },
    toggleButtonActive: {
        backgroundColor: COLORS.bg,
    },
    // Dropdown Styles
    dropdownSection: {
        paddingHorizontal: SPACING.xl,
        marginTop: SPACING.sm,
        marginBottom: SPACING.md,
    },
    dropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.white,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.small,
    },
    // Modal Styles
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        maxHeight: '60%',
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: SPACING.lg,
        ...SHADOWS.heavy,
    },
    modalContentLarge: {
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
        paddingBottom: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    modalList: {
        maxHeight: 400,
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.sm,
        borderRadius: 12,
    },
    modalItemActive: {
        backgroundColor: COLORS.primaryLight,
    },
    modalItemContent: {
        flex: 1,
    },
    modalItemMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    chipSection: {
        marginTop: SPACING.sm,
        marginBottom: SPACING.md,
    },
    chipScroll: {
        paddingHorizontal: SPACING.xl,
        gap: SPACING.sm,
    },
    chip: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    activeChip: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    selectorSection: {
        marginTop: SPACING.md,
        marginBottom: 0,
    },
    examSelectorScroll: {
        paddingHorizontal: SPACING.xl,
        gap: SPACING.md,
        paddingBottom: SPACING.lg,
    },
    examTab: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: 12,
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        minWidth: 120,
    },
    selectedExamTab: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    emptyContainer: {
        padding: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyIconBox: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
    },
    singleRecordCard: {
        alignItems: 'center',
    },
    singleRecordHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    recordBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    singleRecordStats: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.lg,
        width: '100%',
        justifyContent: 'center',
    },
    recordStatItem: {
        alignItems: 'center',
        flex: 1,
    },
    recordStatDivider: {
        width: 1,
        height: 32,
        backgroundColor: COLORS.border,
    },
    summaryGrid: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    summaryCard: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        ...SHADOWS.small,
    },
    summaryCardTablet: {
        padding: SPACING.xl,
        borderRadius: RADIUS.xxl,
    },
    positiveCard: {
        backgroundColor: '#ECFDF5',
        borderColor: '#A7F3D0',
    },
    negativeCard: {
        backgroundColor: COLORS.errorLight,
        borderColor: '#FECACA',
    },
    summaryCardHeader: {
        marginBottom: SPACING.sm,
    },
    chartCard: {
        alignItems: 'center',
        paddingVertical: SPACING.xl,
    },
    historyList: {
        gap: SPACING.sm,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        borderRadius: 16,
        gap: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    historyItemTablet: {
        paddingVertical: SPACING.lg,
        paddingHorizontal: SPACING.xl,
        borderRadius: RADIUS.xl,
        gap: SPACING.lg,
    },
    historyStatsTablet: {
        gap: 8,
    },
    diffBadgeTablet: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    historyItemPressed: {
        backgroundColor: COLORS.surfaceVariant,
    },
    historyRank: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
    },
    historyRankTablet: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    historyContent: {
        flex: 1,
    },
    historyStats: {
        alignItems: 'flex-end',
    },
    diffBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        marginTop: 2,
    },
    diffPositive: {},
    diffNegative: {},
    heroCard: {
        marginHorizontal: SPACING.xl,
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        ...SHADOWS.medium,
    },
    heroHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    percentileBadge: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    heroPercentile: {
        fontSize: 56,
        marginTop: SPACING.xs,
    },
    distributionContainer: {
        width: '100%',
        alignItems: 'center',
        marginTop: SPACING.md,
    },
    heroStats: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.xl,
        width: '100%',
        justifyContent: 'center',
    },
    heroStatItem: {
        alignItems: 'center',
        flex: 1,
    },
    heroStatDivider: {
        width: 1,
        height: 32,
        backgroundColor: COLORS.border,
    },
    highlightGrid: {
        gap: SPACING.md,
    },
    highlightCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    highlightCardPressed: {
        backgroundColor: COLORS.surfaceVariant,
    },
    firstExamBadge: {
        backgroundColor: COLORS.surfaceVariant,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    topBadge: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    highlightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.sm,
    },
    highlightBars: {
        gap: SPACING.xs,
    },
    highlightRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    highlightLabel: {
        width: 28,
    },
    highlightValue: {
        width: 56,
        textAlign: 'right',
    },
    highlightTrack: {
        flex: 1,
        height: 8,
        backgroundColor: COLORS.surfaceVariant,
        borderRadius: 4,
        overflow: 'hidden',
    },
    highlightFill: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 4,
    },
    highlightFillAvg: {
        backgroundColor: COLORS.primaryLight,
    },
    questionChartCard: {
        paddingTop: SPACING.lg,
    },
    questionChartScroll: {
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.sm,
    },
    questionChartLegend: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.lg,
        marginTop: SPACING.sm,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendSwatch: {
        width: 12,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.primary,
    },
    legendSwatchMe: {
        backgroundColor: COLORS.primary,
    },
    legendLine: {
        width: 12,
        height: 2,
        borderRadius: 1,
        backgroundColor: COLORS.textMuted,
    },
    statusBar: {
        flexDirection: 'row',
        height: 10,
        borderRadius: 6,
        overflow: 'hidden',
        backgroundColor: COLORS.surfaceVariant,
    },
    statusSegment: {
        height: '100%',
    },
    statusSegmentCompleted: {
        backgroundColor: COLORS.primary,
    },
    statusSegmentInProgress: {
        backgroundColor: COLORS.warning,
    },
    statusSegmentPending: {
        backgroundColor: COLORS.border,
    },
    statusLegend: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.md,
        marginTop: SPACING.md,
    },
    statusLegendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusDotCompleted: {
        backgroundColor: COLORS.primary,
    },
    statusDotInProgress: {
        backgroundColor: COLORS.warning,
    },
    statusDotPending: {
        backgroundColor: COLORS.border,
    },
    paceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    paceLabel: {
        width: 36,
    },
    paceValue: {
        width: 60,
        textAlign: 'right',
    },
    paceBarTrack: {
        flex: 1,
        height: 8,
        backgroundColor: COLORS.surfaceVariant,
        borderRadius: 4,
        overflow: 'hidden',
    },
    paceBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    paceBarFillMe: {
        backgroundColor: COLORS.primary,
    },
    paceBarFillAvg: {
        backgroundColor: COLORS.primaryLight,
    },
    notCompletedCard: {
        marginHorizontal: SPACING.xl,
        alignItems: 'center',
        borderStyle: 'dashed',
    },
    centerLoading: {
        padding: 60,
        alignItems: 'center',
    },
},);
