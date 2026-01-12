import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useGlobalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button } from "../../../../components/ui/Button"; // 기존 UI 버튼 사용
import { ScreenHeader } from "../../../../components/ui/ScreenHeader";
import { Typography } from "../../../../components/ui/Typography";
import type { Database } from "../../../../lib/db-types";
import { useSupabase } from "../../../../lib/supabase";
import { formatSupabaseError } from "../../../../lib/supabaseError";
import { COLORS, RADIUS, SHADOWS, SPACING } from "../../../../lib/theme";
import { getRoomExamSubjectFromTitle } from "../../../../lib/roomExam";

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
                    // + 버튼을 이전의 깔끔한 헤더 버튼 스타일로 복구
                    <Button
                        variant="ghost"
                        size="sm"
                        icon="add"
                        onPress={() => router.push(`/room/${roomId}/add-exam`)}
                        style={styles.headerBtn}
                    />
                }
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {exams.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconBox}>
                            <Ionicons name="document-text" size={40} color={COLORS.borderDark} />
                        </View>
                        <Typography.Subtitle1 color={COLORS.textMuted} bold>아직 등록된 시험이 없어요</Typography.Subtitle1>
                        <Button
                            label="첫 시험 만들기"
                            onPress={() => router.push(`/room/${roomId}/add-exam`)}
                            style={{ marginTop: 24 }}
                        />
                    </View>
                ) : (
                    Object.entries(groupedExams).map(([subject, subjectExams]) => (
                        <View key={subject} style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.subjectIndicator} />
                                <Text style={styles.subjectTitle}>{subject}</Text>
                                <View style={styles.countBadge}>
                                    <Text style={styles.countText}>{subjectExams.length}</Text>
                                </View>
                            </View>

                            <View style={styles.grid}>
                                {subjectExams.map((item) => {
                                    const attempt = myAttempts.find(a => a.exam_id === item.id);
                                    const isCompleted = !!attempt?.ended_at;
                                    const isInProgress = !!attempt && !attempt.ended_at;

                                    return (
                                        <TouchableOpacity
                                            key={item.id}
                                            activeOpacity={0.8}
                                            onPress={() => {
                                                if (isCompleted) {
                                                    router.push({ pathname: `/room/${roomId}/analysis` as any, params: { initialExamId: item.id } });
                                                } else {
                                                    router.push(`/room/${roomId}/exam/${item.id}/run`);
                                                }
                                            }}
                                            style={[
                                                styles.examCard,
                                                isCompleted && styles.cardCompleted,
                                                isInProgress && styles.cardInProgress
                                            ]}
                                        >
                                            <View style={styles.cardTop}>
                                                <View style={[styles.iconBox, isCompleted && styles.iconBoxCompleted, isInProgress && styles.iconBoxInProgress]}>
                                                    <Ionicons
                                                        name={isCompleted ? "checkmark" : (isInProgress ? "play" : "document-text")}
                                                        size={18}
                                                        color={isCompleted ? COLORS.primary : (isInProgress ? COLORS.warning : COLORS.textMuted)}
                                                    />
                                                </View>
                                                {isCompleted && <Text style={styles.doneLabel}>완료</Text>}
                                            </View>

                                            <Text style={styles.examTitle} numberOfLines={2}>
                                                {item.title}
                                            </Text>

                                            <View style={styles.cardBottom}>
                                                <View style={styles.infoRow}>
                                                    <Ionicons name="list-outline" size={14} color={COLORS.textMuted} />
                                                    <Text style={styles.infoText}>{item.total_questions}문항</Text>
                                                </View>
                                                {isInProgress && (
                                                    <Text style={styles.runningText}>진행 중...</Text>
                                                )}
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

const { width } = Dimensions.get('window');
const cardWidth = (width - SPACING.xl * 2 - 16) / 2;

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
    headerBtn: {
        backgroundColor: COLORS.surfaceVariant,
        borderRadius: RADIUS.full,
        width: 40,
        height: 40,
    },
    scrollContent: {
        padding: SPACING.xl,
        paddingBottom: 120,
    },
    section: {
        marginBottom: 36,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    subjectIndicator: {
        width: 4,
        height: 16,
        backgroundColor: COLORS.primary,
        borderRadius: 2,
        marginRight: 8,
    },
    subjectTitle: {
        fontSize: 19,
        fontWeight: '800',
        color: COLORS.text,
        marginRight: 6,
    },
    countBadge: {
        backgroundColor: COLORS.surfaceVariant,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: RADIUS.full,
    },
    countText: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: 'bold',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    examCard: {
        width: cardWidth,
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 18,
        ...SHADOWS.medium,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
        minHeight: 154,
        justifyContent: 'space-between',
    },
    cardCompleted: {
        backgroundColor: '#F7FCF9',
        borderColor: 'rgba(0, 208, 148, 0.1)',
    },
    cardInProgress: {
        backgroundColor: '#FFFDF2',
        borderColor: 'rgba(255, 184, 0, 0.1)',
    },
    cardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconBoxCompleted: {
        backgroundColor: 'rgba(0, 208, 148, 0.1)',
    },
    iconBoxInProgress: {
        backgroundColor: 'rgba(255, 184, 0, 0.1)',
    },
    doneLabel: {
        fontSize: 11,
        fontWeight: 'bold',
        color: COLORS.primary,
        backgroundColor: 'white',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(0, 208, 148, 0.2)',
    },
    examTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        lineHeight: 22,
        marginVertical: 12,
    },
    cardBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    infoText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    runningText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.warning,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 100,
    },
    emptyIconBox: {
        width: 80,
        height: 80,
        borderRadius: 30,
        backgroundColor: COLORS.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    }
});
