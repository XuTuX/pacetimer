import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useGlobalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
        if (!roomId || roomId === 'undefined') {
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
                                <View style={styles.subjectBadge}>
                                    <View style={styles.badgeDot} />
                                    <Text style={styles.subjectTitle}>{subject}</Text>
                                    <View style={styles.subjectCounter}>
                                        <Text style={styles.subjectCounterText}>{subjectExams.length}</Text>
                                    </View>
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
                                                pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
                                                isCompleted && styles.gridItemCompleted
                                            ]}
                                        >
                                            <LinearGradient
                                                colors={isCompleted ? ['#F1F8E9', '#DCEDC8'] : (isInProgress ? ['#FFFDE7', '#FFF9C4'] : ['#F5F5F7', '#EEEEF0'])}
                                                style={styles.iconBoxGradient}
                                            >
                                                <Ionicons
                                                    name={isCompleted ? "checkmark-sharp" : (isInProgress ? "play-sharp" : "document-text-outline")}
                                                    size={22}
                                                    color={isCompleted ? COLORS.success : (isInProgress ? COLORS.warning : COLORS.textMuted)}
                                                />
                                            </LinearGradient>

                                            <View style={styles.itemContent}>
                                                <Text style={styles.itemTitle} numberOfLines={2}>
                                                    {item.title.replace(/^(\[.*?\]\s*|.*?•\s*)+/, "")}
                                                </Text>
                                                <Text style={styles.itemMeta}>{item.total_questions}문항</Text>
                                            </View>

                                            <View style={styles.itemFooter}>
                                                {isCompleted ? (
                                                    <View style={styles.analysisBadge}>
                                                        <Text style={styles.analysisBadgeText}>분석</Text>
                                                        <Ionicons name="chevron-forward" size={10} color={COLORS.primary} />
                                                    </View>
                                                ) : isInProgress ? (
                                                    <View style={styles.progressContainer}>
                                                        <View style={styles.progressBarBg}>
                                                            <View style={[styles.progressBarFill, { width: '45%' }]} />
                                                        </View>
                                                        <Text style={styles.progressText}>진행중</Text>
                                                    </View>
                                                ) : (
                                                    <View style={styles.startBadge}>
                                                        <Text style={styles.startBadgeText}>시작</Text>
                                                    </View>
                                                )}
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

const { width } = Dimensions.get('window');

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
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    subjectSection: {
        paddingTop: 32,
    },
    subjectHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    subjectBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        paddingLeft: 10,
        paddingRight: 10,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
    },
    badgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.primary,
    },
    subjectTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: COLORS.text,
        letterSpacing: -0.3,
    },
    subjectCounter: {
        backgroundColor: COLORS.bg,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    subjectCounterText: {
        fontSize: 11,
        fontWeight: '900',
        color: COLORS.textMuted,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
        gap: 10,
    },
    gridItem: {
        width: (width - 32 - 20) / 3, // Precise 3-column split
        backgroundColor: COLORS.white,
        borderRadius: 28,
        padding: 12,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
        justifyContent: 'space-between',
        minHeight: 160,
    },
    gridItemCompleted: {
        backgroundColor: '#F8F9FA',
        shadowOpacity: 0.01,
    },
    iconBoxGradient: {
        width: 44,
        height: 44,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    itemContent: {
        flex: 1,
        marginBottom: 12,
    },
    itemTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: COLORS.text,
        lineHeight: 18,
        letterSpacing: -0.5,
        marginBottom: 6,
    },
    itemMeta: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    itemFooter: {
        marginTop: 'auto',
    },
    analysisBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: COLORS.primaryLight,
        paddingVertical: 6,
        borderRadius: 12,
    },
    analysisBadgeText: {
        fontSize: 11,
        fontWeight: '900',
        color: COLORS.primary,
    },
    progressContainer: {
        gap: 6,
    },
    progressBarBg: {
        height: 4,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: COLORS.warning,
        borderRadius: 2,
    },
    progressText: {
        fontSize: 10,
        fontWeight: '800',
        color: COLORS.warning,
        textAlign: 'center',
    },
    startBadge: {
        backgroundColor: '#F0F0F3',
        paddingVertical: 6,
        borderRadius: 12,
        alignItems: 'center',
    },
    startBadgeText: {
        fontSize: 11,
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
