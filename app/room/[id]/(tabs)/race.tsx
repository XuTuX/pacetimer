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
import { COLORS, RADIUS, SHADOWS, SPACING } from "../../../../lib/theme";

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
                {/* Progress Summary */}
                {totalExams > 0 && (
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryCard}>
                            <View style={styles.summaryItem}>
                                <Typography.Caption color={COLORS.textMuted}>전체</Typography.Caption>
                                <Typography.H3 bold color={COLORS.text}>{totalExams}</Typography.H3>
                            </View>
                            <View style={styles.summaryDivider} />
                            <View style={styles.summaryItem}>
                                <Typography.Caption color={COLORS.textMuted}>완료</Typography.Caption>
                                <Typography.H3 bold color={COLORS.primary}>{completedCount}</Typography.H3>
                            </View>
                            <View style={styles.summaryDivider} />
                            <View style={styles.summaryItem}>
                                <Typography.Caption color={COLORS.textMuted}>다시 풀기</Typography.Caption>
                                <Typography.H3 bold color={COLORS.error}>{inProgressCount}</Typography.H3>
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
                                style={{ marginTop: SPACING.xl }}
                            />
                        )}
                    </View>
                ) : (
                    Object.entries(groupedExams).map(([subject, subjectExams]) => (
                        <View key={subject} style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.subjectEmoji}>{SUBJECT_ICONS[subject] || "📝"}</Text>
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
                                            {/* Status Accent Bar */}
                                            <View style={[
                                                styles.accentBar,
                                                isCompleted && styles.accentBarDone,
                                                isInProgress && styles.accentBarProgress,
                                                !isCompleted && !isInProgress && styles.accentBarPending
                                            ]} />

                                            <View style={styles.examMain}>
                                                <View style={styles.examInfo}>
                                                    <Text style={styles.examTitle} numberOfLines={1}>
                                                        {getRoomExamDisplayTitle(item.title) || "모의고사"}
                                                    </Text>
                                                    <Text style={styles.examMeta}>
                                                        {item.total_questions}문항 · {item.total_minutes}분
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={styles.examRight}>
                                                {isCompleted && (
                                                    <View style={styles.doneBadge}>
                                                        <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} />
                                                        <Text style={styles.doneText}>완료</Text>
                                                    </View>
                                                )}
                                                {isInProgress && (
                                                    <View style={styles.retryBadge}>
                                                        <Ionicons name="refresh" size={12} color={COLORS.error} />
                                                        <Text style={styles.retryText}>다시 풀기</Text>
                                                    </View>
                                                )}
                                                {!isCompleted && !isInProgress && (
                                                    <View style={styles.pendingBadge}>
                                                        <Text style={styles.pendingText}>미응시</Text>
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
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        padding: SPACING.xl,
        paddingBottom: 100,
    },
    summaryRow: {
        marginBottom: SPACING.xl,
    },
    summaryCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    summaryItem: {
        alignItems: 'center',
        gap: 2,
        flex: 1,
    },
    summaryDivider: {
        width: 1,
        height: 32,
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
        marginBottom: SPACING.xxl,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
        gap: 8,
    },
    subjectEmoji: {
        fontSize: 18,
    },
    subjectTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    countBadge: {
        backgroundColor: COLORS.surfaceVariant,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: RADIUS.full,
    },
    countText: {
        fontSize: 11,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    examList: {
        gap: SPACING.sm,
    },
    examCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
        ...SHADOWS.small,
    },
    examCardPressed: {
        opacity: 0.9,
        transform: [{ scale: 0.99 }],
    },
    accentBar: {
        width: 4,
        alignSelf: 'stretch',
    },
    accentBarDone: {
        backgroundColor: COLORS.primary,
    },
    accentBarProgress: {
        backgroundColor: COLORS.warning,
    },
    accentBarPending: {
        backgroundColor: COLORS.border,
    },
    examMain: {
        flex: 1,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.md,
    },
    examInfo: {
        gap: 2,
    },
    examTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
    },
    examMeta: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    examRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingRight: SPACING.md,
    },
    doneBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    doneText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.primary,
    },
    retryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.errorLight,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    retryText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.error,
    },
    pendingBadge: {
        backgroundColor: COLORS.surfaceVariant,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    pendingText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
});
