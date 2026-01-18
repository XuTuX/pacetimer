import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useGlobalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Clipboard, Platform, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button } from "../../../../components/ui/Button";
import { ResponsiveContainer, useBreakpoint } from "../../../../components/ui/Layout";
import { ScreenHeader } from "../../../../components/ui/ScreenHeader";
import { Typography } from "../../../../components/ui/Typography";
import type { Database } from "../../../../lib/db-types";
import { useSupabase } from "../../../../lib/supabase";
import { formatSupabaseError } from "../../../../lib/supabaseError";
import { COLORS, RADIUS, SHADOWS, SPACING } from "../../../../lib/theme";

type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type RoomSubjectRow = Database["public"]["Tables"]["room_subjects"]["Row"];

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
    const { isAtLeastTablet } = useBreakpoint();
    const { id } = useGlobalSearchParams<{ id: string }>();

    const roomId = Array.isArray(id) ? id[0] : id;

    const [room, setRoom] = useState<RoomRow | null>(null);
    const [participants, setParticipants] = useState<ParticipantWithData[]>([]);
    const [roomSubjects, setRoomSubjects] = useState<RoomSubjectRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const loadData = useCallback(async () => {
        if (!roomId || roomId === 'undefined') return;
        setLoading(true);
        try {
            const [roomRes, membersRes, subjectsRes] = await Promise.all([
                supabase.from("rooms").select("*").eq("id", roomId).single(),
                supabase.from("room_members").select(`*, profile:profiles(*)`).eq("room_id", roomId),
                supabase
                    .from("room_subjects")
                    .select("*")
                    .eq("room_id", roomId)
                    .eq("is_archived", false)
                    .order("created_at", { ascending: true })
            ]);
            if (roomRes.error) throw roomRes.error;
            if (membersRes.error) throw membersRes.error;

            setRoom(roomRes.data);
            setParticipants((membersRes.data as any) ?? []);
            setRoomSubjects(subjectsRes.error ? [] : (subjectsRes.data ?? []));
        } catch (err: any) {
            setError(formatSupabaseError(err));
        } finally {
            setLoading(false);
        }
    }, [roomId, supabase]);

    useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

    const isMember = useMemo(() => participants.some(p => p.user_id === userId), [participants, userId]);
    const shortCode = useMemo(() => room?.id?.substring(0, 6).toUpperCase(), [room?.id]);
    const visibleSubjects = useMemo(
        () => roomSubjects.filter((subject) => !subject.is_archived),
        [roomSubjects]
    );

    const handleJoinRoom = async () => {
        if (!roomId || !userId) return;
        setLoading(true);
        try {
            const { error } = await supabase.from("room_members").insert({ room_id: roomId, user_id: userId, role: "MEMBER" });
            if (error) throw error;
            await loadData();
        } catch (err) {
            setError(formatSupabaseError(err));
        } finally {
            setLoading(false);
        }
    };

    const handleCopyCode = () => {
        if (!shortCode) return;
        Clipboard.setString(shortCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = async () => {
        if (!room) return;
        try {
            await Share.share({
                message: `[11:57] "${room.name}" 스터디 초대\n참여 코드: ${shortCode}\n링크: https://pacetime.app/room/${room.id}`,
            });
        } catch (error) { /* ignore */ }
    };

    if (loading && !room) {
        return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;
    }

    const sortedParticipants = [...participants].sort((a, b) => {
        if (a.user_id === room?.owner_id) return -1;
        if (b.user_id === room?.owner_id) return 1;
        return 0;
    });

    return (
        <View style={styles.container}>
            <ScreenHeader
                title={room?.name || "스터디"}
                showBack={false}
                align="left"
                rightElement={
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                        <TouchableOpacity
                            onPress={() => router.replace('/(tabs)/rooms')}
                            style={styles.closeBtn}
                        >
                            <Ionicons name="apps-outline" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => router.push(`/room/${roomId}/settings`)}
                            style={styles.closeBtn}
                        >
                            <Ionicons name="settings-outline" size={22} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>
                }
            />

            <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
                <ResponsiveContainer maxWidth={isAtLeastTablet ? 1100 : 700} withPadding={false}>
                    <View style={styles.scrollContent}>
                        <View style={isAtLeastTablet ? styles.tabletLayout : { gap: SPACING.lg }}>
                            {/* Left Column: Info & Stats */}
                            <View style={isAtLeastTablet ? styles.tabletLeftColumn : { gap: SPACING.md }}>
                                <View style={styles.card}>
                                    <TouchableOpacity
                                        style={styles.codeBadge}
                                        onPress={handleCopyCode}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.codeLabelText}>입장코드</Text>
                                        <Text style={styles.codeValueText}>{shortCode}</Text>
                                        <Ionicons name={copied ? "checkmark-circle" : "copy-outline"} size={14} color={COLORS.primary} />
                                    </TouchableOpacity>
                                </View>

                                <View style={[styles.card, styles.statsRow]}>
                                    <View style={styles.statItem}>
                                        <Text style={styles.statValue}>{visibleSubjects.length}</Text>
                                        <Text style={styles.statLabel}>시험 과목</Text>
                                    </View>
                                    <View style={styles.statDivider} />
                                    <View style={styles.statItem}>
                                        <Text style={styles.statValue}>{participants.length}</Text>
                                        <Text style={styles.statLabel}>참여 멤버</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Right Column: Subjects & Members */}
                            <View style={isAtLeastTablet ? styles.tabletRightColumn : { gap: SPACING.lg }}>
                                <View style={[styles.card, styles.flowSection]}>
                                    <View style={styles.flowHeader}>
                                        <Ionicons name="book-outline" size={18} color={COLORS.textMuted} />
                                        <Text style={styles.flowTitle}>진행 중인 과목</Text>
                                    </View>
                                    <View style={styles.subjectGrid}>
                                        {visibleSubjects.length > 0 ? (
                                            visibleSubjects.map((s) => (
                                                <View key={s.id} style={styles.minimalChip}>
                                                    <Text style={styles.minimalChipText}>{s.name}</Text>
                                                </View>
                                            ))
                                        ) : (
                                            <Text style={styles.emptyText}>등록된 과목이 없습니다.</Text>
                                        )}
                                    </View>
                                </View>

                                <View style={[styles.card, styles.flowSection, { marginBottom: 0 }]}>
                                    <View style={styles.flowHeader}>
                                        <Ionicons name="people-outline" size={18} color={COLORS.textMuted} />
                                        <Text style={styles.flowTitle}>함께하는 멤버</Text>
                                    </View>
                                    <View style={styles.memberGrid}>
                                        {sortedParticipants.map((p) => {
                                            const isOwner = p.user_id === room?.owner_id;
                                            const initial = (p.profile?.display_name || '?').charAt(0).toUpperCase();

                                            return (
                                                <View key={p.user_id} style={[styles.memberGridItem, isAtLeastTablet && styles.memberGridItemTablet]}>
                                                    <View style={[styles.gridAvatar, isOwner && styles.ownerAvatarBorder]}>
                                                        <Text style={[styles.avatarTxt, isOwner && styles.ownerAvatarTxt]}>
                                                            {initial}
                                                        </Text>
                                                        {isOwner && (
                                                            <View style={styles.ownerGridBadge}>
                                                                <Text style={styles.ownerGridBadgeValue}>방장</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                    <Text style={styles.gridMemberName} numberOfLines={1}>
                                                        {p.profile?.display_name || '익명'}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                </ResponsiveContainer>
            </ScrollView>

            {/* Float Action Button */}
            {!isAtLeastTablet && (
                <View style={styles.fabContainer}>
                    <Button
                        label={!isMember ? "같이 공부하기" : "링크 공유하기"}
                        onPress={!isMember ? handleJoinRoom : handleShare}
                        variant="primary"
                        size="lg"
                        style={styles.fabButton}
                        icon={!isMember ? "add" : "share-social"}
                    />
                </View>
            )}

            {error && (
                <View style={styles.errorToast}>
                    <Typography.Caption color={COLORS.white}>{error}</Typography.Caption>
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
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingHorizontal: SPACING.xxl,
        paddingTop: SPACING.lg,
        // FAB가 가리지 않도록 하단 여백 충분히 확보
        paddingBottom: 150,
        // 전체적으로 요소 간 간격을 넓힘
        gap: SPACING.lg,
    },
    tabletLayout: {
        flexDirection: 'row',
        gap: SPACING.xl,
        alignItems: 'flex-start',
    },
    tabletLeftColumn: {
        flex: 1,
        gap: SPACING.md,
    },
    tabletRightColumn: {
        flex: 2,
        gap: SPACING.md,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.md,
    },
    roomNameTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: COLORS.text,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        ...SHADOWS.small,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardTablet: {
        paddingVertical: 20,
        paddingHorizontal: SPACING.xl,
        borderRadius: RADIUS.xxl,
    },
    actionCard: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        padding: 0,
    },
    actionButton: {
        height: 64,
        borderRadius: RADIUS.xl,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.lg,
    },
    codeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bg,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: RADIUS.lg,
        gap: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignSelf: 'flex-start',
    },
    codeLabelText: {
        fontSize: 10,
        fontWeight: '800',
        color: COLORS.textMuted,
        letterSpacing: 0.5,
    },
    codeValueText: {
        fontSize: 16,
        fontWeight: '900',
        color: COLORS.primary,
        fontVariant: ['tabular-nums'],
    },
    codeValueTextTablet: {
        fontSize: 20,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        gap: 2,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '900',
        color: COLORS.text,
    },
    statValueTablet: {
        fontSize: 28,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: COLORS.border,
    },
    flowSection: {
    },
    flowHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    flowTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    subjectGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    minimalChip: {
        backgroundColor: COLORS.bg,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    minimalChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    memberGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
        paddingHorizontal: 4,
    },
    memberGridItem: {
        width: '28%', // 3개씩 배치되도록 유지
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    memberGridItemTablet: {
        width: '15%',
    },

    gridAvatar: {
        width: 52,
        height: 52,
        borderRadius: 18,
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    ownerAvatarBorder: {
        borderColor: '#FFD700',
        backgroundColor: '#FFFBEB',
    },
    avatarTxt: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.textMuted,
    },
    ownerAvatarTxt: {
        color: '#B45309',
    },
    ownerGridBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: '#FFFBEB',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#FFD700',
        ...SHADOWS.small,
    },
    ownerGridBadgeValue: {
        fontSize: 9,
        fontWeight: '900',
        color: '#B45309',
    },
    gridMemberName: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.text,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.textMuted,
        paddingHorizontal: 4,
    },
    fabContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 24,
        paddingTop: 12,
        // 아이폰 Home Indicator를 고려해 하단 여백 조정
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        backgroundColor: 'rgba(255,255,255,0.0)', // 버튼 뒤 투명 유지, 필요시 그라데이션 추가 가능
    },
    fabButton: {
        height: 56,
        borderRadius: 20,
        ...SHADOWS.medium,
    },
    errorToast: {
        position: 'absolute',
        bottom: 120,
        left: 20,
        right: 20,
        backgroundColor: COLORS.error,
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
});