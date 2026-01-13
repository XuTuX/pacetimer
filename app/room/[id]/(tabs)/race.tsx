import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useGlobalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button } from "../../../../components/ui/Button";
import { ScreenHeader } from "../../../../components/ui/ScreenHeader";
import { Typography } from "../../../../components/ui/Typography";
import type { Database } from "../../../../lib/db-types";
import { getRoomExamDisplayTitle, getRoomExamSubjectFromTitle } from "../../../../lib/roomExam";
import { useSupabase } from "../../../../lib/supabase";
import { formatSupabaseError } from "../../../../lib/supabaseError";
import { COLORS, RADIUS, SPACING } from "../../../../lib/theme";

type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];
type RoomExamRow = Database["public"]["Tables"]["room_exams"]["Row"];
type AttemptRow = Database["public"]["Tables"]["attempts"]["Row"];

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

    if (loading && exams.length === 0) {
        return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;
    }

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="모의고사"
                showBack={false}
                rightElement={
                    <TouchableOpacity
                        onPress={() => router.push(`/room/${roomId}/add-exam`)}
                        style={styles.addBtn}
                    >
                        <Ionicons name="add" size={22} color={COLORS.text} />
                    </TouchableOpacity>
                }
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {exams.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIcon}>
                            <Ionicons name="document-text-outline" size={32} color={COLORS.textMuted} />
                        </View>
                        <Typography.Subtitle1 color={COLORS.text} bold>
                            아직 시험이 없어요
                        </Typography.Subtitle1>
                        <Typography.Body2 color={COLORS.textMuted} align="center" style={{ marginTop: 4 }}>
                            첫 번째 모의고사를 등록해보세요
                        </Typography.Body2>
                        <Button
                            label="시험 만들기"
                            onPress={() => router.push(`/room/${roomId}/add-exam`)}
                            style={{ marginTop: SPACING.xl }}
                        />
                    </View>
                ) : (
                    Object.entries(groupedExams).map(([subject, subjectExams]) => (
                        <View key={subject} style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.subjectBar} />
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
                                        <TouchableOpacity
                                            key={item.id}
                                            activeOpacity={0.7}
                                            onPress={() => {
                                                if (isCompleted) {
                                                    router.push({ pathname: `/room/${roomId}/analysis` as any, params: { initialExamId: item.id } });
                                                } else {
                                                    router.push(`/room/${roomId}/exam/${item.id}/run`);
                                                }
                                            }}
                                            style={[
                                                styles.examCard,
                                                isCompleted && styles.cardDone,
                                                isInProgress && styles.cardProgress
                                            ]}
                                        >
                                            <View style={styles.examMain}>
                                                <View style={[
                                                    styles.examIcon,
                                                    isCompleted && styles.iconDone,
                                                    isInProgress && styles.iconProgress
                                                ]}>
                                                    <Ionicons
                                                        name={isCompleted ? "checkmark" : (isInProgress ? "play" : "document-text-outline")}
                                                        size={16}
                                                        color={isCompleted ? COLORS.primary : (isInProgress ? COLORS.warning : COLORS.textMuted)}
                                                    />
                                                </View>
                                                <View style={styles.examInfo}>
                                                    <Text style={styles.examTitle} numberOfLines={1}>
                                                        {getRoomExamDisplayTitle(item.title) || "모의고사"}
                                                    </Text>
                                                    <Text style={styles.examMeta}>
                                                        {item.total_questions}문항 • {item.total_minutes}분
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={styles.examRight}>
                                                {isCompleted && (
                                                    <View style={styles.doneBadge}>
                                                        <Text style={styles.doneText}>완료</Text>
                                                    </View>
                                                )}
                                                {isInProgress && (
                                                    <View style={styles.progressBadge}>
                                                        <Text style={styles.progressText}>진행중</Text>
                                                    </View>
                                                )}
                                                <Ionicons name="chevron-forward" size={16} color={COLORS.border} />
                                            </View>
                                        </TouchableOpacity>
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
    emptyState: {
        alignItems: 'center',
        paddingVertical: 80,
    },
    emptyIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.md,
    },
    section: {
        marginBottom: SPACING.xxl,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    subjectBar: {
        width: 3,
        height: 14,
        backgroundColor: COLORS.primary,
        borderRadius: 2,
        marginRight: 8,
    },
    subjectTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        marginRight: 6,
    },
    countBadge: {
        backgroundColor: COLORS.surfaceVariant,
        paddingHorizontal: 6,
        paddingVertical: 2,
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
        justifyContent: 'space-between',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardDone: {
        backgroundColor: '#F7FBF9',
        borderColor: 'rgba(0, 208, 148, 0.15)',
    },
    cardProgress: {
        backgroundColor: '#FFFDF5',
        borderColor: 'rgba(255, 184, 0, 0.15)',
    },
    examMain: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: SPACING.sm,
    },
    examIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: COLORS.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconDone: {
        backgroundColor: COLORS.primaryLight,
    },
    iconProgress: {
        backgroundColor: COLORS.warningLight,
    },
    examInfo: {
        flex: 1,
    },
    examTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
    },
    examMeta: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    examRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    doneBadge: {
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    doneText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.primary,
    },
    progressBadge: {
        backgroundColor: COLORS.warningLight,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    progressText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.warning,
    },
});
