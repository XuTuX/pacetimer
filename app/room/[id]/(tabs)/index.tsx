import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useGlobalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { ScreenHeader } from "../../../../components/ui/ScreenHeader";
import { Section } from "../../../../components/ui/Section";
import { Typography } from "../../../../components/ui/Typography";
import type { Database } from "../../../../lib/db-types";
import { useSupabase } from "../../../../lib/supabase";
import { formatSupabaseError } from "../../../../lib/supabaseError";
import { COLORS, RADIUS, SHADOWS, SPACING } from "../../../../lib/theme";

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
                        <Button
                            variant="ghost"
                            size="sm"
                            icon="share-outline"
                            onPress={handleShare}
                            style={styles.headerBtn}
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            icon="close"
                            onPress={() => router.replace('/(tabs)/rooms')}
                            style={styles.headerBtn}
                        />
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
                                <Typography.Label style={styles.heroLabel}>LIVE SESSION</Typography.Label>
                            </View>
                            <View style={styles.heroBadge}>
                                <Animated.View style={[styles.pulseDot, { transform: [{ scale: pulseAnim }], opacity: pulseAnim.interpolate({ inputRange: [1, 1.5], outputRange: [1, 0.4] }) }]} />
                                <View style={[styles.pulseDot, { position: 'absolute', left: 12, top: 12 }]} />
                                <Typography.Label style={styles.heroBadgeText}>ACTIVE</Typography.Label>
                            </View>
                        </View>

                        <View style={styles.titleContainer}>
                            <Typography.H1 color={COLORS.white}>{room?.name}</Typography.H1>
                            <View style={styles.tagRow}>
                                <Typography.Caption color="rgba(255,255,255,0.4)" bold>#스터디</Typography.Caption>
                                <Typography.Caption color="rgba(255,255,255,0.4)" bold>#실시간</Typography.Caption>
                                <Typography.Caption color="rgba(255,255,255,0.4)" bold>#경쟁</Typography.Caption>
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
                                                <Typography.Subtitle2 color={isHost ? COLORS.white : "rgba(255,255,255,0.6)"} bold>
                                                    {p.profile?.display_name?.charAt(0).toUpperCase() || "?"}
                                                </Typography.Subtitle2>
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
                                            <Typography.Label color="rgba(255,255,255,0.5)">+{participants.length - 5}</Typography.Label>
                                        </View>
                                    </View>
                                )}
                            </View>
                            <View style={styles.guestInfo}>
                                <Typography.Caption color="rgba(255,255,255,0.3)" bold>
                                    <Typography.Caption color={COLORS.primary} bold>{participants.length}명</Typography.Caption>의 메이트와 함께
                                </Typography.Caption>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Main Action / Stats Grid */}
                <View style={styles.statsGrid}>
                    <Card variant="outlined" padding="md" style={styles.statCard}>
                        <View style={[styles.statIconBox, { backgroundColor: COLORS.primaryLight }]}>
                            <Ionicons name="calendar" size={18} color={COLORS.primary} />
                        </View>
                        <View style={styles.statTexts}>
                            <Typography.Label color={COLORS.textMuted}>개설일</Typography.Label>
                            <Typography.Subtitle2 bold>
                                {new Date(room?.created_at || '').toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                            </Typography.Subtitle2>
                        </View>
                    </Card>

                    <Card variant="outlined" padding="md" style={styles.statCard}>
                        <View style={[styles.statIconBox, { backgroundColor: COLORS.warningLight }]}>
                            <Ionicons name="ribbon" size={18} color={COLORS.warning} />
                        </View>
                        <View style={styles.statTexts}>
                            <Typography.Label color={COLORS.textMuted}>스터디 마스터</Typography.Label>
                            <Typography.Subtitle2 bold numberOfLines={1}>{host?.profile?.display_name || "방장"}</Typography.Subtitle2>
                        </View>
                    </Card>
                </View>

                {/* Live Member Status Section */}
                <Section
                    title="메이트 현황"
                    rightElement={
                        <View style={styles.liveIndicator}>
                            <View style={styles.liveIndicatorDot} />
                            <Typography.Label color={COLORS.error}>LIVE</Typography.Label>
                        </View>
                    }
                >
                    <Card padding="sm" style={styles.liveListContainer}>
                        {participants.length === 0 ? (
                            <View style={styles.emptyLive}>
                                <Typography.Body2 color={COLORS.textMuted} bold>참여 중인 메이트가 없습니다.</Typography.Body2>
                            </View>
                        ) : (
                            participants.map((p) => (
                                <View key={p.user_id} style={styles.liveRow}>
                                    <View style={styles.liveAvatarBox}>
                                        <Typography.Subtitle2 bold color={COLORS.textMuted}>{p.profile?.display_name?.charAt(0).toUpperCase() || '?'}</Typography.Subtitle2>
                                    </View>
                                    <View style={styles.liveInfo}>
                                        <Typography.Body1 bold>{p.profile?.display_name}</Typography.Body1>
                                        <Typography.Caption>준비 중</Typography.Caption>
                                    </View>
                                    <View style={styles.liveBadge}>
                                        <Typography.Label color={COLORS.textMuted}>IDLE</Typography.Label>
                                    </View>
                                </View>
                            ))
                        )}
                    </Card>
                </Section>

                <Section>
                    <LinearGradient
                        colors={[COLORS.white, '#FDFDFD']}
                        style={styles.noticeCard}
                    >
                        <View style={styles.noticeHeader}>
                            <View style={styles.noticeIconBox}>
                                <Ionicons name="megaphone" size={14} color={COLORS.white} />
                            </View>
                            <Typography.Subtitle2 bold>공지사항</Typography.Subtitle2>
                        </View>
                        <View style={styles.noticeList}>
                            <View style={styles.noticeRow}>
                                <View style={styles.noticeDot} />
                                <Typography.Body2 color={COLORS.textMuted} bold>이곳에서 모의고사 경쟁에 참여할 수 있습니다.</Typography.Body2>
                            </View>
                            <View style={styles.noticeRow}>
                                <View style={styles.noticeDot} />
                                <Typography.Body2 color={COLORS.textMuted} bold>Race 탭에서 멤버들이 등록한 시험을 확인하세요.</Typography.Body2>
                            </View>
                        </View>
                    </LinearGradient>
                </Section>

                {/* Footer Controls */}
                <View style={styles.footerControls}>
                    <Button
                        label="친구 초대하기"
                        onPress={handleShare}
                        icon="share-social"
                        variant="primary"
                        size="lg"
                    />

                    {isMember && userId !== room?.owner_id && (
                        <Button
                            label="스터디 룸 퇴장"
                            onPress={handleLeaveRoom}
                            icon="log-out-outline"
                            variant="ghost"
                            size="sm"
                        />
                    )}
                </View>

                {/* Join Overlay (Conditional) */}
                {!isMember && (
                    <View style={styles.joinOverlay}>
                        <Card padding="massive" radius="xxl" style={styles.joinCard}>
                            <View style={styles.joinHeaderIcon}>
                                <Ionicons name="sparkles" size={32} color={COLORS.primary} />
                            </View>
                            <Typography.H2 align="center" style={styles.joinMainTitle}>새로운 스터디 공간</Typography.H2>
                            <Typography.Body1 align="center" color={COLORS.textMuted} style={styles.joinSubTitle}>
                                "{room?.name}" 룸에서 친구들과 함께 실전 감각을 키워보세요.
                            </Typography.Body1>

                            <Button
                                label="시작하기"
                                onPress={handleJoinRoom}
                                size="lg"
                                style={styles.joinActionBtn}
                            />

                            <Button
                                label="나중에 둘러보기"
                                variant="ghost"
                                onPress={() => router.replace('/(tabs)/rooms')}
                                style={styles.joinLater}
                            />
                        </Card>
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
        gap: SPACING.sm,
    },
    headerBtn: {
        backgroundColor: COLORS.surfaceVariant,
        borderRadius: RADIUS.full,
    },
    scrollContent: {
        paddingBottom: 80,
    },
    heroSection: {
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.lg,
        paddingBottom: SPACING.xxl,
    },
    heroContent: {
        borderRadius: 36,
        padding: SPACING.massive,
        ...SHADOWS.heavy,
    },
    heroHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xxl,
    },
    heroLabelBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: SPACING.md,
        paddingVertical: 6,
        borderRadius: 12,
    },
    heroLabel: {
        color: 'rgba(255,255,255,0.7)',
    },
    heroBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0, 208, 148, 0.12)',
        paddingHorizontal: SPACING.md,
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
        ...SHADOWS.small,
        shadowColor: COLORS.primary,
        shadowOpacity: 0.8,
    },
    heroBadgeText: {
        color: COLORS.primary,
    },
    titleContainer: {
        marginBottom: SPACING.huge,
    },
    tagRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginTop: SPACING.sm,
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
    hostCrown: {
        position: 'absolute',
        top: -1,
        right: -1,
        backgroundColor: COLORS.warning,
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
    guestInfo: {
        alignItems: 'flex-end',
    },
    statsGrid: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.xl,
        gap: SPACING.md,
        marginBottom: SPACING.xxl,
    },
    statCard: {
        flex: 1,
    },
    statIconBox: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.sm,
    },
    statTexts: {
        flex: 1,
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: COLORS.errorLight,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: 8,
    },
    liveIndicatorDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.error,
    },
    liveListContainer: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
    },
    liveRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        borderRadius: 20,
        backgroundColor: COLORS.surfaceVariant,
        marginBottom: SPACING.sm,
    },
    liveAvatarBox: {
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: COLORS.borderDark,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    liveInfo: {
        flex: 1,
    },
    liveBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        backgroundColor: COLORS.border,
    },
    emptyLive: {
        padding: SPACING.huge,
        alignItems: 'center',
    },
    noticeCard: {
        borderRadius: 32,
        padding: SPACING.xxl,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
        ...SHADOWS.small,
    },
    noticeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: SPACING.lg,
    },
    noticeIconBox: {
        width: 28,
        height: 28,
        borderRadius: 10,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noticeList: {
        gap: SPACING.md,
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
    footerControls: {
        paddingHorizontal: SPACING.xl,
        gap: SPACING.lg,
        alignItems: 'center',
    },
    joinOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
        zIndex: 2000,
        padding: SPACING.xxl,
        justifyContent: 'center',
    },
    joinCard: {
        alignItems: 'center',
        ...SHADOWS.heavy,
    },
    joinHeaderIcon: {
        width: 80,
        height: 80,
        borderRadius: 32,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.huge,
    },
    joinMainTitle: {
        marginBottom: SPACING.md,
    },
    joinSubTitle: {
        lineHeight: 22,
        marginBottom: SPACING.huge,
    },
    joinActionBtn: {
        marginBottom: SPACING.md,
    },
    joinLater: {
        paddingVertical: SPACING.sm,
    },
    toast: {
        position: 'absolute',
        bottom: 32,
        left: 20,
        right: 20,
        padding: 18,
        backgroundColor: COLORS.errorLight,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,0,0,0.15)',
        ...SHADOWS.medium,
    },
    toastText: {
        color: COLORS.error,
        flex: 1,
    },
});


