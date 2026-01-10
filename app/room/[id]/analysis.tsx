import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { Line, Rect } from "react-native-svg";
import { CompareRow } from "../../../components/ui/CompareRow";
import { ScreenHeader } from "../../../components/ui/ScreenHeader";
import { StatCard } from "../../../components/ui/StatCard";
import type { Database } from "../../../lib/db-types";
import { useSupabase } from "../../../lib/supabase";
import { formatSupabaseError } from "../../../lib/supabaseError";
import { COLORS } from "../../../lib/theme";

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
    const { id } = useLocalSearchParams<{ id: string }>();
    const roomId = Array.isArray(id) ? id[0] : id;
    const { width } = useWindowDimensions();

    const [exam, setExam] = useState<RoomExamRow | null>(null);
    const [loading, setLoading] = useState(true);
    const [participants, setParticipants] = useState<ParticipantResult[]>([]);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        if (!roomId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const { data: exams, error: exError } = await supabase
                .from("room_exams")
                .select("*")
                .eq("room_id", roomId)
                .order("created_at", { ascending: false })
                .limit(1);

            if (exError) throw exError;

            const currentExam = exams && exams.length > 0 ? exams[0] : null;
            setExam(currentExam);

            if (!currentExam) {
                setLoading(false);
                return;
            }

            const currentExamId = currentExam.id;

            const { data: mData, error: mError } = await supabase
                .from("room_members")
                .select(`*, profile:profiles(*)`)
                .eq("room_id", roomId);
            if (mError) throw mError;
            const members = (mData as any[]) || [];

            const { data: aData, error: aError } = await supabase
                .from("attempts")
                .select("*")
                .eq("exam_id", currentExamId);
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
            loadData();
        }, [loadData])
    );

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

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!exam) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="분석" />
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>진행 중인 시험이 없습니다.</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="분석"
                showBack={false}
                rightElement={
                    <Pressable onPress={() => router.replace("/(tabs)/rooms")} style={{ padding: 8 }}>
                        <Ionicons name="close-outline" size={28} color={COLORS.text} />
                    </Pressable>
                }
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.headerInfo}>
                    <Text style={styles.examTitle}>{exam.title}</Text>
                    <Text style={styles.examDate}>{new Date(exam.created_at).toLocaleDateString()}</Text>
                </View>

                <View style={styles.statRow}>
                    <StatCard label="완료" value={completedCount} color={COLORS.primary} />
                    <StatCard label="진행 중" value={inProgressCount} color={COLORS.warning} />
                </View>
                <View style={styles.statRow}>
                    <StatCard label="미참여" value={notStartedCount} color={COLORS.textMuted} />
                    <StatCard
                        label="완주율"
                        value={`${completionRate}%`}
                        subValue={`총 ${participants.length}명`}
                    />
                </View>
                <View style={styles.statRow}>
                    <StatCard
                        label="평균 시간"
                        value={averageDurationMs > 0 ? formatDuration(averageDurationMs) : "--"}
                        subValue={completedCount > 0 ? `완료 ${completedCount}명` : "완료자 없음"}
                        color={COLORS.primary}
                    />
                    <StatCard
                        label="최고 기록"
                        value={fastestDurationMs > 0 ? formatDuration(fastestDurationMs) : "--"}
                        subValue={completedCount > 0 ? "가장 빠른 기록" : "기록 없음"}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>내 페이스 분석</Text>
                    {myResult?.status === "COMPLETED" && myRecords.length > 0 ? (
                        <>
                            <View style={styles.infoCard}>
                                <Text style={styles.infoText}>
                                    초록 막대는 평균보다 빠름, 빨강은 느림을 의미합니다.
                                </Text>
                            </View>
                            <View style={styles.chartCard}>
                                <Text style={styles.chartTitle}>문항별 소요시간</Text>
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
                                                        rx={6}
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
                        </>
                    ) : (
                        <View style={styles.infoCard}>
                            <Text style={styles.infoText}>시험 완료 후 분석을 볼 수 있어요.</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    headerInfo: {
        padding: 20,
        alignItems: "center",
    },
    examTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: COLORS.text,
        marginBottom: 4,
    },
    examDate: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    statRow: {
        flexDirection: "row",
        paddingHorizontal: 20,
        gap: 12,
        marginTop: 12,
    },
    section: {
        paddingHorizontal: 20,
        marginTop: 24,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: "700",
        color: COLORS.textMuted,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    infoCard: {
        marginBottom: 16,
        padding: 16,
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    infoText: {
        fontSize: 13,
        color: COLORS.textMuted,
        textAlign: "center",
        fontWeight: "500",
    },
    chartCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingVertical: 16,
        marginBottom: 16,
    },
    chartTitle: {
        fontSize: 14,
        fontWeight: "800",
        color: COLORS.text,
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    chartLabelRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
    },
    chartLabel: {
        fontSize: 10,
        fontWeight: "700",
        color: COLORS.textMuted,
        textAlign: "center",
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.textMuted,
        textAlign: "center",
        marginTop: 20,
    },
});
