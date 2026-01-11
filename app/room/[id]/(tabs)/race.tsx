import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useGlobalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenHeader } from "../../../../components/ui/ScreenHeader";
import type { Database } from "../../../../lib/db-types";
import { useSupabase } from "../../../../lib/supabase";
import { formatSupabaseError } from "../../../../lib/supabaseError";
import { COLORS } from "../../../../lib/theme";

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
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [myAttempts, setMyAttempts] = useState<AttemptRow[]>([]);

    const loadData = useCallback(async () => {
        if (!roomId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const { data: roomData, error: roomError } = await supabase
                .from("rooms")
                .select("*")
                .eq("id", roomId)
                .single();
            if (roomError) throw roomError;
            setRoom(roomData);

            const { data: examData, error: exError } = await supabase
                .from("room_exams")
                .select("*")
                .eq("room_id", roomId)
                .order("created_at", { ascending: false });
            if (exError) throw exError;
            const fetchedExams = examData ?? [];
            setExams(fetchedExams);

            if (userId) {
                // Fetch current user's attempts for all exams in this room
                const { data: aData } = await supabase
                    .from("attempts")
                    .select("*")
                    .eq("room_id", roomId)
                    .eq("user_id", userId);
                setMyAttempts(aData || []);

                const { data: mData } = await supabase
                    .from("room_members")
                    .select(`role`)
                    .eq("room_id", roomId)
                    .eq("user_id", userId)
                    .single();
                if (mData) setCurrentUserRole(mData.role);
            }

        } catch (err: any) {
            setError(formatSupabaseError(err));
        } finally {
            setLoading(false);
        }
    }, [roomId, supabase, userId]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const getSubject = (title: string) => {
        const match = title.match(/^\[(.*?)\]/);
        return match ? match[1] : "기타";
    };

    const groupedExams = useMemo(() => {
        const groups: Record<string, RoomExamRow[]> = {};
        exams.forEach(exam => {
            const subject = getSubject(exam.title);
            if (!groups[subject]) groups[subject] = [];
            groups[subject].push(exam);
        });
        return groups;
    }, [exams]);

    const canCreateExam = true;

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
            <ScreenHeader
                title="모의고사"
                showBack={false}
                rightElement={
                    canCreateExam ? (
                        <Pressable
                            onPress={() => {
                                if (roomId && roomId !== 'undefined') {
                                    router.push(`/room/${roomId}/add-exam`);
                                }
                            }}
                            style={styles.headerAddBtn}
                        >
                            <Ionicons name="add" size={28} color={COLORS.text} />
                        </Pressable>
                    ) : undefined
                }
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {exams.length === 0 ? (
                    <View style={styles.emptyExamsContainer}>
                        <View style={styles.emptyExams}>
                            <Ionicons name="document-text-outline" size={48} color={COLORS.border} />
                            <Text style={styles.emptyExamsText}>등록된 시험이 없습니다.</Text>
                            {canCreateExam && (
                                <Pressable
                                    onPress={() => router.push(`/room/${roomId}/add-exam`)}
                                    style={styles.emptyCreateBtn}
                                >
                                    <Text style={styles.emptyCreateBtnText}>첫 시험 만들기</Text>
                                </Pressable>
                            )}
                        </View>
                    </View>
                ) : (
                    (Object.entries(groupedExams) as [string, RoomExamRow[]][]).map(([subject, subjectExams]) => (
                        <View key={subject} style={styles.subjectSection}>
                            <View style={styles.subjectHeader}>
                                <View style={styles.subjectIconBox}>
                                    <Ionicons name="library" size={16} color={COLORS.primary} />
                                </View>
                                <Text style={styles.subjectTitle}>{subject}</Text>
                                <View style={styles.subjectCountBadge}>
                                    <Text style={styles.subjectCountText}>{subjectExams.length}</Text>
                                </View>
                            </View>

                            <View style={styles.gridContainer}>
                                {subjectExams.map((item) => {
                                    const attempt = myAttempts.find(a => a.exam_id === item.id);
                                    const isCompleted = !!attempt?.ended_at;
                                    const isInProgress = !!attempt && !attempt.ended_at;

                                    return (
                                        <Pressable
                                            key={item.id}
                                            onPress={() => {
                                                if (isCompleted) {
                                                    router.push({
                                                        pathname: `/room/${roomId}/analysis` as any,
                                                        params: { initialExamId: item.id }
                                                    });
                                                } else {
                                                    router.push(`/room/${roomId}/exam/${item.id}/run`);
                                                }
                                            }}
                                            style={({ pressed }) => [
                                                styles.gridItem,
                                                pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
                                                isCompleted && styles.gridItemCompleted
                                            ]}
                                        >
                                            <View style={[
                                                styles.iconBox,
                                                isCompleted ? styles.iconBoxCompleted : (isInProgress ? styles.iconBoxProgress : null)
                                            ]}>
                                                <Ionicons
                                                    name={isCompleted ? "checkmark-circle" : (isInProgress ? "play" : "document-text")}
                                                    size={24}
                                                    color={isCompleted ? COLORS.success : (isInProgress ? COLORS.warning : COLORS.primary)}
                                                />
                                            </View>
                                            <Text style={styles.itemTitle} numberOfLines={2}>
                                                {item.title.replace(/^\[.*?\]\s*/, "")}
                                            </Text>
                                            <Text style={styles.itemMeta}>{item.total_questions}문항</Text>

                                            {isCompleted ? (
                                                <View style={styles.completedBadge}>
                                                    <Text style={styles.completedText}>분석보기</Text>
                                                </View>
                                            ) : isInProgress ? (
                                                <View style={[styles.completedBadge, { borderColor: COLORS.warning }]}>
                                                    <Text style={[styles.completedText, { color: COLORS.warning }]}>진행중</Text>
                                                </View>
                                            ) : null}
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    headerAddBtn: {
        padding: 4,
    },
    subjectSection: {
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    subjectHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    subjectIconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    subjectTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: COLORS.text,
        letterSpacing: -0.5,
    },
    subjectCountBadge: {
        backgroundColor: COLORS.surfaceVariant,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    subjectCountText: {
        fontSize: 11,
        fontWeight: '800',
        color: COLORS.textMuted,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    gridItem: {
        width: '30.5%', // Slightly more space for gaps
        aspectRatio: 0.75,
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
    },
    gridItemCompleted: {
        backgroundColor: COLORS.bg,
        borderColor: 'transparent',
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    iconBoxCompleted: {
        backgroundColor: '#E8FAEF',
    },
    iconBoxProgress: {
        backgroundColor: COLORS.warningLight,
    },
    itemTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 4,
        lineHeight: 14,
    },
    itemMeta: {
        fontSize: 10,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    completedBadge: {
        marginTop: 6,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    completedText: {
        fontSize: 8,
        fontWeight: '800',
        color: COLORS.textMuted,
    },
    emptyExamsContainer: {
        padding: 20,
        paddingTop: 40,
    },
    emptyExams: {
        padding: 60,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 32,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
    },
    emptyExamsText: {
        marginTop: 16,
        fontSize: 15,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    emptyCreateBtn: {
        marginTop: 20,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
    },
    emptyCreateBtnText: {
        color: COLORS.white,
        fontWeight: '800',
        fontSize: 14,
    },
});
