import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChallengeCard } from "../../../../components/ui/ChallengeCard";
import { ParticipantRow } from "../../../../components/ui/ParticipantRow";
import { PrimaryButton } from "../../../../components/ui/PrimaryButton";
import { ScreenHeader } from "../../../../components/ui/ScreenHeader";
import type { StatusType } from "../../../../components/ui/StatusBadge";
import type { Database } from "../../../../lib/db-types";
import { useSupabase } from "../../../../lib/supabase";
import { formatSupabaseError } from "../../../../lib/supabaseError";
import { COLORS } from "../../../../lib/theme";

type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];
type RoomMemberRow = Database["public"]["Tables"]["room_members"]["Row"];
type RoomExamRow = Database["public"]["Tables"]["room_exams"]["Row"];
type AttemptRow = Database["public"]["Tables"]["attempts"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

interface ParticipantWithData extends RoomMemberRow {
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

    const isMember = useMemo(() => participants.some(p => p.user_id === userId), [participants, userId]);
    const selectedExam = useMemo(() => exams.find(e => e.id === selectedExamId), [exams, selectedExamId]);
    const myAttempt = useMemo(() => participants.find(p => p.user_id === userId)?.attempt, [participants, userId]);

    // Split participants
    const activeParticipants = useMemo(() =>
        participants.filter(p => p.attempt && !p.attempt.ended_at),
        [participants]);

    const finishedParticipants = useMemo(() =>
        participants.filter(p => p.attempt && p.attempt.ended_at)
            .sort((a, b) => (a.attempt?.duration_ms || 0) - (b.attempt?.duration_ms || 0)),
        [participants]);

    const otherParticipants = useMemo(() =>
        participants.filter(p => !p.attempt),
        [participants]);

    const handleJoin = async () => {
        if (!roomId || !userId) return;
        setJoining(true);
        try {
            const { error } = await supabase
                .from("room_members")
                .insert({ room_id: roomId, user_id: userId });
            if (error) throw error;
            loadData();
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

    const getStatus = (attempt?: AttemptRow): StatusType => {
        if (!attempt) return 'NOT_STARTED';
        if (attempt.ended_at) return 'COMPLETED';
        return 'IN_PROGRESS';
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
                rightElement={
                    <Pressable onPress={handleShare} style={styles.headerAction}>
                        <Ionicons name="share-outline" size={22} color={COLORS.text} />
                    </Pressable>
                }
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Active Exam / Challenge Card */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>진행 중 이벤트</Text>
                    {selectedExam ? (
                        <ChallengeCard
                            title={selectedExam.title}
                            questionCount={selectedExam.total_questions}
                            timeMinutes={selectedExam.total_minutes}
                            participantCount={activeParticipants.length + finishedParticipants.length}
                            description={selectedExam.description || undefined}
                            onStart={() => {
                                if (myAttempt?.ended_at) {
                                    router.push(`/(tabs)/rooms/${roomId}/exam/${selectedExamId}`);
                                } else {
                                    router.push(`/(tabs)/rooms/${roomId}/exam/${selectedExamId}/run`);
                                }
                            }}
                            buttonLabel={myAttempt?.ended_at ? "완료" : "챌린지 참여"}
                        />
                    ) : (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyText}>현재 진행 중인 시험이 없습니다.</Text>
                        </View>
                    )}
                </View>

                {/* Section: Live Now */}
                {activeParticipants.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.liveIndicator}>
                                <View style={styles.liveDot} />
                                <Text style={styles.liveText}>지금 진행 중</Text>
                            </View>
                            <Text style={styles.countText}>{activeParticipants.length}</Text>
                        </View>
                        {activeParticipants.map(p => (
                            <ParticipantRow
                                key={p.user_id}
                                name={p.profile?.display_name || `사용자 ${(p.user_id || "").slice(0, 4)}`}
                                status="IN_PROGRESS"
                                isMe={p.user_id === userId}
                                progress="레이싱 중..."
                            />
                        ))}
                    </View>
                )}

                {/* Section: Leaderboard Preview */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionLabel}>리더보드</Text>
                    </View>
                    {finishedParticipants.length === 0 ? (
                        <View style={styles.emptyList}>
                            <Text style={styles.emptyListText}>첫 완료자가 되어보세요!</Text>
                        </View>
                    ) : (
                        finishedParticipants.map((p, index) => (
                            <ParticipantRow
                                key={p.user_id}
                                name={p.profile?.display_name || `사용자 ${(p.user_id || "").slice(0, 4)}`}
                                status="COMPLETED"
                                isMe={p.user_id === userId}
                                rank={index + 1}
                                lastUpdated={p.attempt?.ended_at ? new Date(p.attempt.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined}
                            />
                        ))
                    )}
                </View>

                {/* Section: Others */}
                {otherParticipants.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>참여 대기</Text>
                        {otherParticipants.map(p => (
                            <ParticipantRow
                                key={p.user_id}
                                name={p.profile?.display_name || `사용자 ${(p.user_id || "").slice(0, 4)}`}
                                status="NOT_STARTED"
                                isMe={p.user_id === userId}
                            />
                        ))}
                    </View>
                )}

                {!isMember && (
                    <View style={styles.joinOverlay}>
                        <View style={styles.joinCard}>
                            <Text style={styles.joinTitle}>레이스 참여</Text>
                            <Text style={styles.joinDesc}>이 룸에 참여해 실시간으로 함께 경쟁해 보세요.</Text>
                            <PrimaryButton
                                label="룸 참여"
                                onPress={handleJoin}
                                loading={joining}
                                style={{ width: '100%', marginTop: 16 }}
                            />
                        </View>
                    </View>
                )}
            </ScrollView>

            {error && (
                <View style={styles.errorBanner}>
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
    headerAction: {
        padding: 4,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    section: {
        paddingHorizontal: 20,
        marginTop: 24,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.error,
    },
    liveText: {
        fontSize: 13,
        fontWeight: '800',
        color: COLORS.error,
    },
    countText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    emptyCard: {
        padding: 24,
        alignItems: 'center',
        backgroundColor: COLORS.surfaceVariant,
        borderRadius: 16,
    },
    emptyText: {
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    emptyList: {
        padding: 16,
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
    },
    emptyListText: {
        color: COLORS.textMuted,
        fontStyle: 'italic',
    },
    joinOverlay: {
        margin: 20,
        marginTop: 40,
    },
    joinCard: {
        padding: 24,
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    joinTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 8,
    },
    joinDesc: {
        fontSize: 14,
        color: COLORS.textMuted,
        textAlign: 'center',
        lineHeight: 20,
    },
    errorBanner: {
        margin: 20,
        padding: 12,
        backgroundColor: COLORS.errorLight,
        borderRadius: 12,
        alignItems: 'center',
    },
    errorText: {
        color: COLORS.error,
        fontSize: 13,
        fontWeight: '600',
    },
});
