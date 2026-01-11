import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { ParticipantRow } from "../../../../components/ui/ParticipantRow";
import { ScreenHeader } from "../../../../components/ui/ScreenHeader";
import type { Database } from "../../../../lib/db-types";
import { useSupabase } from "../../../../lib/supabase";
import { formatSupabaseError } from "../../../../lib/supabaseError";
import { COLORS } from "../../../../lib/theme";

type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];
type RoomMemberRow = Database["public"]["Tables"]["room_members"]["Row"];
type AttemptRow = Database["public"]["Tables"]["attempts"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

interface ParticipantWithData {
    user_id: string;
    room_id: string;
    role: string;
    profile?: ProfileRow;
}

export default function RoomHomeScreen() {
    const supabase = useSupabase();
    const router = useRouter();
    const { userId } = useAuth();
    const { id } = useLocalSearchParams<{ id: string }>();

    const roomId = Array.isArray(id) ? id[0] : id;

    const [room, setRoom] = useState<RoomRow | null>(null);
    const [participants, setParticipants] = useState<ParticipantWithData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
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

            // 2. Fetch Participants with Profiles
            const { data: partData, error: partError } = await supabase
                .from("room_members")
                .select(`
                    *,
                    profile:profiles(*)
                `)
                .eq("room_id", roomId);

            if (partError) throw partError;

            let participantsWithData: ParticipantWithData[] = (partData as any) ?? [];
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
    }, [roomId, supabase, userId]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const isMember = useMemo(() => participants.some(p => p.user_id === userId), [participants, userId]);
    const host = useMemo(() => participants.find(p => p.user_id === room?.owner_id), [participants, room?.owner_id]);

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

    if (loading && !room) {
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
                title={room?.name || "룸"}
                showBack={false}
                rightElement={
                    <View style={styles.headerActions}>
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
                {/* Hero section with glassmorphism feel */}
                <View style={styles.heroSection}>
                    <View style={styles.heroContent}>
                        <Text style={styles.welcomeTitle}>Welcome to</Text>
                        <Text style={styles.roomNameLarge}>{room?.name}</Text>
                        <View style={styles.divider} />
                        <Text style={styles.roomDescLarge}>함께 목표를 향해 달리는 스터디 공간입니다.</Text>
                    </View>
                </View>

                {/* Host Info Section */}
                <View style={styles.hostSection}>
                    <Text style={styles.sectionTitle}>방장</Text>
                    <View style={styles.hostCard}>
                        <View style={styles.hostAvatar}>
                            <Ionicons name="person" size={24} color={COLORS.primary} />
                            <View style={styles.ownerBadge}>
                                <Ionicons name="star" size={10} color={COLORS.white} />
                            </View>
                        </View>
                        <View style={styles.hostDetails}>
                            <Text style={styles.hostName}>{host?.profile?.display_name || "방장"}</Text>
                            <Text style={styles.hostRole}>스터디 마스터</Text>
                        </View>
                        <View style={styles.hostStatusBadge}>
                            <Text style={styles.hostStatusText}>온라인</Text>
                        </View>
                    </View>
                </View>

                {/* Stats Summary Card */}
                <View style={styles.summaryCard}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{participants.length}</Text>
                        <Text style={styles.statLabel}>참여자</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>LIVE</Text>
                        <Text style={styles.statLabel}>방 상태</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{new Date(room?.created_at || '').toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</Text>
                        <Text style={styles.statLabel}>개설일</Text>
                    </View>
                </View>

                {/* Participants List */}
                <View style={styles.participantsSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>참여 중인 멤버</Text>
                        <View style={styles.memberCount}>
                            <Text style={styles.memberCountText}>{participants.length}명</Text>
                        </View>
                    </View>

                    <View style={styles.participantsList}>
                        {participants.map((p) => {
                            const isHost = p.user_id === room?.owner_id;
                            return (
                                <ParticipantRow
                                    key={p.user_id}
                                    name={p.profile?.display_name || "사용자"}
                                    status="NOT_STARTED" // Dummy, overridden by customRightElement
                                    isMe={p.user_id === userId}
                                    customRightElement={
                                        <View style={[
                                            styles.roleBadge,
                                            isHost ? styles.roleBadgeHost : styles.roleBadgeMember
                                        ]}>
                                            <Text style={[
                                                styles.roleBadgeText,
                                                isHost ? styles.roleBadgeTextHost : styles.roleBadgeTextMember
                                            ]}>
                                                {isHost ? "호스트" : "멤버"}
                                            </Text>
                                        </View>
                                    }
                                />
                            );
                        })}
                    </View>

                    {participants.length === 0 && (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>참여 중인 멤버가 없습니다.</Text>
                        </View>
                    )}
                </View>

                {/* Footer Actions */}
                <View style={styles.footerActions}>
                    {isMember && userId !== room?.owner_id && (
                        <Pressable onPress={handleLeaveRoom} style={styles.leaveRoomBtn}>
                            <Ionicons name="exit-outline" size={16} color={COLORS.error} />
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
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    scrollContent: {
        paddingBottom: 60,
    },
    heroSection: {
        padding: 24,
        paddingBottom: 32,
    },
    heroContent: {
        backgroundColor: COLORS.primary,
        borderRadius: 32,
        padding: 32,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    welcomeTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.7)',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    roomNameLarge: {
        fontSize: 32,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: -0.5,
    },
    divider: {
        height: 2,
        width: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        marginVertical: 16,
    },
    roomDescLarge: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '500',
        lineHeight: 24,
    },
    hostSection: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
    },
    hostCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
    },
    hostAvatar: {
        width: 56,
        height: 56,
        borderRadius: 22,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    ownerBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        backgroundColor: COLORS.primary,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: COLORS.surface,
    },
    hostDetails: {
        flex: 1,
        marginLeft: 16,
    },
    hostName: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 2,
    },
    hostRole: {
        fontSize: 13,
        color: COLORS.primary,
        fontWeight: '700',
    },
    hostStatusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: '#E8F5E9',
    },
    hostStatusText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#2E7D32',
    },
    summaryCard: {
        flexDirection: 'row',
        marginHorizontal: 24,
        marginBottom: 32,
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontWeight: '900',
        color: COLORS.text,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 11,
        color: COLORS.textMuted,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: COLORS.border,
    },
    participantsSection: {
        paddingHorizontal: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    memberCount: {
        backgroundColor: COLORS.surfaceVariant,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    memberCountText: {
        fontSize: 11,
        fontWeight: '800',
        color: COLORS.textMuted,
    },
    participantsList: {
        gap: 12,
    },
    roleBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    roleBadgeHost: {
        backgroundColor: COLORS.primaryLight,
    },
    roleBadgeMember: {
        backgroundColor: COLORS.surfaceVariant,
    },
    roleBadgeText: {
        fontSize: 11,
        fontWeight: '800',
    },
    roleBadgeTextHost: {
        color: COLORS.primary,
    },
    roleBadgeTextMember: {
        color: COLORS.textMuted,
    },
    footerActions: {
        marginTop: 40,
        alignItems: 'center',
    },
    leaveRoomBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
    },
    leaveRoomText: {
        fontSize: 14,
        color: COLORS.error,
        fontWeight: '700',
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.textMuted,
        fontStyle: 'italic',
    },
    errorContainer: {
        position: 'absolute',
        bottom: 24,
        left: 24,
        right: 24,
        padding: 16,
        backgroundColor: '#FFEBEE',
        borderRadius: 16,
        alignItems: 'center',
    },
    errorText: {
        color: '#D32F2F',
        fontSize: 14,
        fontWeight: '600',
    },
});
