import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useGlobalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Clipboard, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button } from "../../../../components/ui/Button";
import { ScreenHeader } from "../../../../components/ui/ScreenHeader";
import { Typography } from "../../../../components/ui/Typography";
import type { Database } from "../../../../lib/db-types";
import { useSupabase } from "../../../../lib/supabase";
import { formatSupabaseError } from "../../../../lib/supabaseError";
import { COLORS, RADIUS, SPACING } from "../../../../lib/theme";

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
                {/* Code Section */}
                <View style={styles.codeSection}>
                    <Typography.Caption color={COLORS.textMuted} style={{ marginBottom: 6 }}>
                        참여 코드
                    </Typography.Caption>
                    <TouchableOpacity
                        activeOpacity={0.7}
                        style={styles.codeBox}
                        onPress={() => shortCode && Clipboard.setString(shortCode)}
                    >
                        <Text style={styles.codeText}>{shortCode}</Text>
                        <View style={styles.copyHint}>
                            <Ionicons name="copy-outline" size={14} color={COLORS.primary} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Members Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Typography.Subtitle2 bold>참여자</Typography.Subtitle2>
                        <View style={styles.countBadge}>
                            <Typography.Caption color={COLORS.textMuted} bold>
                                {participants.length}
                            </Typography.Caption>
                        </View>
                    </View>

                    <View style={styles.memberList}>
                        {participants.map((p) => {
                            const isOwner = p.user_id === room?.owner_id;
                            return (
                                <View key={p.user_id} style={styles.memberItem}>
                                    <View style={[styles.avatar, isOwner && styles.avatarOwner]}>
                                        <Text style={styles.avatarText}>
                                            {(p.profile?.display_name || '?').charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <Typography.Body2
                                        numberOfLines={1}
                                        color={isOwner ? COLORS.primary : COLORS.text}
                                        bold={isOwner}
                                        style={styles.memberName}
                                    >
                                        {p.profile?.display_name || '익명'}
                                    </Typography.Body2>
                                    {isOwner && (
                                        <View style={styles.ownerBadge}>
                                            <Ionicons name="star" size={10} color={COLORS.warning} />
                                        </View>
                                    )}
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
        paddingBottom: 100,
    },
    codeSection: {
        alignItems: 'center',
        marginBottom: SPACING.xxl,
    },
    codeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: RADIUS.lg,
        gap: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    codeText: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.text,
        letterSpacing: 3,
    },
    copyHint: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
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
    countBadge: {
        backgroundColor: COLORS.surfaceVariant,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: RADIUS.full,
    },
    memberList: {
        gap: SPACING.sm,
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        borderRadius: RADIUS.lg,
        gap: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: COLORS.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarOwner: {
        backgroundColor: COLORS.primaryLight,
    },
    avatarText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text,
    },
    memberName: {
        flex: 1,
    },
    ownerBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: COLORS.warningLight,
        alignItems: 'center',
        justifyContent: 'center',
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