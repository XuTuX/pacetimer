import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useGlobalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from "react-native-svg";
import { QuestionBar } from "../../../../components/analysis/QuestionBar";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { ScreenHeader } from "../../../../components/ui/ScreenHeader";
import { Section } from "../../../../components/ui/Section";
import { Typography } from "../../../../components/ui/Typography";
import type { Database } from "../../../../lib/db-types";
import { analyzeQuestions } from "../../../../lib/insights";
import { getRoomExamSubjectFromTitle } from "../../../../lib/roomExam";
import { useSupabase } from "../../../../lib/supabase";
import { formatSupabaseError } from "../../../../lib/supabaseError";
import { COLORS, SHADOWS, SPACING } from "../../../../lib/theme";

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

// Helper to calculate standard deviation
function getStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
}

type ViewMode = "my_progress" | "exam_analysis" | "question_analysis";

export default function AnalysisScreen() {
    const supabase = useSupabase();
    const { userId } = useAuth();
    const router = useRouter();
    const { id, initialExamId } = useGlobalSearchParams<{ id: string, initialExamId?: string }>();
    const roomId = Array.isArray(id) ? id[0] : id;
    const { width } = useWindowDimensions();

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
            const improvement = ((first.val - last.val) / first.val) * 100;
            const avgVal = history.reduce((sum, h) => sum + h.val, 0) / history.length;
            const bestVal = Math.min(...history.map(h => h.val));
            const worstVal = Math.max(...history.map(h => h.val));

            return {
                improvement: Math.round(improvement),
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

                {/* Subject Selection Modal */}
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
                                        ? validMyAttempts.length
                                        : validMyAttempts.filter(a => (getRoomExamSubjectFromTitle(a.room_exams.title) ?? "기타") === s).length;
                                    return (
                                        <Pressable
                                            key={s}
                                            style={[styles.modalItem, selectedSubject === s && styles.modalItemActive]}
                                            onPress={() => {
                                                setSelectedSubject(s);
                                                setShowSubjectModal(false);
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
                        {stats && (
                            <Section title="성장 요약" description={`총 ${stats.totalExams}회 응시`}>
                                <View style={styles.summaryGrid}>
                                    <Card padding="lg" radius="xl" style={[
                                        styles.summaryCard,
                                        stats.improvement > 0 ? styles.positiveCard : styles.negativeCard
                                    ]}>
                                        <View style={styles.summaryCardHeader}>
                                            <Ionicons
                                                name={stats.improvement > 0 ? "trending-up" : "trending-down"}
                                                size={20}
                                                color={stats.improvement > 0 ? "#10B981" : COLORS.error}
                                            />
                                        </View>
                                        <Typography.H2 bold color={stats.improvement > 0 ? "#10B981" : COLORS.error}>
                                            {stats.improvement > 0 ? "-" : "+"}{Math.abs(stats.improvement)}%
                                        </Typography.H2>
                                        <Typography.Caption color={COLORS.textMuted}>첫 시험 대비</Typography.Caption>
                                    </Card>
                                    <Card padding="lg" radius="xl" style={styles.summaryCard}>
                                        <View style={styles.summaryCardHeader}>
                                            <Ionicons name="flash" size={20} color={COLORS.warning} />
                                        </View>
                                        <Typography.H2 bold color={COLORS.text}>
                                            {formatShortDuration(stats.bestPerQ)}
                                        </Typography.H2>
                                        <Typography.Caption color={COLORS.textMuted}>최고 기록</Typography.Caption>
                                    </Card>
                                </View>
                            </Section>
                        )}

                        {/* Growth Chart */}
                        <Section
                            title="문항당 시간 추이"
                            description="시험을 거듭할수록 어떻게 변화했는지 확인하세요"
                        >
                            <Card padding="lg" radius="xl" style={styles.chartCard}>
                                {renderGrowthChart(history)}
                            </Card>
                        </Section>

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
                                                pressed && styles.historyItemPressed
                                            ]}
                                        >
                                            <View style={styles.historyRank}>
                                                <Typography.Caption bold color={COLORS.textMuted}>#{rank}</Typography.Caption>
                                            </View>
                                            <View style={styles.historyContent}>
                                                <Typography.Body1 bold numberOfLines={1}>{h.title}</Typography.Body1>
                                                <Typography.Caption color={COLORS.textMuted}>
                                                    {h.date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} • {h.questions}문항
                                                </Typography.Caption>
                                            </View>
                                            <View style={styles.historyStats}>
                                                <Typography.Subtitle2 bold color={COLORS.primary}>
                                                    {formatShortDuration(h.val)}
                                                </Typography.Subtitle2>
                                                {diff !== null && (
                                                    <View style={[styles.diffBadge, diff > 0 ? styles.diffPositive : styles.diffNegative]}>
                                                        <Ionicons
                                                            name={diff > 0 ? "arrow-down" : "arrow-up"}
                                                            size={10}
                                                            color={diff > 0 ? "#10B981" : COLORS.error}
                                                        />
                                                        <Typography.Label color={diff > 0 ? "#10B981" : COLORS.error}>
                                                            {Math.abs(Math.round(diff))}%
                                                        </Typography.Label>
                                                    </View>
                                                )}
                                            </View>
                                            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
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

    // Growth Chart Component
    const renderGrowthChart = (history: { id: string; title: string; date: Date; val: number }[]) => {
        const graphWidth = Math.min(width - 72, 500);
        const graphHeight = 180;
        const padding = { top: 30, right: 20, bottom: 40, left: 50 };

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
                            y={graphHeight - padding.bottom + 16}
                            fontSize="10"
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
        const stdDev = getStdDev(durations);
        const median = durations.length > 0
            ? [...durations].sort((a, b) => a - b)[Math.floor(durations.length / 2)]
            : 0;
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

        return (
            <>
                {/* Exam Dropdown Selector */}
                <View style={styles.dropdownSection}>
                    <Pressable
                        style={styles.dropdownButton}
                        onPress={() => setShowExamModal(true)}
                    >
                        <View style={{ flex: 1 }}>
                            <Typography.Body1 bold color={COLORS.text} numberOfLines={1}>
                                {exam?.title?.replace(/^(\[.*?\]\s*|.*?•\s*)+/, "") ?? "시험 선택"}
                            </Typography.Body1>
                            {exam && (
                                <Typography.Caption color={COLORS.textMuted}>
                                    {new Date(exam.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </Typography.Caption>
                            )}
                        </View>
                        <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
                    </Pressable>
                </View>

                {/* Exam Selection Modal */}
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
                                {filteredExams.map(e => {
                                    const isSelected = selectedExamId === e.id;
                                    return (
                                        <Pressable
                                            key={e.id}
                                            style={[styles.modalItem, isSelected && styles.modalItemActive]}
                                            onPress={() => {
                                                setSelectedExamId(e.id);
                                                setShowExamModal(false);
                                            }}
                                        >
                                            <View style={styles.modalItemContent}>
                                                <Typography.Body1 bold={isSelected} color={isSelected ? COLORS.primary : COLORS.text} numberOfLines={1}>
                                                    {e.title.replace(/^(\[.*?\]\s*|.*?•\s*)+/, "")}
                                                </Typography.Body1>
                                                <View style={styles.modalItemMeta}>
                                                    <Typography.Caption color={COLORS.textMuted}>
                                                        {new Date(e.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                                                    </Typography.Caption>
                                                    <Typography.Caption color={COLORS.textMuted}> • </Typography.Caption>
                                                    <Typography.Caption color={COLORS.textMuted}>
                                                        {e.total_questions}문항
                                                    </Typography.Caption>
                                                </View>
                                            </View>
                                            {isSelected && (
                                                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                                            )}
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </Pressable>
                </Modal>

                {/* My Position Card - Hero Section */}
                {myResult?.status === "COMPLETED" && completedCount > 1 && myPercentile !== null && (
                    <Section title="">
                        <Card padding="xl" radius="xxl" style={styles.heroCard}>
                            <View style={styles.heroHeader}>
                                <View style={styles.percentileBadge}>
                                    <Typography.Label bold color={COLORS.white}>상위</Typography.Label>
                                </View>
                            </View>
                            <Typography.H1 bold color={COLORS.text} style={styles.heroPercentile}>
                                {100 - myPercentile}%
                            </Typography.H1>
                            <Typography.Body2 color={COLORS.textMuted} align="center">
                                {completedCount}명 중 {completedParticipants.sort((a, b) => a.durationMs - b.durationMs).findIndex(p => p.isMe) + 1}위
                            </Typography.Body2>

                            {/* Distribution Visualization */}
                            <View style={styles.distributionContainer}>
                                {renderDistributionChart(durations, myResult.durationMs, minDuration, maxDuration)}
                            </View>

                            <View style={styles.heroStats}>
                                <View style={styles.heroStatItem}>
                                    <Typography.Caption color={COLORS.textMuted}>나의 기록</Typography.Caption>
                                    <Typography.Subtitle1 bold color={COLORS.primary}>
                                        {formatDuration(myResult.durationMs)}
                                    </Typography.Subtitle1>
                                </View>
                                <View style={styles.heroStatDivider} />
                                <View style={styles.heroStatItem}>
                                    <Typography.Caption color={COLORS.textMuted}>스터디 평균</Typography.Caption>
                                    <Typography.Subtitle1 bold color={COLORS.text}>
                                        {formatDuration(avgDuration)}
                                    </Typography.Subtitle1>
                                </View>
                                <View style={styles.heroStatDivider} />
                                <View style={styles.heroStatItem}>
                                    <Typography.Caption color={COLORS.textMuted}>차이</Typography.Caption>
                                    <Typography.Subtitle1 bold color={myResult.durationMs < avgDuration ? "#10B981" : COLORS.error}>
                                        {myResult.durationMs < avgDuration ? "-" : "+"}{formatDuration(Math.abs(myResult.durationMs - avgDuration))}
                                    </Typography.Subtitle1>
                                </View>
                            </View>
                        </Card>
                    </Section>
                )}

                {/* Participation Breakdown */}
                {totalCount > 0 && (
                    <Section title="참여 현황" description={`${completedCount}명 완료`}>
                        <Card padding="lg" radius="xl">
                            <View style={styles.statusBar}>
                                {completedCount > 0 && (
                                    <View style={[styles.statusSegment, styles.statusSegmentCompleted, { flex: completedCount }]} />
                                )}
                                {inProgressCount > 0 && (
                                    <View style={[styles.statusSegment, styles.statusSegmentInProgress, { flex: inProgressCount }]} />
                                )}
                                {notStartedCount > 0 && (
                                    <View style={[styles.statusSegment, styles.statusSegmentPending, { flex: notStartedCount }]} />
                                )}
                            </View>
                            <View style={styles.statusLegend}>
                                <View style={styles.statusLegendItem}>
                                    <View style={[styles.statusDot, styles.statusDotCompleted]} />
                                    <Typography.Caption color={COLORS.textMuted}>
                                        완료 {Math.round((completedCount / totalCount) * 100)}%
                                    </Typography.Caption>
                                </View>
                                <View style={styles.statusLegendItem}>
                                    <View style={[styles.statusDot, styles.statusDotInProgress]} />
                                    <Typography.Caption color={COLORS.textMuted}>
                                        진행 중 {Math.round((inProgressCount / totalCount) * 100)}%
                                    </Typography.Caption>
                                </View>
                                <View style={styles.statusLegendItem}>
                                    <View style={[styles.statusDot, styles.statusDotPending]} />
                                    <Typography.Caption color={COLORS.textMuted}>
                                        미응시 {Math.round((notStartedCount / totalCount) * 100)}%
                                    </Typography.Caption>
                                </View>
                            </View>
                        </Card>
                    </Section>
                )}

                {/* Pace Comparison */}
                {completedCount > 0 && avgPerQuestion > 0 && (
                    <Section title="문항당 페이스" description="나의 속도 vs 스터디 평균">
                        <Card padding="lg" radius="xl">
                            <View style={styles.paceRow}>
                                <Typography.Caption color={COLORS.textMuted} style={styles.paceLabel}>나</Typography.Caption>
                                <View style={styles.paceBarTrack}>
                                    {myPerQuestion !== null && (
                                        <View
                                            style={[
                                                styles.paceBarFill,
                                                styles.paceBarFillMe,
                                                { width: `${(myPerQuestion / paceMax) * 100}%` }
                                            ]}
                                        />
                                    )}
                                </View>
                                <Typography.Caption color={COLORS.text} style={styles.paceValue}>
                                    {myPerQuestion !== null ? formatShortDuration(myPerQuestion) : "미완료"}
                                </Typography.Caption>
                            </View>
                            <View style={styles.paceRow}>
                                <Typography.Caption color={COLORS.textMuted} style={styles.paceLabel}>평균</Typography.Caption>
                                <View style={styles.paceBarTrack}>
                                    <View
                                        style={[
                                            styles.paceBarFill,
                                            styles.paceBarFillAvg,
                                            { width: `${(avgPerQuestion / paceMax) * 100}%` }
                                        ]}
                                    />
                                </View>
                                <Typography.Caption color={COLORS.text} style={styles.paceValue}>
                                    {formatShortDuration(avgPerQuestion)}
                                </Typography.Caption>
                            </View>
                        </Card>
                    </Section>
                )}

                {/* Statistics Grid */}
                {completedCount > 0 && (
                    <Section title="통계" description={`${completedCount}명 완주`}>
                        <View style={styles.statsGrid}>
                            <Card padding="md" radius="xl" style={styles.statItem}>
                                <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                                <Typography.H3 bold color={COLORS.text} style={{ marginTop: SPACING.sm }}>
                                    {formatShortDuration(avgDuration)}
                                </Typography.H3>
                                <Typography.Caption color={COLORS.textMuted}>평균</Typography.Caption>
                            </Card>
                            <Card padding="md" radius="xl" style={styles.statItem}>
                                <Ionicons name="analytics-outline" size={20} color={COLORS.warning} />
                                <Typography.H3 bold color={COLORS.text} style={{ marginTop: SPACING.sm }}>
                                    {formatShortDuration(median)}
                                </Typography.H3>
                                <Typography.Caption color={COLORS.textMuted}>중앙값</Typography.Caption>
                            </Card>
                            <Card padding="md" radius="xl" style={styles.statItem}>
                                <Ionicons name="flash-outline" size={20} color="#10B981" />
                                <Typography.H3 bold color={COLORS.text} style={{ marginTop: SPACING.sm }}>
                                    {formatShortDuration(minDuration)}
                                </Typography.H3>
                                <Typography.Caption color={COLORS.textMuted}>최고</Typography.Caption>
                            </Card>
                            <Card padding="md" radius="xl" style={styles.statItem}>
                                <Ionicons name="stats-chart-outline" size={20} color={COLORS.error} />
                                <Typography.H3 bold color={COLORS.text} style={{ marginTop: SPACING.sm }}>
                                    {formatShortDuration(stdDev)}
                                </Typography.H3>
                                <Typography.Caption color={COLORS.textMuted}>표준편차</Typography.Caption>
                            </Card>
                        </View>
                    </Section>
                )}

                {/* Not completed message */}
                {myResult?.status !== "COMPLETED" && (
                    <Card variant="outlined" padding="xl" radius="xl" style={styles.notCompletedCard}>
                        <Ionicons name="lock-closed-outline" size={32} color={COLORS.textMuted} />
                        <Typography.Body1 bold align="center" color={COLORS.text} style={{ marginTop: SPACING.md }}>
                            시험을 완료하면
                        </Typography.Body1>
                        <Typography.Body2 align="center" color={COLORS.textMuted}>
                            다른 참가자들과 비교 분석을 볼 수 있어요
                        </Typography.Body2>
                    </Card>
                )}

                {/* Question-by-Question Analysis Preview */}
                {myResult?.status === "COMPLETED" && myResult.records.length > 0 && exam && (
                    <Section title="문항별 분석" description="각 문항의 소요 시간 비교">
                        {(() => {
                            // Analyze questions using the helper function
                            const allRecordsFlat = completedParticipants.flatMap(p => p.records);
                            const questionAnalysis = analyzeQuestions(
                                myResult.records.map(r => ({ question_no: r.question_no, duration_ms: r.duration_ms })),
                                allRecordsFlat.map(r => ({ question_no: r.question_no, duration_ms: r.duration_ms })),
                                exam.total_questions,
                                userId || undefined
                            );
                            const maxDuration = questionAnalysis.length > 0
                                ? Math.max(...questionAnalysis.map(q => Math.max(q.myDurationMs, q.roomAvgMs)))
                                : 60000;

                            // Show first 5 questions as preview
                            return (
                                <>
                                    {questionAnalysis.slice(0, 5).map((q) => (
                                        <QuestionBar
                                            key={q.questionNo}
                                            data={q}
                                            maxDuration={maxDuration}
                                            showMedian={false}
                                        />
                                    ))}
                                    {questionAnalysis.length > 5 && (
                                        <Typography.Caption color={COLORS.textMuted} align="center" style={{ marginTop: SPACING.sm }}>
                                            +{questionAnalysis.length - 5}개 문항 더보기
                                        </Typography.Caption>
                                    )}
                                    <View style={{ marginTop: SPACING.lg }}>
                                        <Button
                                            label="상세 분석 보기"
                                            variant="outline"
                                            onPress={() => router.push({
                                                pathname: "/room/[id]/exam/[examId]/question-analysis",
                                                params: { id: roomId, examId: exam.id }
                                            })}
                                            icon="analytics-outline"
                                        />
                                    </View>
                                </>
                            );
                        })()}
                    </Section>
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
        <View style={styles.container}>
            <ScreenHeader title="분석" showBack={false} />

            {/* View Mode Toggle */}
            <View style={styles.toggleContainer}>
                <View style={styles.toggleWrapper}>
                    <Pressable
                        onPress={() => setViewMode("my_progress")}
                        style={[styles.toggleButton, viewMode === "my_progress" && styles.toggleButtonActive]}
                    >
                        <Ionicons
                            name="trending-up"
                            size={16}
                            color={viewMode === "my_progress" ? COLORS.white : COLORS.textMuted}
                        />
                        <Typography.Body2
                            bold
                            color={viewMode === "my_progress" ? COLORS.white : COLORS.textMuted}
                        >
                            나의 성장
                        </Typography.Body2>
                    </Pressable>
                    <Pressable
                        onPress={() => setViewMode("exam_analysis")}
                        style={[styles.toggleButton, viewMode === "exam_analysis" && styles.toggleButtonActive]}
                    >
                        <Ionicons
                            name="people"
                            size={16}
                            color={viewMode === "exam_analysis" ? COLORS.white : COLORS.textMuted}
                        />
                        <Typography.Body2
                            bold
                            color={viewMode === "exam_analysis" ? COLORS.white : COLORS.textMuted}
                        >
                            시험 분석
                        </Typography.Body2>
                    </Pressable>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
        justifyContent: "center",
        alignItems: "center",
    },
    scrollContent: {
        paddingBottom: 40,
    },
    toggleContainer: {
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
    },
    toggleWrapper: {
        flexDirection: 'row',
        backgroundColor: COLORS.surfaceVariant,
        borderRadius: 12,
        padding: 4,
    },
    toggleButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.xs,
        paddingVertical: 10,
        borderRadius: 10,
    },
    toggleButtonActive: {
        backgroundColor: COLORS.primary,
        ...SHADOWS.small,
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
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.md,
    },
    statItem: {
        flex: 1,
        minWidth: '45%',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        ...SHADOWS.small,
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
});
