import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useGlobalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
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
    const { id } = useGlobalSearchParams<{ id: string }>();

    const roomId = Array.isArray(id) ? id[0] : id;

    const [room, setRoom] = useState<RoomRow | null>(null);
    const [participants, setParticipants] = useState<ParticipantWithData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        if (!roomId || roomId === 'undefined') {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            // Fetch both Room and Members simultaneously to prevent flickering
            const [roomRes, membersRes] = await Promise.all([
                supabase.from("rooms").select("*").eq("id", roomId).single(),
                supabase.from("room_members").select(`*, profile:profiles(*)`).eq("room_id", roomId)
            ]);

            if (roomRes.error) throw roomRes.error;
            if (membersRes.error) throw membersRes.error;

            const roomData = roomRes.data;
            const participantsWithData: ParticipantWithData[] = (membersRes.data as any) ?? [];

            // Update all states together
            setRoom(roomData);
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

    const handleJoinRoom = async () => {
        if (!roomId || !userId) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from("room_members")
                .insert({ room_id: roomId, user_id: userId, role: "MEMBER" });
            if (error) throw error;
            await loadData();
        } catch (err) {
            setError(formatSupabaseError(err));
        } finally {
            setLoading(false);
        }
    };

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
                message: `Pacetime에서 "${room.name}" 스터디 룸에 초대합니다!\n\n아래 링크를 눌러 참여하세요:\nhttps://pacetime.app/room/${room.id}\n\n(초대 코드: ${room.id})`,
            });
        } catch (error) {
            // ignore
        }
    };

    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.5, duration: 1000, useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1, duration: 1000, useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, [pulseAnim]);

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
                {/* Hero section with Premium Gradient */}
                <View style={styles.heroSection}>
                    <LinearGradient
                        colors={['#1a1a1a', '#2d2d2d']}
                        style={styles.heroContent}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.heroHeader}>
                            <View style={styles.heroLabelBox}>
                                <Ionicons name="flash" size={10} color={COLORS.primary} />
                                <Text style={styles.heroLabel}>LIVE SESSION</Text>
                            </View>
                            <View style={styles.heroBadge}>
                                <Animated.View style={[styles.pulseDot, { transform: [{ scale: pulseAnim }], opacity: pulseAnim.interpolate({ inputRange: [1, 1.5], outputRange: [1, 0.4] }) }]} />
                                <View style={[styles.pulseDot, { position: 'absolute', left: 12, top: 12 }]} />
                                <Text style={styles.heroBadgeText}>ACTIVE</Text>
                            </View>
                        </View>

                        <View style={styles.titleContainer}>
                            <Text style={styles.roomNameLarge}>{room?.name}</Text>
                            <View style={styles.tagRow}>
                                <Text style={styles.tagText}>#스터디</Text>
                                <Text style={styles.tagText}>#실시간</Text>
                                <Text style={styles.tagText}>#경쟁</Text>
                            </View>
                        </View>

                        <View style={styles.participantOverview}>
                            <View style={styles.avatarStack}>
                                {participants.slice(0, 5).map((p, idx) => {
                                    const isHost = p.user_id === room?.owner_id;
                                    return (
                                        <View
                                            key={p.user_id}
                                            style={[
                                                styles.stackedAvatar,
                                                { marginLeft: idx === 0 ? 0 : -12, zIndex: 10 - idx }
                                            ]}
                                        >
                                            <View style={[styles.avatarCircle, isHost && styles.hostAvatarCircle]}>
                                                <Text style={[styles.avatarText, isHost && styles.hostAvatarText]}>
                                                    {p.profile?.display_name?.charAt(0).toUpperCase() || "?"}
                                                </Text>
                                            </View>
                                            {isHost && (
                                                <View style={styles.hostCrown}>
                                                    <Ionicons name="sparkles" size={8} color={COLORS.white} />
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}
                                {participants.length > 5 && (
                                    <View style={[styles.stackedAvatar, { marginLeft: -12, zIndex: 0 }]}>
                                        <View style={styles.moreAvatar}>
                                            <Text style={styles.moreText}>+{participants.length - 5}</Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                            <View style={styles.guestInfo}>
                                <Text style={styles.guestCountText}>
                                    <Text style={styles.highlightText}>{participants.length}명</Text>의 메이트와 함께
                                </Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Main Action / Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconBox, { backgroundColor: COLORS.primaryLight }]}>
                            <Ionicons name="calendar" size={18} color={COLORS.primary} />
                        </View>
                        <View style={styles.statTexts}>
                            <Text style={styles.statLabel}>개설일</Text>
                            <Text style={styles.statValue}>
                                {new Date(room?.created_at || '').toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.statIconBox, { backgroundColor: '#FFF9E5' }]}>
                            <Ionicons name="ribbon" size={18} color="#FFCC00" />
                        </View>
                        <View style={styles.statTexts}>
                            <Text style={styles.statLabel}>스터디 마스터</Text>
                            <Text style={styles.statValue} numberOfLines={1}>{host?.profile?.display_name || "방장"}</Text>
                        </View>
                    </View>
                </View>

                {/* Live Member Status Section */}
                <View style={styles.liveSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>메이트 현황</Text>
                        <View style={styles.liveIndicator}>
                            <View style={styles.liveIndicatorDot} />
                            <Text style={styles.liveIndicatorText}>LIVE</Text>
                        </View>
                    </View>
                    <View style={styles.liveList}>
                        {participants.length === 0 ? (
                            <View style={styles.emptyLive}>
                                <Text style={styles.emptyLiveText}>참여 중인 메이트가 없습니다.</Text>
                            </View>
                        ) : (
                            participants.map((p) => (
                                <View key={p.user_id} style={styles.liveRow}>
                                    <View style={styles.liveAvatarBox}>
                                        <Text style={styles.liveAvatarText}>{p.profile?.display_name?.charAt(0).toUpperCase() || '?'}</Text>
                                    </View>
                                    <View style={styles.liveInfo}>
                                        <Text style={styles.liveName}>{p.profile?.display_name}</Text>
                                        <Text style={styles.liveAction}>준비 중</Text>
                                    </View>
                                    <View style={styles.liveBadge}>
                                        <Text style={styles.liveBadgeText}>IDLE</Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                </View>

                <View style={styles.noticeSection}>
                    <LinearGradient
                        colors={[COLORS.white, '#FDFDFD']}
                        style={styles.noticeCard}
                    >
                        <View style={styles.noticeHeader}>
                            <View style={styles.noticeIconBox}>
                                <Ionicons name="megaphone" size={14} color={COLORS.white} />
                            </View>
                            <Text style={styles.noticeTitle}>공지사항</Text>
                        </View>
                        <View style={styles.noticeList}>
                            <View style={styles.noticeRow}>
                                <View style={styles.noticeDot} />
                                <Text style={styles.noticeText}>이곳에서 모의고사 경쟁에 참여할 수 있습니다.</Text>
                            </View>
                            <View style={styles.noticeRow}>
                                <View style={styles.noticeDot} />
                                <Text style={styles.noticeText}>Race 탭에서 멤버들이 등록한 시험을 확인하세요.</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Footer Controls */}
                <View style={styles.footerControls}>
                    <Pressable onPress={handleShare} style={({ pressed }) => [
                        styles.invitationBtn,
                        pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 }
                    ]}>
                        <LinearGradient
                            colors={[COLORS.primary, '#00C88C']}
                            style={styles.invitationGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Ionicons name="share-social" size={20} color={COLORS.white} />
                            <Text style={styles.invitationText}>친구 초대하기</Text>
                        </LinearGradient>
                    </Pressable>

                    {isMember && userId !== room?.owner_id && (
                        <Pressable onPress={handleLeaveRoom} style={styles.exitBtn}>
                            <Ionicons name="log-out-outline" size={16} color={COLORS.textMuted} />
                            <Text style={styles.exitText}>스터디 룸 퇴장</Text>
                        </Pressable>
                    )}
                </View>

                {/* Join Overlay (Conditional) */}
                {!isMember && (
                    <View style={styles.joinOverlay}>
                        <View style={styles.joinCard}>
                            <View style={styles.joinHeaderIcon}>
                                <Ionicons name="sparkles" size={32} color={COLORS.primary} />
                            </View>
                            <Text style={styles.joinMainTitle}>새로운 스터디 공간</Text>
                            <Text style={styles.joinSubTitle}>
                                "{room?.name}" 룸에서 친구들과 함께 실전 감각을 키워보세요.
                            </Text>
                            <Pressable onPress={handleJoinRoom} style={styles.joinBtn}>
                                <Text style={styles.joinBtnText}>시작하기</Text>
                            </Pressable>
                            <Pressable onPress={() => router.replace('/(tabs)/rooms')} style={styles.joinLater}>
                                <Text style={styles.joinLaterText}>나중에 둘러보기</Text>
                            </Pressable>
                        </View>
                    </View>
                )}
            </ScrollView>

            {error && (
                <View style={styles.toast}>
                    <Ionicons name="alert-circle" size={18} color={COLORS.error} />
                    <Text style={styles.toastText}>{error}</Text>
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
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    scrollContent: {
        paddingBottom: 80,
    },
    heroSection: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
    },
    heroContent: {
        borderRadius: 36,
        padding: 32,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.25,
        shadowRadius: 25,
        elevation: 12,
    },
    heroHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    heroLabelBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    heroLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: 1.5,
    },
    heroBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0, 208, 148, 0.12)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 208, 148, 0.3)',
    },
    pulseDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 5,
    },
    heroBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        color: COLORS.primary,
        letterSpacing: 0.5,
    },
    titleContainer: {
        marginBottom: 32,
    },
    roomNameLarge: {
        fontSize: 32,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: -1,
        marginBottom: 10,
    },
    tagRow: {
        flexDirection: 'row',
        gap: 8,
    },
    tagText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
        fontWeight: '700',
    },
    participantOverview: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.03)',
    },
    avatarStack: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stackedAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2.5,
        borderColor: '#222',
        overflow: 'hidden',
    },
    avatarCircle: {
        width: '100%',
        height: '100%',
        backgroundColor: '#444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    hostAvatarCircle: {
        backgroundColor: COLORS.primary,
    },
    avatarText: {
        fontSize: 15,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.6)',
    },
    hostAvatarText: {
        color: COLORS.white,
    },
    hostCrown: {
        position: 'absolute',
        top: -1,
        right: -1,
        backgroundColor: '#FFCC00',
        width: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#222',
    },
    moreAvatar: {
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    moreText: {
        fontSize: 12,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.5)',
    },
    guestInfo: {
        alignItems: 'flex-end',
    },
    guestCountText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.3)',
        fontWeight: '600',
    },
    highlightText: {
        color: COLORS.primary,
        fontWeight: '900',
    },
    statsGrid: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: 18,
        borderRadius: 28,
        gap: 14,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
    },
    statIconBox: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statTexts: {
        flex: 1,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textMuted,
        marginBottom: 2,
    },
    statValue: {
        fontSize: 15,
        fontWeight: '900',
        color: COLORS.text,
        letterSpacing: -0.5,
    },
    liveSection: {
        paddingHorizontal: 20,
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: COLORS.text,
        letterSpacing: -0.5,
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFE5E5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    liveIndicatorDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.error,
    },
    liveIndicatorText: {
        fontSize: 10,
        fontWeight: '900',
        color: COLORS.error,
    },
    liveList: {
        backgroundColor: COLORS.white,
        borderRadius: 32,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 10,
    },
    liveRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 20,
        backgroundColor: '#F9F9FB',
        marginBottom: 8,
    },
    liveAvatarBox: {
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: '#EEE',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    liveAvatarText: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.textMuted,
    },
    liveInfo: {
        flex: 1,
    },
    liveName: {
        fontSize: 15,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 2,
    },
    liveAction: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    liveBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        backgroundColor: '#EEEEF2',
    },
    liveBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: COLORS.textMuted,
    },
    emptyLive: {
        padding: 32,
        alignItems: 'center',
    },
    emptyLiveText: {
        fontSize: 14,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    noticeSection: {
        paddingHorizontal: 20,
        marginBottom: 40,
    },
    noticeCard: {
        borderRadius: 32,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.02,
        shadowRadius: 15,
    },
    noticeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    noticeIconBox: {
        width: 28,
        height: 28,
        borderRadius: 10,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noticeTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: COLORS.text,
        letterSpacing: -0.5,
    },
    noticeList: {
        gap: 12,
    },
    noticeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    noticeDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: COLORS.border,
    },
    noticeText: {
        fontSize: 13,
        color: COLORS.textMuted,
        fontWeight: '600',
        lineHeight: 18,
    },
    footerControls: {
        paddingHorizontal: 20,
        gap: 16,
        alignItems: 'center',
    },
    invitationBtn: {
        width: '100%',
        borderRadius: 28,
        overflow: 'hidden',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 8,
    },
    invitationGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        gap: 10,
    },
    invitationText: {
        fontSize: 18,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: -0.3,
    },
    exitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 10,
    },
    exitText: {
        fontSize: 14,
        color: COLORS.textMuted,
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
    joinOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
        zIndex: 2000,
        padding: 24,
        justifyContent: 'center',
    },
    joinCard: {
        backgroundColor: COLORS.white,
        borderRadius: 44,
        padding: 40,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 25 },
        shadowOpacity: 0.35,
        shadowRadius: 45,
        elevation: 20,
    },
    joinHeaderIcon: {
        width: 80,
        height: 80,
        borderRadius: 32,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 28,
    },
    joinMainTitle: {
        fontSize: 26,
        fontWeight: '900',
        color: COLORS.text,
        marginBottom: 14,
        letterSpacing: -0.8,
    },
    joinSubTitle: {
        fontSize: 15,
        color: COLORS.textMuted,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 36,
        fontWeight: '500',
    },
    joinBtn: {
        backgroundColor: COLORS.primary,
        width: '100%',
        paddingVertical: 20,
        borderRadius: 24,
        alignItems: 'center',
        marginBottom: 14,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
    },
    joinBtnText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: '900',
    },
    joinLater: {
        paddingVertical: 12,
    },
    joinLaterText: {
        color: COLORS.textMuted,
        fontSize: 15,
        fontWeight: '600',
    },
    toast: {
        position: 'absolute',
        bottom: 32,
        left: 20,
        right: 20,
        padding: 18,
        backgroundColor: '#FFE5E5',
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,0,0,0.15)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
    },
    toastText: {
        color: COLORS.error,
        fontSize: 13,
        fontWeight: '700',
        flex: 1,
    },
});


