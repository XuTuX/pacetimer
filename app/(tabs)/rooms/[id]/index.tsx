import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ExamCard } from "../../../../components/rooms/ExamCard";
import { ParticipantList } from "../../../../components/rooms/ParticipantList";
import type { Database } from "../../../../lib/db-types";
import { useSupabase } from "../../../../lib/supabase";
import { formatSupabaseError } from "../../../../lib/supabaseError";
import { COLORS } from "../../../../lib/theme";

type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];
type RoomMemberRow = Database["public"]["Tables"]["room_members"]["Row"];
type RoomExamRow = Database["public"]["Tables"]["room_exams"]["Row"];

export default function RoomHomeScreen() {
    const supabase = useSupabase();
    const router = useRouter();
    const { userId } = useAuth();
    const { id } = useLocalSearchParams<{ id: string }>();

    const roomId = Array.isArray(id) ? id[0] : id;

    const [room, setRoom] = useState<RoomRow | null>(null);
    const [participants, setParticipants] = useState<RoomMemberRow[]>([]);
    const [exams, setExams] = useState<RoomExamRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [joining, setJoining] = useState(false);

    const loadData = useCallback(async () => {
        if (!roomId) return;
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

            const { data: partData, error: partError } = await supabase
                .from("room_members")
                .select("*")
                .eq("room_id", roomId);

            if (partError) {
                setParticipants([]);
                setExams([]);
            } else {
                setParticipants(partData ?? []);
                const { data: examData, error: examError } = await supabase
                    .from("room_exams")
                    .select("*")
                    .eq("room_id", roomId)
                    .order("created_at", { ascending: false });

                if (!examError) {
                    setExams(examData ?? []);
                }
            }
        } catch (err: any) {
            setError(formatSupabaseError(err));
        } finally {
            setLoading(false);
        }
    }, [roomId, supabase]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const isHost = room?.owner_id === userId;
    const isMember = participants.some(p => p.user_id === userId);

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
                message: `Join my study room "${room.name}" on Pacetime! Room ID: ${room.id}`,
            });
        } catch (error) {
            // ignore
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
        <SafeAreaView style={styles.container} edges={["top"]}>
            <View style={styles.topNav}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </Pressable>
                <View style={styles.topNavCenter}>
                    <Text style={styles.topNavTitle} numberOfLines={1}>{room?.name}</Text>
                </View>
                <Pressable onPress={handleShare} style={styles.shareIconButton}>
                    <Ionicons name="share-outline" size={22} color={COLORS.primary} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Hero / Header Section */}
                <View style={styles.heroSection}>
                    <View style={styles.roomIconCircle}>
                        <Text style={styles.roomIconText}>{room?.name?.charAt(0) || "R"}</Text>
                    </View>
                    <Text style={styles.roomNameMain}>{room?.name}</Text>
                    <View style={styles.codeContainer}>
                        <Text style={styles.codeLabel}>ROOM ID</Text>
                        <Text style={styles.codeValue} numberOfLines={1} ellipsizeMode="middle">
                            {room?.id}
                        </Text>
                    </View>
                    {room?.description ? (
                        <Text style={styles.roomDescription}>{room.description}</Text>
                    ) : null}
                </View>

                {/* Status / Join CTA */}
                {!isMember && !loading && (
                    <View style={styles.joinPromptCard}>
                        <View style={styles.lockCircle}>
                            <Ionicons name="lock-closed" size={24} color={COLORS.textMuted} />
                        </View>
                        <Text style={styles.joinPromptTitle}>Private Room</Text>
                        <Text style={styles.joinPromptSubtitle}>Join this room to participate in exams and see other members.</Text>
                        <Pressable
                            style={({ pressed }) => [styles.joinButtonLarge, pressed && { opacity: 0.9 }]}
                            onPress={handleJoin}
                            disabled={joining}
                        >
                            <Text style={styles.joinButtonLargeText}>{joining ? "Joining..." : "Join Study Group"}</Text>
                        </Pressable>
                    </View>
                )}

                {isMember && (
                    <>
                        <View style={styles.divider} />

                        {/* Participants Section */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Members</Text>
                                <Text style={styles.memberCount}>{participants.length}</Text>
                            </View>
                            <ParticipantList participants={participants} currentUserId={userId ?? undefined} />
                        </View>

                        <View style={styles.divider} />

                        {/* Exams Section */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Mock Exams</Text>
                                {isHost && (
                                    <Pressable
                                        style={({ pressed }) => [styles.addButtonSmall, pressed && { opacity: 0.8 }]}
                                        onPress={() => router.push(`/(tabs)/rooms/${roomId}/add-exam`)}
                                    >
                                        <Ionicons name="add" size={16} color={COLORS.primary} />
                                        <Text style={styles.addButtonSmallText}>Add New</Text>
                                    </Pressable>
                                )}
                            </View>

                            <View style={styles.examGrid}>
                                {exams.length === 0 ? (
                                    <View style={styles.emptyExams}>
                                        <Ionicons name="document-text-outline" size={40} color={COLORS.border} />
                                        <Text style={styles.emptyExamsText}>No exams scheduled yet.</Text>
                                    </View>
                                ) : (
                                    exams.map((exam) => (
                                        <ExamCard
                                            key={exam.id}
                                            exam={exam}
                                            onPress={() => router.push(`/(tabs)/rooms/${roomId}/exam/${exam.id}`)}
                                        />
                                    ))
                                )}
                            </View>
                        </View>
                    </>
                )}

                {error && (
                    <View style={styles.errorBanner}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
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
    topNav: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        height: 60,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: COLORS.surface,
    },
    topNavCenter: {
        flex: 1,
        alignItems: 'center',
    },
    topNavTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    shareIconButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: COLORS.primaryLight,
    },
    content: {
        paddingBottom: 40,
    },
    heroSection: {
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 24,
    },
    roomIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.text,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
    },
    roomIconText: {
        fontSize: 32,
        fontWeight: '900',
        color: COLORS.white,
    },
    roomNameMain: {
        fontSize: 28,
        fontWeight: '900',
        color: COLORS.text,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    codeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
        backgroundColor: COLORS.surface,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    codeLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: COLORS.textMuted,
        letterSpacing: 0.5,
    },
    codeValue: {
        fontSize: 14,
        fontWeight: '900',
        color: COLORS.primary,
        fontFamily: 'monospace',
        flexShrink: 1,
    },
    roomDescription: {
        fontSize: 15,
        color: COLORS.textMuted,
        textAlign: 'center',
        marginTop: 16,
        lineHeight: 22,
        fontWeight: '500',
    },
    joinPromptCard: {
        margin: 24,
        padding: 32,
        backgroundColor: COLORS.surface,
        borderRadius: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 30,
    },
    lockCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    joinPromptTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 8,
    },
    joinPromptSubtitle: {
        fontSize: 14,
        color: COLORS.textMuted,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    joinButtonLarge: {
        backgroundColor: COLORS.primary,
        width: '100%',
        height: 56,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
    },
    joinButtonLargeText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '800',
    },
    divider: {
        height: 8,
        backgroundColor: COLORS.surfaceVariant,
        opacity: 0.5,
    },
    section: {
        padding: 24,
        gap: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.text,
    },
    memberCount: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.textMuted,
        backgroundColor: COLORS.surfaceVariant,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    addButtonSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    addButtonSmallText: {
        color: COLORS.primary,
        fontSize: 12,
        fontWeight: '800',
    },
    examGrid: {
        gap: 12,
    },
    emptyExams: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    emptyExamsText: {
        fontSize: 14,
        color: COLORS.textMuted,
        fontWeight: '500',
    },
    errorBanner: {
        margin: 20,
        padding: 12,
        backgroundColor: COLORS.accentLight,
        borderRadius: 12,
        alignItems: 'center',
    },
    errorText: {
        color: COLORS.accent,
        fontSize: 13,
        fontWeight: '600',
    },
});
