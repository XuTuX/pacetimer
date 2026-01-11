import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { Line, Rect } from "react-native-svg";
import { CompareRow } from "../../../../components/ui/CompareRow";
import { ScreenHeader } from "../../../../components/ui/ScreenHeader";
import { StatCard } from "../../../../components/ui/StatCard";
import type { Database } from "../../../../lib/db-types";
import { useSupabase } from "../../../../lib/supabase";
import { formatSupabaseError } from "../../../../lib/supabaseError";
import { COLORS } from "../../../../lib/theme";

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
    const { id, initialExamId } = useLocalSearchParams<{ id: string, initialExamId?: string }>();
    const roomId = Array.isArray(id) ? id[0] : id;
    const { width } = useWindowDimensions();

    const [exams, setExams] = useState<RoomExamRow[]>([]);
    const [selectedExamId, setSelectedExamId] = useState<string | null>(initialExamId || null);
    const [loading, setLoading] = useState(true);
    const [participants, setParticipants] = useState<ParticipantResult[]>([]);
    const [error, setError] = useState<string | null>(null);

    // React to param changes (e.g. from Race tab)
    useEffect(() => {
        if (initialExamId) {
            setSelectedExamId(initialExamId);
        }
    }, [initialExamId]);

    const loadExams = useCallback(async () => {
        if (!roomId) {
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
                if (!selectedExamId) {
                    setSelectedExamId(fetchedExams[0].id);
                }
            } else {
                setLoading(false);
            }
        } catch (err: any) {
            console.error(err);
            setLoading(false);
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
            loadExams();
        }, [loadExams])
    );

    useFocusEffect(
        useCallback(() => {
            if (selectedExamId) {
                loadExamData(selectedExamId);
            }
        }, [selectedExamId, loadExamData])
    );

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
                {/* Exam Selector */}
                <View style={styles.selectorSection}>
                    <Text style={styles.sectionLabel}>시험 선택</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.examSelectorScroll}
                    >
                        {exams.map((e) => (
                            <Pressable
                                key={e.id}
                                onPress={() => setSelectedExamId(e.id)}
                                style={[
                                    styles.examTab,
                                    selectedExamId === e.id && styles.selectedExamTab
                                ]}
                            >
                                <Text style={[
                                    styles.examTabText,
                                    selectedExamId === e.id && styles.selectedExamTabText
                                ]} numberOfLines={1}>
                                    {e.title}
                                </Text>
                                <Text style={[
                                    styles.examTabDate,
                                    selectedExamId === e.id && styles.selectedExamTabDate
                                ]}>
                                    {new Date(e.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>

                {loading ? (
                    <View style={styles.centerLoading}>
                        <ActivityIndicator size="small" color={COLORS.primary} />
                    </View>
                ) : exam ? (
                    <>
                        {/* Summary Header */}
                        <View style={styles.headerInfo}>
                            <View style={styles.examIconBox}>
                                <Ionicons name="analytics" size={32} color={COLORS.primary} />
                            </View>
                            <Text style={styles.examTitle}>{exam.title}</Text>
                            <View style={styles.badgeRow}>
                                <View style={styles.statusBadge}>
                                    <Text style={styles.statusBadgeText}>완료됨</Text>
                                </View>
                                <Text style={styles.examDate}>{new Date(exam.created_at).toLocaleString()}</Text>
                            </View>
                        </View>

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
                        <View style={styles.section}>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={styles.sectionLabel}>문항별 페이스 분석</Text>
                                <Ionicons name="help-circle-outline" size={16} color={COLORS.textMuted} />
                            </View>

                            {myResult?.status === "COMPLETED" && myRecords.length > 0 ? (
                                <>
                                    <View style={styles.chartCard}>
                                        <View style={styles.chartLegend}>
                                            <View style={styles.legendItem}>
                                                <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
                                                <Text style={styles.legendText}>평균보다 빠름</Text>
                                            </View>
                                            <View style={styles.legendItem}>
                                                <View style={[styles.legendDot, { backgroundColor: COLORS.error }]} />
                                                <Text style={styles.legendText}>평균보다 느림</Text>
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
                                                        <Text
                                                            key={`${r.id}-label`}
                                                            style={[styles.chartLabel, { width: chartStep }]}
                                                        >
                                                            {index % chartLabelStep === 0 ? `Q${r.question_no}` : ""}
                                                        </Text>
                                                    ))}
                                                </View>
                                            </View>
                                        </ScrollView>
                                    </View>

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
                                <View style={styles.emptyDetailCard}>
                                    <Ionicons name="lock-closed-outline" size={32} color={COLORS.textMuted} />
                                    <Text style={styles.emptyDetailText}>시험을 완료해야 자세한 분석을 볼 수 있습니다.</Text>
                                </View>
                            )}
                        </View>
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
        marginTop: 12,
        marginBottom: 8,
    },
    examSelectorScroll: {
        paddingHorizontal: 20,
        gap: 12,
        paddingBottom: 16,
    },
    examTab: {
        paddingHorizontal: 16,
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
    examTabText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 2,
    },
    selectedExamTabText: {
        color: COLORS.white,
    },
    examTabDate: {
        fontSize: 11,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    selectedExamTabDate: {
        color: 'rgba(255, 255, 255, 0.7)',
    },
    headerInfo: {
        padding: 24,
        alignItems: "center",
        backgroundColor: COLORS.surface,
        marginHorizontal: 20,
        borderRadius: 32,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 20,
    },
    examIconBox: {
        width: 64,
        height: 64,
        borderRadius: 24,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    examTitle: {
        fontSize: 20,
        fontWeight: "900",
        color: COLORS.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#2E7D32',
    },
    examDate: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: '500',
    },
    dashboard: {
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 24,
    },
    statGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    section: {
        paddingHorizontal: 20,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: "800",
        color: COLORS.textMuted,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginLeft: 20,
        marginBottom: 12,
    },
    chartCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingVertical: 20,
        marginBottom: 16,
    },
    chartLegend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        marginBottom: 20,
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
    legendText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    chartLabelRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 12,
    },
    chartLabel: {
        fontSize: 10,
        fontWeight: "700",
        color: COLORS.textMuted,
        textAlign: "center",
    },
    compareList: {
        gap: 8,
    },
    emptyDetailCard: {
        padding: 40,
        backgroundColor: COLORS.surfaceVariant,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
    },
    emptyDetailText: {
        marginTop: 12,
        fontSize: 13,
        color: COLORS.textMuted,
        fontWeight: '600',
        textAlign: 'center',
    },
    emptyContainer: {
        padding: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
    },
    emptySub: {
        marginTop: 8,
        fontSize: 14,
        color: COLORS.textMuted,
        textAlign: 'center',
        lineHeight: 20,
    },
    centerLoading: {
        padding: 40,
        alignItems: 'center',
    },
});

