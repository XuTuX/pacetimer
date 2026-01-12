import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useGlobalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { Line, Rect } from "react-native-svg";
import { Card } from "../../../../components/ui/Card";
import { CompareRow } from "../../../../components/ui/CompareRow";
import { ScreenHeader } from "../../../../components/ui/ScreenHeader";
import { Section } from "../../../../components/ui/Section";
import { StatCard } from "../../../../components/ui/StatCard";
import { Typography } from "../../../../components/ui/Typography";
import type { Database } from "../../../../lib/db-types";
import { useSupabase } from "../../../../lib/supabase";
import { formatSupabaseError } from "../../../../lib/supabaseError";
import { getRoomExamSubjectFromTitle } from "../../../../lib/roomExam";
import { COLORS, SPACING } from "../../../../lib/theme";

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

function formatDuration(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

export default function AnalysisScreen() {
    const supabase = useSupabase();
    const router = useRouter();
    const { userId } = useAuth();
    const { id, initialExamId } = useGlobalSearchParams<{ id: string, initialExamId?: string }>();
    const roomId = Array.isArray(id) ? id[0] : id;
    const { width } = useWindowDimensions();

    const [exams, setExams] = useState<RoomExamRow[]>([]);
    const [selectedExamId, setSelectedExamId] = useState<string | null>(initialExamId || null);
    const [selectedSubject, setSelectedSubject] = useState<string>("전체");
    const [loading, setLoading] = useState(true);
    const [participants, setParticipants] = useState<ParticipantResult[]>([]);
    const [subjectStats, setSubjectStats] = useState<{ subject: string; avgPerQ: number }[]>([]);
    const [error, setError] = useState<string | null>(null);

    // React to param changes (e.g. from Race tab)
    useEffect(() => {
        if (initialExamId) {
            setSelectedExamId(initialExamId);
        }
    }, [initialExamId]);

    const loadExams = useCallback(async (shouldSelectDefault = true) => {
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

            if (fetchedExams.length > 0) {
                if (shouldSelectDefault && !selectedExamId) {
                    setSelectedExamId(fetchedExams[0].id);
                } else if (!shouldSelectDefault && !selectedExamId) {
                    // Even if not selecting default, we need to stop loading if no ID is set
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        } catch (err: any) {
            console.error("loadExams error:", err);
            setLoading(false);
        }
    }, [roomId, supabase, selectedExamId]);

    const loadRoomStats = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("attempts")
                .select("duration_ms, exam_id, room_exams!inner(id, title, total_questions)")
                .eq("room_exams.room_id", roomId);

            if (error) throw error;

            const stats: Record<string, { totalTime: number; totalQs: number }> = {};
            (data as any[]).forEach(a => {
                const sub = getRoomExamSubjectFromTitle(a.room_exams.title) ?? "기타";
                if (!stats[sub]) stats[sub] = { totalTime: 0, totalQs: 0 };
                stats[sub].totalTime += a.duration_ms || 0;
                stats[sub].totalQs += a.room_exams.total_questions || 0;
            });

            const formattedStats = Object.entries(stats)
                .map(([subject, data]) => ({
                    subject,
                    avgPerQ: data.totalQs > 0 ? data.totalTime / data.totalQs : 0
                }))
                .filter(s => s.avgPerQ > 0)
                .sort((a, b) => a.avgPerQ - b.avgPerQ);

            setSubjectStats(formattedStats);
        } catch (err) {
            console.error("loadRoomStats error:", err);
        }
    }, [roomId, supabase]);

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

    useFocusEffect(
        useCallback(() => {
            const init = async () => {
                // If we don't even have exams list, fetch it first
                if (exams.length === 0) {
                    setLoading(true);
                    await loadExams();
                    await loadRoomStats();
                } else if (selectedExamId) {
                    // If we have exams and a selected one, load its data
                    await loadExamData(selectedExamId);
                } else {
                    // No exams or no selection
                    setLoading(false);
                }
            };
            init();
        }, [roomId, selectedExamId, exams.length, loadExams, loadExamData])
    );

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

    const completedCount = completedParticipants.length;
    const inProgressCount = participants.filter(p => p.status === "IN_PROGRESS").length;
    const notStartedCount = participants.filter(p => p.status === "NOT_STARTED").length;
    const completionRate = participants.length > 0 ? Math.round((completedCount / participants.length) * 100) : 0;

    const averageDurationMs = useMemo(() => {
        if (completedCount === 0) return 0;
        const total = completedParticipants.reduce((sum, p) => sum + p.durationMs, 0);
        return total / completedCount;
    }, [completedCount, completedParticipants]);

    const fastestDurationMs = useMemo(() => {
        if (completedCount === 0) return 0;
        return completedParticipants.reduce(
            (fastest, p) => (p.durationMs < fastest ? p.durationMs : fastest),
            completedParticipants[0]?.durationMs || 0
        );
    }, [completedCount, completedParticipants]);

    const myResult = useMemo(() => participants.find(p => p.isMe), [participants]);

    const myRecords = useMemo(() => {
        if (!myResult?.records) return [];
        return [...myResult.records].sort((a, b) => a.question_no - b.question_no);
    }, [myResult]);

    const roomAvgPerQuestion = useMemo(() => {
        const questionAvg: Record<number, number[]> = {};
        completedParticipants.forEach(p => {
            if (p.records) {
                p.records.forEach(r => {
                    if (!questionAvg[r.question_no]) questionAvg[r.question_no] = [];
                    questionAvg[r.question_no].push(r.duration_ms);
                });
            }
        });

        const avgs: Record<number, number> = {};
        Object.keys(questionAvg).forEach(qNo => {
            const times = questionAvg[Number(qNo)];
            if (times.length > 0) {
                avgs[Number(qNo)] = times.reduce((a, b) => a + b, 0) / times.length;
            }
        });
        return avgs;
    }, [completedParticipants]);

    const chartMaxDuration = useMemo(() => {
        if (myRecords.length === 0) return 1;
        return Math.max(1, ...myRecords.map(r => r.duration_ms));
    }, [myRecords]);

    const chartLabelStep = useMemo(() => {
        if (myRecords.length <= 12) return 1;
        return Math.ceil(myRecords.length / 12);
    }, [myRecords.length]);

    const chartBarWidth = 14;
    const chartGap = 8;
    const chartHeight = 140;
    const chartStep = chartBarWidth + chartGap;
    const chartWidth = Math.max(width - 48, myRecords.length * chartStep);

    if (loading && exams.length === 0) {
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

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Subject Filter Chips */}
                {uniqueSubjects.length > 2 && (
                    <View style={styles.chipSection}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                            {uniqueSubjects.map(s => (
                                <Pressable
                                    key={s}
                                    onPress={() => setSelectedSubject(s)}
                                    style={[styles.chip, selectedSubject === s && styles.activeChip]}
                                >
                                    <Typography.Label bold color={selectedSubject === s ? COLORS.white : COLORS.textMuted}>{s}</Typography.Label>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Exam Selector */}
                <Section title="시험 선택" style={styles.selectorSection}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.examSelectorScroll}
                    >
                        {filteredExams.map((e) => (
                            <Pressable
                                key={e.id}
                                onPress={() => setSelectedExamId(e.id)}
                                style={[
                                    styles.examTab,
                                    selectedExamId === e.id && styles.selectedExamTab
                                ]}
                            >
                                <Typography.Body2 bold color={selectedExamId === e.id ? COLORS.white : COLORS.text} numberOfLines={1}>
                                    {e.title.replace(/^(\[.*?\]\s*|.*?•\s*)+/, "")}
                                </Typography.Body2>
                                <Typography.Caption color={selectedExamId === e.id ? 'rgba(255, 255, 255, 0.7)' : COLORS.textMuted}>
                                    {new Date(e.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                                </Typography.Caption>
                            </Pressable>
                        ))}
                    </ScrollView>
                    {filteredExams.length === 0 && exams.length > 0 && (
                        <Typography.Caption align="center" style={styles.emptyFilterText}>해당 과목에 등록된 시험이 없습니다.</Typography.Caption>
                    )}
                </Section>

                {/* Subject Performance Comparison */}
                {subjectStats.length > 1 && (
                    <Section
                        title="과목별 페이스 비교"
                        description="문항당 소요 시간 기준"
                        rightElement={<Ionicons name="trending-up" size={18} color={COLORS.primary} />}
                    >
                        <Card padding="md" radius="xl" style={styles.statsList}>
                            {subjectStats.map((s, idx) => (
                                <View key={s.subject} style={styles.subStatRow}>
                                    <View style={styles.subStatInfo}>
                                        <View style={[styles.rankBadge, idx === 0 && styles.rankBadgeFirst]}>
                                            <Typography.Label bold color={idx === 0 ? COLORS.white : COLORS.textMuted}>{idx + 1}</Typography.Label>
                                        </View>
                                        <Typography.Body1 bold>{s.subject}</Typography.Body1>
                                    </View>
                                    <View style={styles.subStatValueBox}>
                                        <Typography.Body1 bold color={COLORS.primary}>{formatDuration(s.avgPerQ)}</Typography.Body1>
                                        <Typography.Caption color={COLORS.textMuted}>/문항</Typography.Caption>
                                    </View>
                                </View>
                            ))}
                        </Card>
                    </Section>
                )}

                {loading ? (
                    <View style={styles.centerLoading}>
                        <ActivityIndicator size="small" color={COLORS.primary} />
                    </View>
                ) : exam ? (
                    <>
                        {/* Summary Header */}
                        <Card padding="xl" radius="xxl" style={styles.headerInfo}>
                            <View style={styles.examIconBox}>
                                <Ionicons name="analytics" size={32} color={COLORS.primary} />
                            </View>
                            <Typography.H2 align="center" bold>{exam.title.replace(/^(\[.*?\]\s*|.*?•\s*)+/, "")}</Typography.H2>
                            <View style={styles.badgeRow}>
                                <View style={styles.statusBadge}>
                                    <Typography.Label bold color="#2E7D32">완료됨</Typography.Label>
                                </View>
                                <Typography.Caption color={COLORS.textMuted}>{new Date(exam.created_at).toLocaleString()}</Typography.Caption>
                            </View>
                        </Card>

                        {/* Stats Dashboard */}
                        <View style={styles.dashboard}>
                            <View style={styles.statGrid}>
                                <StatCard label="완료 인원" value={`${completedCount}명`} color={COLORS.primary} />
                                <StatCard label="평균 소요" value={averageDurationMs > 0 ? formatDuration(averageDurationMs) : "--"} />
                            </View>
                            <View style={styles.statGrid}>
                                <StatCard label="완주율" value={`${completionRate}%`} subValue={`총 ${participants.length}명`} />
                                <StatCard label="최고 기록" value={fastestDurationMs > 0 ? formatDuration(fastestDurationMs) : "--"} color={COLORS.warning} />
                            </View>
                        </View>

                        {/* Pace Analysis Section */}
                        <Section title="문항별 페이스 분석" rightElement={<Ionicons name="help-circle-outline" size={16} color={COLORS.textMuted} />}>
                            {myResult?.status === "COMPLETED" && myRecords.length > 0 ? (
                                <>
                                    <Card padding="md" radius="xl" style={styles.chartCard}>
                                        <View style={styles.chartLegend}>
                                            <View style={styles.legendItem}>
                                                <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
                                                <Typography.Label color={COLORS.textMuted} bold>평균보다 빠름</Typography.Label>
                                            </View>
                                            <View style={styles.legendItem}>
                                                <View style={[styles.legendDot, { backgroundColor: COLORS.error }]} />
                                                <Typography.Label color={COLORS.textMuted} bold>평균보다 느림</Typography.Label>
                                            </View>
                                        </View>

                                        <ScrollView
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            contentContainerStyle={{ paddingHorizontal: 16 }}
                                        >
                                            <View>
                                                <Svg width={chartWidth} height={chartHeight}>
                                                    <Line
                                                        x1={0}
                                                        y1={chartHeight}
                                                        x2={chartWidth}
                                                        y2={chartHeight}
                                                        stroke={COLORS.border}
                                                        strokeWidth={1}
                                                    />
                                                    {myRecords.map((r, index) => {
                                                        const avg = roomAvgPerQuestion[r.question_no] || r.duration_ms;
                                                        const isFaster = r.duration_ms <= avg;
                                                        const barHeight = Math.max(
                                                            4,
                                                            Math.round((r.duration_ms / chartMaxDuration) * chartHeight)
                                                        );
                                                        const x = index * chartStep;
                                                        const y = chartHeight - barHeight;
                                                        return (
                                                            <Rect
                                                                key={r.id}
                                                                x={x}
                                                                y={y}
                                                                width={chartBarWidth}
                                                                height={barHeight}
                                                                rx={4}
                                                                fill={isFaster ? COLORS.primary : COLORS.error}
                                                                opacity={0.9}
                                                            />
                                                        );
                                                    })}
                                                </Svg>
                                                <View style={[styles.chartLabelRow, { width: chartWidth }]}>
                                                    {myRecords.map((r, index) => (
                                                        <Typography.Label
                                                            key={`${r.id}-label`}
                                                            color={COLORS.textMuted}
                                                            align="center"
                                                            style={{ width: chartStep, fontSize: 10 }}
                                                        >
                                                            {index % chartLabelStep === 0 ? `Q${r.question_no}` : ""}
                                                        </Typography.Label>
                                                    ))}
                                                </View>
                                            </View>
                                        </ScrollView>
                                    </Card>

                                    <View style={styles.compareList}>
                                        {myRecords.map(r => {
                                            const avg = roomAvgPerQuestion[r.question_no] || r.duration_ms;
                                            const diff = r.duration_ms - avg;
                                            const diffPercent = avg > 0 ? (diff / avg) * 100 : 0;
                                            return (
                                                <CompareRow
                                                    key={r.id}
                                                    label={`Q${r.question_no}`}
                                                    myValue={formatDuration(r.duration_ms)}
                                                    avgValue={formatDuration(avg)}
                                                    isFaster={r.duration_ms < avg}
                                                    diffPercent={diffPercent}
                                                />
                                            );
                                        })}
                                    </View>
                                </>
                            ) : (
                                <Card variant="outlined" padding="massive" radius="xl" style={styles.emptyDetailCard}>
                                    <Ionicons name="lock-closed-outline" size={32} color={COLORS.textMuted} />
                                    <Typography.Body2 align="center" color={COLORS.textMuted} bold style={styles.emptyDetailText}>
                                        시험을 완료해야 자세한 분석을 볼 수 있습니다.
                                    </Typography.Body2>
                                </Card>
                            )}
                        </Section>
                    </>
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="layers-outline" size={64} color={COLORS.border} />
                        <Text style={styles.emptyText}>아직 생성된 시험이 없습니다.</Text>
                        <Text style={styles.emptySub}>시험을 완료하면 이곳에서 분석 결과가 표시됩니다.</Text>
                    </View>
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
    headerInfo: {
        alignItems: "center",
        marginHorizontal: SPACING.xl,
        marginBottom: SPACING.xl,
    },
    examIconBox: {
        width: 64,
        height: 64,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: SPACING.sm,
    },
    statusBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    dashboard: {
        paddingHorizontal: SPACING.xl,
        gap: SPACING.md,
        marginBottom: SPACING.xxl,
    },
    statGrid: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    chipSection: {
        marginTop: SPACING.lg,
        marginBottom: 0,
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
    emptyFilterText: {
        marginTop: SPACING.sm,
    },
    statsList: {
        gap: SPACING.md,
    },
    subStatRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.sm,
    },
    subStatInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    rankBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankBadgeFirst: {
        backgroundColor: COLORS.primary,
    },
    subStatValueBox: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 2,
    },
    chartCard: {
        paddingVertical: SPACING.xl,
        marginBottom: SPACING.lg,
    },
    chartLegend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        marginBottom: SPACING.xl,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    chartLabelRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: SPACING.md,
    },
    compareList: {
        gap: SPACING.sm,
    },
    emptyDetailCard: {
        borderStyle: 'dashed',
    },
    emptyDetailText: {
        marginTop: SPACING.md,
    },
    emptyContainer: {
        padding: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '900',
        color: COLORS.text,
        marginTop: 20,
    },
    emptySub: {
        fontSize: 14,
        color: COLORS.textMuted,
        marginTop: 8,
        textAlign: 'center',
    },
    centerLoading: {
        padding: 40,
        alignItems: 'center',
    },
});
