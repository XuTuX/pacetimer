import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ParticipantRow } from "../../../../components/ui/ParticipantRow";
import { ScreenHeader } from "../../../../components/ui/ScreenHeader";
import type { Database } from "../../../../lib/db-types";
import { useSupabase } from "../../../../lib/supabase";
import { formatSupabaseError } from "../../../../lib/supabaseError";
import { COLORS } from "../../../../lib/theme";

type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];
type RoomMemberRow = Database["public"]["Tables"]["room_members"]["Row"];
type RoomExamRow = Database["public"]["Tables"]["room_exams"]["Row"];
type AttemptRow = Database["public"]["Tables"]["attempts"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

interface ParticipantWithData {
    user_id: string;
    room_id: string;
    role: string;
    profile?: ProfileRow;
    attempt?: AttemptRow;
}

export default function RoomHomeScreen() {
    const supabase = useSupabase();
    const router = useRouter();
    const { userId } = useAuth();
    const { id } = useLocalSearchParams<{ id: string }>();

    const roomId = Array.isArray(id) ? id[0] : id;

    const [room, setRoom] = useState<RoomRow | null>(null);
    const [participants, setParticipants] = useState<ParticipantWithData[]>([]);
    const [exams, setExams] = useState<RoomExamRow[]>([]);
    const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [joining, setJoining] = useState(false);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        if (!roomId) return;
        setLoading(true);
        setError(null);
        try {
            // 1. Fetch Room Info
            const { data: roomData, error: roomError } = await supabase
                .from("rooms")
                .select("*")
                .eq("id", roomId)
                .single();
            if (roomError) throw roomError;
            setRoom(roomData);

            // 2. Fetch Exams
            const { data: examData, error: examError } = await supabase
                .from("room_exams")
                .select("*")
                .eq("room_id", roomId)
                .order("created_at", { ascending: false });
            if (examError) throw examError;
            const fetchedExams = examData ?? [];
            setExams(fetchedExams);

            let currentExamId = selectedExamId;
            if (fetchedExams.length > 0 && !currentExamId) {
                currentExamId = fetchedExams[0].id;
                setSelectedExamId(currentExamId);
            }

            // 3. Fetch Participants with Profiles
            const { data: partData, error: partError } = await supabase
                .from("room_members")
                .select(`
                    *,
                    profile:profiles(*)
                `)
                .eq("room_id", roomId);

            if (partError) throw partError;

            let participantsWithData: ParticipantWithData[] = (partData as any) ?? [];

            // 4. Fetch Attempts for the selected exam
            if (currentExamId) {
                const { data: attemptData, error: attemptError } = await supabase
                    .from("attempts")
                    .select("*")
                    .eq("exam_id", currentExamId);

                if (!attemptError && attemptData) {
                    participantsWithData = participantsWithData.map(p => ({
                        ...p,
                        attempt: attemptData.find(a => a.user_id === p.user_id)
                    }));
                }
            }

            setParticipants(participantsWithData);

            if (userId) {
                const currentMember = participantsWithData.find(p => p.user_id === userId);
                setCurrentUserRole(currentMember?.role ?? null);
            }

        } catch (err: any) {
            setError(formatSupabaseError(err));
        } finally {
            setLoading(false);
        }
    }, [roomId, selectedExamId, supabase]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const isOwner = room?.owner_id === userId;
    const canCreateExam = useMemo(() => {
        if (isOwner) return true;
        if (!currentUserRole) return false;
        const normalizedRole = currentUserRole.toLowerCase();
        return normalizedRole === "host" || normalizedRole === "owner";
    }, [currentUserRole, isOwner]);

    const isMember = useMemo(() => participants.some(p => p.user_id === userId), [participants, userId]);
    const selectedExam = useMemo(() => exams.find(e => e.id === selectedExamId) || exams[0], [exams, selectedExamId]);
    const myAttempt = useMemo(() => participants.find(p => p.user_id === userId)?.attempt, [participants, userId]);

    // Split participants
    const activeParticipants = useMemo(() =>
        participants.filter(p => p.attempt && !p.attempt.ended_at),
        [participants]);

    const finishedParticipants = useMemo(() =>
        participants.filter(p => p.attempt && p.attempt.ended_at)
            .sort((a, b) => (a.attempt?.duration_ms || 0) - (b.attempt?.duration_ms || 0)),
        [participants]);

    const handleLeaveRoom = async () => {
        if (!roomId || !userId) return;
        try {
            const { error } = await supabase
                .from("room_members")
                .delete()
                .eq("room_id", roomId)
                .eq("user_id", userId);
            if (error) throw error;
            router.replace('/(tabs)/rooms');
        } catch (err) {
            setError(formatSupabaseError(err));
        }
    };

    const handleJoin = async () => {
        if (!roomId || !userId) return;
        setJoining(true);
        try {
            const { error } = await supabase
                .from("room_members")
                .insert({ room_id: roomId, user_id: userId });
            if (error) throw error;
            await loadData();
        } catch (err) {
            setError(formatSupabaseError(err));
        } finally {
            setJoining(false);
        }
    };

    const handleShare = async () => {
        if (!room) return;
        try {
            await Share.share({
                message: `Pacetime에서 "${room.name}" 스터디 룸에 참여하세요! 룸 ID: ${room.id}`,
            });
        } catch (error) {
            // ignore
        }
    };

    const openExamRunner = async () => {
        if (!selectedExam) return;

        // Auto-join if not member
        if (!isMember && roomId && userId) {
            try {
                await supabase
                    .from("room_members")
                    .insert({ room_id: roomId, user_id: userId });
            } catch (err) {
                console.error("Auto-join failed:", err);
            }
        }

        if (myAttempt?.ended_at) {
            router.push(`/room/${roomId}/exam/${selectedExam.id}`);
        } else {
            router.push(`/room/${roomId}/exam/${selectedExam.id}/run`);
        }
    };

    if (loading && !room) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader
                title={room?.name || "룸"}
                showBack={false}
                rightElement={
                    <View style={styles.headerActions}>
                        {canCreateExam && (
                            <Pressable onPress={() => router.push(`/room/${roomId}/add-exam`)} style={styles.headerBtn}>
                                <Ionicons name="add" size={22} color={COLORS.text} />
                            </Pressable>
                        )}
                        <Pressable onPress={handleShare} style={styles.headerBtn}>
                            <Ionicons name="share-outline" size={20} color={COLORS.text} />
                        </Pressable>
                        <Pressable onPress={() => router.replace('/(tabs)/rooms')} style={styles.headerBtn}>
                            <Ionicons name="close" size={24} color={COLORS.text} />
                        </Pressable>
                    </View>
                }
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Hero Section */}
                <View style={styles.heroSection}>
                    <Text style={styles.welcomeText}>안녕하세요!</Text>
                    <Text style={styles.roomName}>{room?.name || "스터디 룸"}</Text>
                    <Text style={styles.roomDesc}>함께 공부하며 목표를 달성해봐요.</Text>
                </View>

                {/* Main Action / Active Challenge */}
                <View style={styles.mainSection}>
                    <Text style={styles.sectionLabel}>진행 중인 시험</Text>
                    {selectedExam ? (
                        <Pressable onPress={openExamRunner} style={styles.challengeCard}>
                            <View style={styles.challengeIconBox}>
                                <Ionicons name="rocket" size={24} color={COLORS.primary} />
                            </View>
                            <View style={styles.challengeDetails}>
                                <Text style={styles.challengeTitle} numberOfLines={1}>{selectedExam.title}</Text>
                                <View style={styles.challengeMeta}>
                                    <View style={styles.metaBadge}>
                                        <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
                                        <Text style={styles.metaText}>{selectedExam.total_minutes}분</Text>
                                    </View>
                                    <View style={styles.metaBadge}>
                                        <Ionicons name="document-text-outline" size={14} color={COLORS.textMuted} />
                                        <Text style={styles.metaText}>{selectedExam.total_questions}문제</Text>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.startBtn}>
                                <Text style={styles.startBtnText}>
                                    {myAttempt?.ended_at ? '결과보기' : (myAttempt ? '이어하기' : '시작하기')}
                                </Text>
                                <Ionicons name="chevron-forward" size={16} color={COLORS.white} />
                            </View>
                        </Pressable>
                    ) : (
                        <View style={styles.emptyChallenge}>
                            <Ionicons name="document-text-outline" size={32} color={COLORS.textMuted} opacity={0.5} />
                            <Text style={styles.emptyChallengeText}>진행 중인 시험이 없습니다.</Text>
                            {canCreateExam && (
                                <Pressable
                                    onPress={() => router.push(`/room/${roomId}/add-exam`)}
                                    style={styles.inlineCreateBtn}
                                >
                                    <Text style={styles.inlineCreateText}>첫 시험 만들기</Text>
                                </Pressable>
                            )}
                        </View>
                    )}
                </View>

                {/* Participants */}
                <View style={styles.participantsSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionLabel}>참여 중인 멤버</Text>
                        <View style={styles.countBadgeContainer}>
                            <Text style={styles.countBadgeText}>{participants.length}</Text>
                        </View>
                    </View>

                    {participants.map((p) => {
                        const isStudying = p.attempt && !p.attempt.ended_at;
                        return (
                            <ParticipantRow
                                key={p.user_id}
                                name={p.user_id === userId ? `${p.profile?.display_name} (나)` : (p.profile?.display_name || "사용자")}
                                status={isStudying ? "IN_PROGRESS" : (p.attempt?.ended_at ? "COMPLETED" : "NOT_STARTED")}
                                isMe={p.user_id === userId}
                                progress={isStudying ? "집중하는 중" : (p.attempt?.ended_at ? "완료" : "대기 중")}
                            />
                        );
                    })}

                    {participants.length === 0 && (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>참여 중인 멤버가 없습니다.</Text>
                        </View>
                    )}
                </View>

                {/* All Exams Section */}
                {exams.length > 1 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionLabel}>모든 시험</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.examsHorizontal}>
                            {exams.map(exam => (
                                <Pressable
                                    key={exam.id}
                                    onPress={() => setSelectedExamId(exam.id)}
                                    style={[styles.miniExamCard, selectedExamId === exam.id && styles.selectedMiniCard]}
                                >
                                    <Text style={styles.miniExamTitle} numberOfLines={1}>{exam.title}</Text>
                                    <Text style={styles.miniExamMeta}>{exam.total_questions}문제 · {exam.total_minutes}분</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Footer Actions */}
                <View style={styles.footerActions}>
                    {isMember && (
                        <Pressable onPress={handleLeaveRoom} style={styles.leaveRoomBtn}>
                            <Ionicons name="exit-outline" size={16} color={COLORS.textMuted} />
                            <Text style={styles.leaveRoomText}>룸에서 나가기</Text>
                        </Pressable>
                    )}
                </View>
            </ScrollView>

            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}
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
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    heroSection: {
        padding: 24,
        paddingTop: 12,
    },
    welcomeText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
        marginBottom: 4,
    },
    roomName: {
        fontSize: 28,
        fontWeight: '900',
        color: COLORS.text,
        letterSpacing: -1,
    },
    roomDesc: {
        fontSize: 14,
        color: COLORS.textMuted,
        marginTop: 4,
        fontWeight: '500',
    },
    mainSection: {
        paddingHorizontal: 20,
        marginBottom: 32,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
    },
    challengeCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 5,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    challengeIconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    challengeDetails: {
        flex: 1,
    },
    challengeTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 6,
    },
    challengeMeta: {
        flexDirection: 'row',
        gap: 12,
    },
    metaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    startBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    startBtnText: {
        color: COLORS.white,
        fontSize: 13,
        fontWeight: '800',
    },
    emptyChallenge: {
        backgroundColor: COLORS.surfaceVariant,
        borderRadius: 24,
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
    },
    emptyChallengeText: {
        marginTop: 12,
        fontSize: 14,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    participantsSection: {
        paddingHorizontal: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    countBadge: {
        backgroundColor: COLORS.surfaceVariant,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textMuted,
        marginBottom: 16,
    },
    participantsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
    },
    participantItem: {
        width: 70,
        alignItems: 'center',
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        padding: 3,
        backgroundColor: COLORS.bg,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 8,
        position: 'relative',
    },
    activeAvatar: {
        borderColor: COLORS.primary,
        borderWidth: 2,
    },
    avatarInner: {
        flex: 1,
        borderRadius: 27,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusRing: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: COLORS.bg,
        borderRadius: 10,
        padding: 2,
    },
    statusDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.primary,
        borderWidth: 2,
        borderColor: COLORS.surface,
    },
    participantName: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.text,
        textAlign: 'center',
    },
    activeText: {
        color: COLORS.primary,
        fontWeight: '800',
    },
    activeLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: COLORS.primary,
        marginTop: 2,
    },
    footerActions: {
        marginTop: 48,
        alignItems: 'center',
    },
    leaveRoomBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 12,
    },
    leaveRoomText: {
        fontSize: 13,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    errorContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        padding: 16,
        backgroundColor: COLORS.errorLight,
        borderRadius: 16,
        alignItems: 'center',
    },
    errorText: {
        color: COLORS.error,
        fontSize: 14,
        fontWeight: '600',
    },
    emptyText: {
        fontSize: 13,
        color: COLORS.textMuted,
        fontStyle: 'italic',
    },
    inlineCreateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: COLORS.primaryLight,
        marginTop: 12,
    },
    inlineCreateText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.primary,
    },
    countBadgeContainer: {
        backgroundColor: COLORS.surfaceVariant,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    countBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    section: {
        paddingHorizontal: 20,
        marginTop: 24,
    },
    examsHorizontal: {
        paddingRight: 20,
        gap: 12,
        paddingBottom: 8,
    },
    miniExamCard: {
        width: 160,
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    selectedMiniCard: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryLight,
    },
    miniExamTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    miniExamMeta: {
        fontSize: 11,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
});
