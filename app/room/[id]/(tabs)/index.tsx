import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useGlobalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Clipboard, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button } from "../../../../components/ui/Button";
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
                message: `[Pacetime] "${room.name}" 스터디 초대\n참여 코드: ${shortCode}\n링크: https://pacetime.app/room/${room.id}`,
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
                rightElement={
                    <TouchableOpacity
                        onPress={() => router.replace('/(tabs)/rooms')}
                        style={styles.closeBtn}
                    >
                        <Ionicons name="close" size={22} color={COLORS.text} />
                    </TouchableOpacity>
                }
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Hero Code Section */}
                <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.codeCard}
                >
                    <View style={styles.codeHeader}>
                        <View style={styles.codeLabelRow}>
                            <View style={styles.codeDot} />
                            <Text style={styles.codeLabel}>참여 코드</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        activeOpacity={0.8}
                        style={styles.codeBox}
                        onPress={handleCopyCode}
                    >
                        <Text style={styles.codeText}>{shortCode}</Text>
                        <View style={[styles.copyBtn, copied && styles.copyBtnSuccess]}>
                            <Ionicons
                                name={copied ? "checkmark" : "copy-outline"}
                                size={18}
                                color={copied ? COLORS.primary : COLORS.white}
                            />
                        </View>
                    </TouchableOpacity>
                </LinearGradient>

                {/* Subjects */}
                <View style={styles.subjectCard}>
                    <View style={styles.subjectHeader}>
                        <Typography.Subtitle1 bold>시험 과목</Typography.Subtitle1>
                        <View style={styles.memberCountBadge}>
                            <Typography.Caption bold color={COLORS.primary}>{visibleSubjects.length}과목</Typography.Caption>
                        </View>
                    </View>

                    {visibleSubjects.length > 0 ? (
                        <View style={styles.subjectChips}>
                            {visibleSubjects.map((subject) => (
                                <View key={subject.id} style={styles.subjectChip}>
                                    <Text style={styles.subjectChipText}>{subject.name}</Text>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.subjectEmpty}>
                            <Typography.Caption color={COLORS.textMuted}>등록된 과목이 없어요</Typography.Caption>
                        </View>
                    )}
                </View>

                {/* Members Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Typography.Subtitle1 bold>멤버</Typography.Subtitle1>
                        <View style={styles.memberCountBadge}>
                            <Typography.Caption bold color={COLORS.primary}>{participants.length}명</Typography.Caption>
                        </View>
                    </View>

                    <View style={styles.memberGrid}>
                        {sortedParticipants.map((p, index) => {
                            const isOwner = p.user_id === room?.owner_id;
                            const initial = (p.profile?.display_name || '?').charAt(0).toUpperCase();

                            return (
                                <View key={p.user_id} style={styles.memberCard}>
                                    <View style={styles.avatarContainer}>
                                        <LinearGradient
                                            colors={isOwner ? ['#FFD700', '#FFA500'] : [COLORS.surfaceVariant, COLORS.border]}
                                            style={styles.avatarGradient}
                                        >
                                            <View style={styles.avatarInner}>
                                                <Text style={[styles.avatarText, isOwner && styles.avatarTextOwner]}>
                                                    {initial}
                                                </Text>
                                            </View>
                                        </LinearGradient>
                                        {isOwner && (
                                            <View style={styles.crownBadge}>
                                                <Text style={styles.crownEmoji}>👑</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Typography.Caption
                                        numberOfLines={1}
                                        color={isOwner ? COLORS.text : COLORS.textMuted}
                                        bold={isOwner}
                                        style={styles.memberName}
                                    >
                                        {p.profile?.display_name || '익명'}
                                    </Typography.Caption>
                                </View>
                            );
                        })}
                    </View>
                </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                {!isMember ? (
                    <Button
                        label="이 스터디에 참여하기"
                        onPress={handleJoinRoom}
                        size="lg"
                        variant="primary"
                        style={styles.footerBtn}
                    />
                ) : (
                    <Button
                        label="친구 초대하기"
                        onPress={handleShare}
                        icon="share-social-outline"
                        size="lg"
                        variant="primary"
                        style={styles.footerBtn}
                    />
                )}
            </View>

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
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 18,
        backgroundColor: COLORS.surfaceVariant,
    },
    scrollContent: {
        padding: SPACING.xl,
        paddingBottom: 120,
    },
    codeCard: {
        borderRadius: RADIUS.xxl,
        padding: SPACING.xl,
        alignItems: 'center',
        marginBottom: SPACING.xl,
        ...SHADOWS.medium,
        minHeight: 180,
        justifyContent: 'center',
    },
    codeHeader: {
        position: 'absolute',
        top: SPACING.lg,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    codeLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    codeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#4ADE80',
    },
    codeLabel: {
        fontSize: 12,
        color: COLORS.white,
        fontWeight: '600',
    },
    codeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginTop: SPACING.md,
    },
    codeText: {
        fontSize: 36,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 4,
        fontVariant: ['tabular-nums'],
    },
    copyBtn: {
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    copyBtnSuccess: {
        backgroundColor: COLORS.white,
    },
    subjectCard: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        gap: SPACING.sm,
        marginBottom: SPACING.xxl,
        ...SHADOWS.small,
    },
    subjectHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    subjectChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    subjectChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: COLORS.surfaceVariant,
    },
    subjectChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.text,
    },
    subjectEmpty: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 4,
    },
    section: {
        flex: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.lg,
    },
    memberCountBadge: {
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    memberGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.lg,
    },
    memberCard: {
        alignItems: 'center',
        width: 72,
        gap: 8,
    },
    avatarContainer: {
        position: 'relative',
        ...SHADOWS.small,
    },
    avatarGradient: {
        width: 64,
        height: 64,
        borderRadius: 24,
        padding: 2,
    },
    avatarInner: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    avatarTextOwner: {
        color: '#D97706', // Gold-ish
    },
    crownBadge: {
        position: 'absolute',
        top: -8,
        right: -8,
        transform: [{ rotate: '15deg' }],
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.small,
    },
    crownEmoji: {
        fontSize: 14,
    },
    memberName: {
        textAlign: 'center',
        width: '100%',
        fontSize: 12,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: SPACING.xl,
        paddingBottom: 40,
        backgroundColor: 'transparent',
    },
    footerBtn: {
        borderRadius: RADIUS.xl,
        ...SHADOWS.medium,
    },
    errorToast: {
        position: 'absolute',
        bottom: 120,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        alignItems: 'center',
    }
});
