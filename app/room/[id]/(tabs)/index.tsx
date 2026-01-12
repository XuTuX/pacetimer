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
                message: `[Pacetime] "${room.name}" 스터디 룸 초대\n참여 코드: ${shortCode}\n링크: https://pacetime.app/room/${room.id}`,
            });
        } catch (error) { /* ignore */ }
    };

    if (loading && !room) {
        return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;
    }

    return (
        <View style={styles.container}>
            <ScreenHeader
                title={room?.name || "룸 상세"}
                showBack={false}
                rightElement={
                    <TouchableOpacity
                        onPress={() => router.replace('/(tabs)/rooms')}
                        style={styles.closeBtn}
                    >
                        <Ionicons name="close" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                }
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* 1. 참여 코드 섹션 */}
                <View style={styles.codeContainer}>
                    <Typography.Label color={COLORS.textMuted} bold style={{ marginBottom: 8 }}>참여 코드</Typography.Label>
                    <TouchableOpacity
                        activeOpacity={0.7}
                        style={styles.codeBox}
                        onPress={() => {
                            if (shortCode) Clipboard.setString(shortCode);
                        }}
                    >
                        <Text style={styles.codeText}>{shortCode}</Text>
                        <View style={styles.copyBadge}>
                            <Ionicons name="copy" size={12} color={COLORS.primary} />
                            <Typography.Caption color={COLORS.primary} bold>복사</Typography.Caption>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* 2. 멤버 그리드 섹션 */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Typography.Subtitle1 bold>참여자</Typography.Subtitle1>
                        <View style={styles.countBadge}>
                            <Typography.Caption color={COLORS.white} bold>{participants.length}</Typography.Caption>
                        </View>
                    </View>

                    <View style={styles.memberGrid}>
                        {participants.map((p) => {
                            const isOwner = p.user_id === room?.owner_id;
                            return (
                                <View key={p.user_id} style={styles.memberCard}>
                                    <View style={[styles.avatarWrapper, isOwner && styles.ownerAvatarWrapper]}>
                                        {/* 글자 대신 사람 이모티콘 사용 */}
                                        <Text style={styles.avatarEmoji}>👤</Text>
                                        {isOwner && (
                                            <View style={styles.crownIcon}>
                                                <Ionicons name="ribbon" size={10} color={COLORS.white} />
                                            </View>
                                        )}
                                    </View>
                                    <Typography.Caption
                                        numberOfLines={1}
                                        style={styles.memberName}
                                        color={isOwner ? COLORS.primary : COLORS.text}
                                        bold={isOwner}
                                    >
                                        {p.profile?.display_name}
                                    </Typography.Caption>
                                </View>
                            );
                        })}
                    </View>
                </View>
            </ScrollView>

            {/* 3. 하단 액션 버튼 */}
            <View style={styles.footer}>
                {!isMember ? (
                    <Button
                        label="이 룸에 참여하기"
                        onPress={handleJoinRoom}
                        size="lg"
                        variant="primary"
                        style={styles.mainBtn}
                    />
                ) : (
                    <Button
                        label="친구 초대하기"
                        onPress={handleShare}
                        icon="share-social-outline"
                        size="lg"
                        variant="primary"
                        style={styles.mainBtn}
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
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: COLORS.surfaceVariant,
    },
    scrollContent: {
        padding: SPACING.xl,
    },
    codeContainer: {
        alignItems: 'center',
        marginBottom: 40,
        marginTop: SPACING.md,
    },
    codeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: RADIUS.xl,
        gap: 12,
    },
    codeText: {
        fontSize: 26,
        fontWeight: '800',
        color: COLORS.text,
        letterSpacing: 4,
    },
    copyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.white,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: RADIUS.full,
        ...SHADOWS.small,
    },
    section: {
        flex: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 24,
    },
    countBadge: {
        backgroundColor: COLORS.text,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    memberGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    memberCard: {
        width: '21%',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatarWrapper: {
        width: 52,
        height: 52,
        borderRadius: 20,
        backgroundColor: COLORS.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    ownerAvatarWrapper: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryLight,
    },
    avatarEmoji: {
        fontSize: 24,
    },
    crownIcon: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: COLORS.primary,
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: COLORS.bg,
    },
    memberName: {
        textAlign: 'center',
        width: '100%',
    },
    footer: {
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.md,
        paddingBottom: 40,
    },
    mainBtn: {
        borderRadius: RADIUS.xl,
        height: 56,
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