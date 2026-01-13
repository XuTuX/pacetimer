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
    const [copied, setCopied] = useState(false);

    const loadData = useCallback(async () => {
        if (!roomId || roomId === 'undefined') return;
        setLoading(true);
        try {
            const [roomRes, membersRes] = await Promise.all([
                supabase.from("rooms").select("*").eq("id", roomId).single(),
                supabase.from("room_members").select(`*, profile:profiles(*)`).eq("room_id", roomId)
            ]);
            if (roomRes.error) throw roomRes.error;
            if (membersRes.error) throw membersRes.error;

            setRoom(roomRes.data);
            setParticipants((membersRes.data as any) ?? []);
        } catch (err: any) {
            setError(formatSupabaseError(err));
        } finally {
            setLoading(false);
        }
    }, [roomId, supabase]);

    useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

    const isMember = useMemo(() => participants.some(p => p.user_id === userId), [participants, userId]);
    const shortCode = useMemo(() => room?.id?.substring(0, 6).toUpperCase(), [room?.id]);

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
                <View style={styles.codeCard}>
                    <View style={styles.codeHeader}>
                        <View style={styles.codeLabelRow}>
                            <View style={styles.codeDot} />
                            <Typography.Caption color={COLORS.textMuted}>참여 코드</Typography.Caption>
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
                                size={16}
                                color={copied ? COLORS.white : COLORS.primary}
                            />
                        </View>
                    </TouchableOpacity>

                    {copied && (
                        <Typography.Caption color={COLORS.primary} style={styles.copiedText}>
                            복사됨!
                        </Typography.Caption>
                    )}
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Ionicons name="people" size={18} color={COLORS.primary} />
                        <Typography.H3 bold color={COLORS.text}>{participants.length}</Typography.H3>
                        <Typography.Caption color={COLORS.textMuted}>참여자</Typography.Caption>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="document-text" size={18} color={COLORS.warning} />
                        <Typography.H3 bold color={COLORS.text}>-</Typography.H3>
                        <Typography.Caption color={COLORS.textMuted}>시험</Typography.Caption>
                    </View>
                </View>

                {/* Members Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Typography.Subtitle2 bold>멤버</Typography.Subtitle2>
                    </View>

                    <View style={styles.memberGrid}>
                        {sortedParticipants.map((p, index) => {
                            const isOwner = p.user_id === room?.owner_id;
                            const initial = (p.profile?.display_name || '?').charAt(0).toUpperCase();

                            return (
                                <View key={p.user_id} style={styles.memberCard}>
                                    <View style={styles.avatarContainer}>
                                        <LinearGradient
                                            colors={isOwner ? ['#00D094', '#00B380'] : [COLORS.surfaceVariant, COLORS.surfaceVariant]}
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
                                        color={isOwner ? COLORS.primary : COLORS.text}
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
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: SPACING.xl,
        alignItems: 'center',
        marginBottom: SPACING.lg,
        ...SHADOWS.small,
    },
    codeHeader: {
        width: '100%',
        marginBottom: SPACING.md,
    },
    codeLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    codeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.primary,
    },
    codeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    codeText: {
        fontSize: 28,
        fontWeight: '800',
        color: COLORS.text,
        letterSpacing: 4,
    },
    copyBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    copyBtnSuccess: {
        backgroundColor: COLORS.primary,
    },
    copiedText: {
        marginTop: SPACING.sm,
    },
    statsRow: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginBottom: SPACING.xl,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        alignItems: 'center',
        gap: 4,
        ...SHADOWS.small,
    },
    section: {
        flex: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: SPACING.md,
    },
    memberGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.md,
    },
    memberCard: {
        alignItems: 'center',
        width: 72,
        gap: 6,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatarGradient: {
        width: 52,
        height: 52,
        borderRadius: 16,
        padding: 2,
    },
    avatarInner: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    avatarTextOwner: {
        color: COLORS.primary,
    },
    crownBadge: {
        position: 'absolute',
        top: -6,
        right: -4,
    },
    crownEmoji: {
        fontSize: 14,
    },
    memberName: {
        textAlign: 'center',
        width: '100%',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: SPACING.xl,
        paddingBottom: 40,
        backgroundColor: COLORS.bg,
    },
    footerBtn: {
        borderRadius: RADIUS.lg,
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