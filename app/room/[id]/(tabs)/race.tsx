import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useGlobalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button } from "../../../../components/ui/Button";
import { ScreenHeader } from "../../../../components/ui/ScreenHeader";
import { Typography } from "../../../../components/ui/Typography";
import type { Database } from "../../../../lib/db-types";
import { getRoomExamDisplayTitle, getRoomExamSubjectFromTitle } from "../../../../lib/roomExam";
import { useSupabase } from "../../../../lib/supabase";
import { formatSupabaseError } from "../../../../lib/supabaseError";
import { COLORS, SHADOWS, SPACING } from "../../../../lib/theme";

type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];
type RoomExamRow = Database["public"]["Tables"]["room_exams"]["Row"];
type AttemptRow = Database["public"]["Tables"]["attempts"]["Row"];

// Subject icon mapping for visual variety
const SUBJECT_ICONS: Record<string, string> = {
    "국어": "📖",
    "영어": "🔤",
    "수학": "📐",
    "과학": "🔬",
    "사회": "🌍",
    "기타": "📝",
};

export default function RaceScreen() {
    const supabase = useSupabase();
    const router = useRouter();
    const { userId } = useAuth();
    const { id } = useGlobalSearchParams<{ id: string }>();
    const roomId = Array.isArray(id) ? id[0] : id;

    const [room, setRoom] = useState<RoomRow | null>(null);
    const [exams, setExams] = useState<RoomExamRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [myAttempts, setMyAttempts] = useState<AttemptRow[]>([]);

    const loadData = useCallback(async () => {
        if (!roomId || roomId === 'undefined') {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const [roomRes, examRes, attemptRes] = await Promise.all([
                supabase.from("rooms").select("*").eq("id", roomId).single(),
                supabase.from("room_exams").select("*").eq("room_id", roomId).order("created_at", { ascending: false }),
                supabase.from("attempts").select("*").eq("room_id", roomId).eq("user_id", userId ?? "")
            ]);

            if (roomRes.error) throw roomRes.error;
            if (examRes.error) throw examRes.error;

            setRoom(roomRes.data);
            setExams(examRes.data ?? []);
            setMyAttempts(attemptRes.data ?? []);
        } catch (err: any) {
            setError(formatSupabaseError(err));
        } finally {
            setLoading(false);
        }
    }, [roomId, supabase, userId]);

    useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

    const groupedExams = useMemo(() => {
        const groups: Record<string, RoomExamRow[]> = {};
        exams.forEach((exam) => {
            const subject = getRoomExamSubjectFromTitle(exam.title) ?? "기타";
            if (!groups[subject]) groups[subject] = [];
            groups[subject].push(exam);
        });
        return groups;
    }, [exams]);

    // Stats
    const totalExams = exams.length;
    const completedCount = myAttempts.filter(a => a.ended_at).length;
    const inProgressCount = myAttempts.filter(a => !a.ended_at).length;

    if (loading && exams.length === 0) {
        return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;
    }

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="모의고사"
                showBack={false}
                rightElement={
                    room?.owner_id === userId && (
                        <TouchableOpacity
                            onPress={() => router.push(`/room/${roomId}/add-exam`)}
                            style={styles.addBtn}
                        >
                            <Ionicons name="add" size={22} color={COLORS.text} />
                        </TouchableOpacity>
                    )
                }
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Progress Summary Dashboard */}
                {totalExams > 0 && (
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryHeader}>
                            <Ionicons name="stats-chart" size={16} color={COLORS.primary} />
                            <Typography.Caption bold color={COLORS.primary}>나의 현황</Typography.Caption>
                        </View>
                        <View style={styles.summaryGrid}>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>전체</Text>
                                <Text style={styles.summaryValue}>{totalExams}</Text>
                            </View>
                            <View style={styles.summaryDivider} />
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>완료</Text>
                                <Text style={[styles.summaryValue, { color: '#10B981' }]}>{completedCount}</Text>
                            </View>
                            <View style={styles.summaryDivider} />
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>재풀이</Text>
                                <Text style={[styles.summaryValue, { color: '#EF4444' }]}>{inProgressCount}</Text>
                            </View>
                            <View style={styles.summaryDivider} />
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>미응시</Text>
                                <Text style={[styles.summaryValue, { color: COLORS.textMuted }]}>
                                    {totalExams - completedCount - inProgressCount}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {exams.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIcon}>
                            <Text style={styles.emptyEmoji}>📋</Text>
                        </View>
                        <Typography.Subtitle1 color={COLORS.text} bold>
                            아직 시험이 없어요
                        </Typography.Subtitle1>
                        <Typography.Body2 color={COLORS.textMuted} align="center" style={{ marginTop: 4 }}>
                            {room?.owner_id === userId ? "첫 번째 모의고사를 등록해보세요" : "아직 등록된 시험이 없습니다"}
                        </Typography.Body2>
                        {room?.owner_id === userId && (
                            <Button
                                label="시험 만들기"
                                onPress={() => router.push(`/room/${roomId}/add-exam`)}
                                style={{ marginTop: SPACING.xl, borderRadius: 16 }}
                            />
                        )}
                    </View>
                ) : (
                    Object.entries(groupedExams).map(([subject, subjectExams]) => (
                        <View key={subject} style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.subjectTitle}>{subject}</Text>
                                <View style={styles.countBadge}>
                                    <Text style={styles.countText}>{subjectExams.length}</Text>
                                </View>
                            </View>

                            <View style={styles.examList}>
                                {subjectExams.map((item) => {
                                    const attempt = myAttempts.find(a => a.exam_id === item.id);
                                    const isCompleted = !!attempt?.ended_at;
                                    const isInProgress = !!attempt && !attempt.ended_at;

                                    return (
                                        <Pressable
                                            key={item.id}
                                            onPress={() => {
                                                if (isCompleted) {
                                                    router.push({ pathname: `/room/${roomId}/analysis` as any, params: { initialExamId: item.id } });
                                                } else {
                                                    router.push(`/room/${roomId}/exam/${item.id}/run`);
                                                }
                                            }}
                                            style={({ pressed }) => [
                                                styles.examCard,
                                                pressed && styles.examCardPressed
                                            ]}
                                        >
                                            <View style={styles.examMain}>
                                                <Text style={styles.examTitle} numberOfLines={1}>
                                                    {getRoomExamDisplayTitle(item.title) || "모의고사"}
                                                </Text>
                                                <Text style={styles.examMeta}>
                                                    {item.total_questions}문항 · {item.total_minutes}분
                                                </Text>
                                            </View>

                                            <View style={styles.examRight}>
                                                {isCompleted ? (
                                                    <View style={[styles.statusBadge, styles.badgeDone]}>
                                                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                                                        <Text style={[styles.statusText, styles.textDone]}>완료</Text>
                                                    </View>
                                                ) : isInProgress ? (
                                                    <View style={[styles.statusBadge, styles.badgeRetry]}>
                                                        <Ionicons name="refresh" size={12} color="#EF4444" />
                                                        <Text style={[styles.statusText, styles.textRetry]}>재풀이</Text>
                                                    </View>
                                                ) : (
                                                    <View style={[styles.statusBadge, styles.badgePending]}>
                                                        <Text style={[styles.statusText, styles.textPending]}>미응시</Text>
                                                    </View>
                                                )}
                                                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                                            </View>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>
                    ))
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
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addBtn: {
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.small,
    },
    scrollContent: {
        padding: SPACING.lg,
        paddingBottom: 120,
    },
    summaryRow: {
        marginBottom: SPACING.xl,
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.medium,
    },
    summaryHeader: {
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    summaryGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryItem: {
        alignItems: 'center',
        flex: 1,
    },
    summaryLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textMuted,
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 22,
        fontWeight: '800',
        color: COLORS.text,
    },
    summaryDivider: {
        width: 1,
        height: 20,
        backgroundColor: COLORS.border,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 80,
    },
    emptyIcon: {
        width: 72,
        height: 72,
        borderRadius: 24,
        backgroundColor: COLORS.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.md,
    },
    emptyEmoji: {
        fontSize: 32,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
        paddingHorizontal: 4,
    },
    subjectTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
        marginRight: 8,
    },
    countBadge: {
        backgroundColor: COLORS.surfaceVariant,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    countText: {
        fontSize: 11,
        color: COLORS.textMuted,
        fontWeight: '700',
    },
    examList: {
        gap: 12,
    },
    examCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        ...SHADOWS.small,
    },
    examCardPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.98 }],
    },
    examMain: {
        flex: 1,
        gap: 4,
    },
    examTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    examMeta: {
        fontSize: 13,
        color: COLORS.textMuted,
        fontWeight: '500',
    },
    examRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
    },
    badgeDone: {
        backgroundColor: '#ECFDF5',
    },
    textDone: {
        color: '#10B981',
    },
    badgeRetry: {
        backgroundColor: '#FEF2F2',
    },
    textRetry: {
        color: '#EF4444',
    },
    badgePending: {
        backgroundColor: COLORS.bg,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    textPending: {
        color: COLORS.textMuted,
    },
});
