import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChallengeCard } from "../../../components/ui/ChallengeCard";
import { ParticipantRow } from "../../../components/ui/ParticipantRow";
import { PrimaryButton } from "../../../components/ui/PrimaryButton";
import { ScreenHeader } from "../../../components/ui/ScreenHeader";
import type { Database } from "../../../lib/db-types";
import { useSupabase } from "../../../lib/supabase";
import { formatSupabaseError } from "../../../lib/supabaseError";
import { COLORS } from "../../../lib/theme";

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
    // const selectedExam = useMemo(() => exams.find(e => e.id === selectedExamId), [exams, selectedExamId]); // Redundant if we just use exams[0] or selectedExamId logic properly
    // Let's stick to the active one for now
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
                message: `Join my study room "${room.name}" on Pacetime! Room ID: ${room.id}`,
            });
        } catch (error) {
            // ignore
        }
    };

    const openExamRunner = () => {
        if (!selectedExam) return;
        // Navigate to the runner stack
        router.push(`/(tabs)/rooms/${roomId}/exam/${selectedExam.id}/run`);
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
                title={room?.name || "Room"}
                showBack={true}
                onBack={() => router.replace('/(tabs)/rooms')}
                rightElement={
                    <Pressable onPress={handleShare} style={styles.headerAction}>
                        <Ionicons name="share-outline" size={24} color={COLORS.text} />
                    </Pressable>
                }
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Hero / Active Exam Section */}
                <View style={styles.heroSection}>
                    <Text style={styles.sectionLabel}>Next Challenge</Text>
                    {selectedExam ? (
                        <ChallengeCard
                            title={selectedExam.title}
                            questionCount={selectedExam.total_questions}
                            timeMinutes={selectedExam.total_minutes}
                            participantCount={participants.length} // Showing total room members here might be better for "Potential"
                            onStart={openExamRunner}
                            buttonLabel={myAttempt?.ended_at ? "View Results" : "Enter Challenge"}

                        // If finished, maybe redirect to results?
                        // Logic: If ended, buttonLabel is "View Results" -> still runs openExamRunner?
                        // Probably should go to Race tab instead if finished.
                        // Let's refine onStart.
                        />
                    ) : (
                        <View style={styles.emptyCard}>
                            <Ionicons name="file-tray-outline" size={48} color={COLORS.textMuted} />
                            <Text style={styles.emptyText}>No active exams.</Text>
                            <Text style={styles.emptySubText}>The host hasn't started a session yet.</Text>
                        </View>
                    )}
                </View>

                {/* Quick Stats / Info */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{participants.length}</Text>
                        <Text style={styles.statLabel}>Members</Text>
                    </View>
                    <View style={styles.statSeparator} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{finishedParticipants.length}</Text>
                        <Text style={styles.statLabel}>Finished</Text>
                    </View>
                    <View style={styles.statSeparator} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{activeParticipants.length}</Text>
                        <Text style={styles.statLabel}>Racing</Text>
                    </View>
                </View>

                {/* Live Activity Section */}
                {(activeParticipants.length > 0) && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.liveIndicator}>
                                <View style={styles.liveDot} />
                                <Text style={styles.liveText}>LIVE RACERS</Text>
                            </View>
                        </View>
                        {activeParticipants.map(p => (
                            <ParticipantRow
                                key={p.user_id}
                                name={p.profile?.display_name || `User`}
                                status="IN_PROGRESS"
                                isMe={p.user_id === userId}
                                progress="In Progress"
                            />
                        ))}
                    </View>
                )}

                {/* Recent Finishers */}
                {finishedParticipants.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Recent Finishers</Text>
                        {finishedParticipants.slice(0, 5).map((p, index) => ( // Show top 5
                            <ParticipantRow
                                key={p.user_id}
                                name={p.profile?.display_name || `User`}
                                status="COMPLETED"
                                isMe={p.user_id === userId}
                                rank={index + 1}
                                lastUpdated={new Date(p.attempt!.ended_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            />
                        ))}
                        {finishedParticipants.length > 5 && (
                            <Pressable style={styles.viewAllBtn} onPress={() => router.push(`/room/${roomId}/rank`)}>
                                <Text style={styles.viewAllText}>View All Rankings</Text>
                                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                            </Pressable>
                        )}
                    </View>
                )}

                {!isMember && (
                    <View style={styles.joinOverlay}>
                        <View style={styles.joinMsgContainer}>
                            <Text style={styles.joinTitle}>Join {room?.name}</Text>
                            <Text style={styles.joinDesc}>Participate in group exams and track your progress together.</Text>
                            <PrimaryButton
                                label="Join Room"
                                onPress={handleJoin}
                                loading={joining}
                                style={{ width: '100%', marginTop: 20 }}
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
        padding: 8,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    heroSection: {
        padding: 20,
        paddingTop: 10,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
    },
    emptyCard: {
        padding: 40,
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    emptySubText: {
        marginTop: 4,
        fontSize: 14,
        color: COLORS.textMuted,
        textAlign: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: 20,
        padding: 20,
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        marginBottom: 24,
        borderWidth: 1, // subtle border
        borderColor: COLORS.border,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    statSeparator: {
        width: 1,
        height: 24,
        backgroundColor: COLORS.border,
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 24,
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
        backgroundColor: COLORS.errorLight,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.error,
    },
    liveText: {
        fontSize: 11,
        fontWeight: '800',
        color: COLORS.error,
    },
    viewAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        marginTop: 8,
    },
    viewAllText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textMuted,
        marginRight: 4,
    },
    joinOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: 40,
        backgroundColor: 'rgba(255,255,255,0.95)', // Glass effect overlay if possible? Or just solid
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    joinMsgContainer: {
        alignItems: 'center',
    },
    joinTitle: {
        fontSize: 18,
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
        position: 'absolute',
        top: 100,
        left: 20,
        right: 20,
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
