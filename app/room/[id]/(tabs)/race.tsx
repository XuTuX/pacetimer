import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useGlobalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ExamCard } from "../../../../components/rooms/ExamCard";
import { ScreenHeader } from "../../../../components/ui/ScreenHeader";
import type { Database } from "../../../../lib/db-types";
import { useSupabase } from "../../../../lib/supabase";
import { formatSupabaseError } from "../../../../lib/supabaseError";
import { COLORS } from "../../../../lib/theme";

type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];
type RoomExamRow = Database["public"]["Tables"]["room_exams"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type RecordRow = Database["public"]["Tables"]["attempt_records"]["Row"];

interface ParticipantResult {
    userId: string;
    name: string;
    status: 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED';
    progressCount: number;
    isMe: boolean;
}

export default function RaceScreen() {
    const supabase = useSupabase();
    const router = useRouter();
    const { userId } = useAuth();
    const { id } = useGlobalSearchParams<{ id: string }>();
    const roomId = Array.isArray(id) ? id[0] : id;

    const [room, setRoom] = useState<RoomRow | null>(null);
    const [exams, setExams] = useState<RoomExamRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [participants, setParticipants] = useState<ParticipantResult[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

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

            const { data: mData, error: mError } = await supabase
                .from("room_members")
                .select(`*, profile:profiles(*)`)
                .eq("room_id", roomId);
            if (mError) throw mError;
            const members = mData || [];
            if (userId) {
                const currentMember = members.find((m: any) => m.user_id === userId);
                setCurrentUserRole(currentMember?.role ?? null);
            }

            // Fetch live progress for the latest exam if it exists
            if (fetchedExams.length > 0) {
                const latestExamId = fetchedExams[0].id;
                const { data: aData } = await supabase
                    .from("attempts")
                    .select("*")
                    .eq("exam_id", latestExamId);
                const attempts = aData || [];

                const attemptIds = attempts.map(a => a.id);
                let rData: RecordRow[] = [];
                if (attemptIds.length > 0) {
                    const { data: recData } = await supabase
                        .from("attempt_records")
                        .select("*")
                        .in("attempt_id", attemptIds);
                    rData = recData || [];
                }

                const results: ParticipantResult[] = members.map((m: any) => {
                    const attempt = attempts.find(a => a.user_id === m.user_id);
                    const records = rData.filter(r => r.attempt_id === attempt?.id);
                    return {
                        userId: m.user_id,
                        name: m.profile?.display_name || "사용자",
                        status: attempt ? (attempt.ended_at ? 'COMPLETED' : 'IN_PROGRESS') : 'NOT_STARTED',
                        progressCount: records.length,
                        isMe: m.user_id === userId,
                    };
                });
                setParticipants(results);
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

    const canCreateExam = true;

    const activeExam = useMemo(() => exams[0], [exams]);
    const myResult = useMemo(() => participants.find(p => p.isMe), [participants]);

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
                                } else {
                                    console.error("Room ID is missing in RaceScreen");
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
                {/* Create Exam Prompt Section - Shows when no exams exist or for prominent action */}
                {canCreateExam && exams.length === 0 && (
                    <View style={styles.createSection}>
                        <Pressable
                            onPress={() => {
                                if (roomId && roomId !== 'undefined') {
                                    router.push(`/room/${roomId}/add-exam`);
                                } else {
                                    console.error("Room ID is missing in RaceScreenPrompt");
                                }
                            }}
                            style={styles.createPromptCard}
                        >
                            <View style={styles.createIconBox}>
                                <Ionicons name="add" size={32} color={COLORS.white} />
                            </View>
                            <View style={styles.createTexts}>
                                <Text style={styles.createPromptTitle}>첫 시험 생성하기</Text>
                                <Text style={styles.createPromptSub}>모의고사를 만들어 함께 실력을 측정해보세요.</Text>
                            </View>
                        </Pressable>
                    </View>
                )}

                {/* Main Active Exam */}
                {activeExam && (
                    <View style={styles.activeExamSection}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionLabel}>진행 중인 시험</Text>
                            <View style={styles.liveIndicator}>
                                <View style={styles.liveDot} />
                                <Text style={styles.liveText}>READY</Text>
                            </View>
                        </View>

                        <View style={styles.heroExamCard}>
                            <View style={styles.heroExamInfo}>
                                <Text style={styles.heroExamTitle}>{activeExam.title}</Text>
                                <View style={styles.heroMetaRow}>
                                    <View style={styles.heroMetaItem}>
                                        <Ionicons name="time" size={16} color={COLORS.primary} />
                                        <Text style={styles.heroMetaText}>{activeExam.total_minutes}분</Text>
                                    </View>
                                    <View style={styles.heroMetaItem}>
                                        <Ionicons name="document-text" size={16} color={COLORS.primary} />
                                        <Text style={styles.heroMetaText}>{activeExam.total_questions}문제</Text>
                                    </View>
                                </View>
                            </View>

                            <Pressable
                                onPress={() => router.push(`/room/${roomId}/exam/${activeExam.id}/run`)}
                                style={styles.heroStartBtn}
                            >
                                <Text style={styles.heroStartBtnText}>
                                    {myResult?.status === 'IN_PROGRESS' ? '시험 이어하기' : (myResult?.status === 'COMPLETED' ? '한번 더 하기' : '시작하기')}
                                </Text>
                                <Ionicons name="rocket" size={18} color={COLORS.white} />
                            </Pressable>
                        </View>

                        {/* Real-time status for the active exam */}
                        {participants.length > 0 && (
                            <View style={styles.liveStatusContainer}>
                                <Text style={styles.liveStatusTitle}>현재 {participants.filter(p => p.status !== 'NOT_STARTED').length}명 참여 중</Text>
                                <View style={styles.avatarStalk}>
                                    {participants.filter(p => p.status !== 'NOT_STARTED').slice(0, 5).map((p, i) => (
                                        <View key={p.userId} style={[styles.miniAvatar, { marginLeft: i === 0 ? 0 : -10, zIndex: 10 - i }]}>
                                            <Text style={styles.miniAvatarText}>{p.name.charAt(0)}</Text>
                                        </View>
                                    ))}
                                    {participants.filter(p => p.status !== 'NOT_STARTED').length > 5 && (
                                        <View style={[styles.miniAvatar, styles.moreAvatar]}>
                                            <Text style={styles.moreAvatarText}>+{participants.filter(p => p.status !== 'NOT_STARTED').length - 5}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* Exam List Section */}
                <View style={styles.listSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionLabel}>시험 목록</Text>
                    </View>

                    {exams.length === 0 ? (
                        <View style={styles.emptyExams}>
                            <Ionicons name="document-text-outline" size={48} color={COLORS.border} />
                            <Text style={styles.emptyExamsText}>등록된 시험이 없습니다.</Text>
                        </View>
                    ) : (
                        <View style={styles.examList}>
                            {exams.map((item) => {
                                const participantStatus = item.id === activeExam?.id && myResult ? myResult.status : 'NOT_STARTED';
                                return (
                                    <ExamCard
                                        key={item.id}
                                        exam={item}
                                        onPress={() => {
                                            if (participantStatus === 'COMPLETED') {
                                                router.push({
                                                    pathname: `/room/${roomId}/analysis` as any,
                                                    params: { initialExamId: item.id }
                                                });
                                            } else {
                                                router.push(`/room/${roomId}/exam/${item.id}/run`);
                                            }
                                        }}
                                        attemptStatus={item.id === activeExam?.id && myResult ? (myResult.status === 'COMPLETED' ? 'completed' : myResult.status === 'IN_PROGRESS' ? 'in_progress' : 'none') : 'none'}
                                    />
                                );
                            })}
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
    createSection: {
        padding: 20,
    },
    createPromptCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 3,
    },
    createIconBox: {
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    createTexts: {
        flex: 1,
    },
    createPromptTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 4,
    },
    createPromptSub: {
        fontSize: 13,
        color: COLORS.textMuted,
        fontWeight: '500',
    },
    activeExamSection: {
        paddingHorizontal: 20,
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.primary,
    },
    liveText: {
        fontSize: 10,
        fontWeight: '900',
        color: COLORS.primary,
    },
    heroExamCard: {
        backgroundColor: COLORS.primary,
        borderRadius: 32,
        padding: 24,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 10,
    },
    heroExamInfo: {
        marginBottom: 24,
    },
    heroExamTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: COLORS.white,
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    heroMetaRow: {
        flexDirection: 'row',
        gap: 16,
    },
    heroMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    heroMetaText: {
        fontSize: 12,
        color: COLORS.white,
        fontWeight: '700',
    },
    heroStartBtn: {
        backgroundColor: COLORS.white,
        height: 56,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    heroStartBtnText: {
        color: COLORS.primary,
        fontSize: 16,
        fontWeight: '800',
    },
    liveStatusContainer: {
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    liveStatusTitle: {
        fontSize: 13,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    avatarStalk: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    miniAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.surfaceVariant,
        borderWidth: 2,
        borderColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    miniAvatarText: {
        fontSize: 10,
        fontWeight: '800',
        color: COLORS.text,
    },
    moreAvatar: {
        backgroundColor: COLORS.textMuted,
    },
    moreAvatarText: {
        fontSize: 10,
        fontWeight: '800',
        color: COLORS.white,
    },
    listSection: {
        paddingHorizontal: 20,
    },
    examList: {
        gap: 12,
    },
    emptyExams: {
        padding: 48,
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
    },
    emptyExamsText: {
        marginTop: 12,
        fontSize: 14,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
});

