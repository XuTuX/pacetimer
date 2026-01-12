import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { RoomCard } from "../../../components/rooms/RoomCard";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { HeaderSettings } from "../../../components/ui/HeaderSettings";
import { ScreenHeader } from "../../../components/ui/ScreenHeader";
import { ThemedText } from "../../../components/ui/ThemedText";
import type { Database } from "../../../lib/db-types";
import { useSupabase } from "../../../lib/supabase";
import { formatSupabaseError } from "../../../lib/supabaseError";
import { COLORS, RADIUS, SPACING } from "../../../lib/theme";

type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];

type RoomWithDetails = RoomRow & {
    room_members: { count: number }[];
    room_exams: { created_at: string }[];
};

export default function RoomsIndexScreen() {
    const supabase = useSupabase();
    const router = useRouter();
    const { isLoaded, userId } = useAuth();

    const [rooms, setRooms] = useState<RoomWithDetails[]>([]);
    const [roomIdInput, setRoomIdInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: myParticipation, error: partError } = await supabase
                .from("room_members")
                .select("room_id")
                .eq("user_id", userId ?? "");
            if (partError) throw partError;

            const myRoomIds = myParticipation?.map(p => p.room_id) || [];
            const { data: hostedRooms, error: hostError } = await supabase
                .from("rooms")
                .select("id")
                .eq("owner_id", userId ?? "");
            if (hostError) throw hostError;

            const hostedRoomIds = hostedRooms?.map(r => r.id) || [];
            const allRoomIds = Array.from(new Set([...myRoomIds, ...hostedRoomIds]));

            if (allRoomIds.length === 0) {
                setRooms([]);
                return;
            }

            const { data: roomsData, error: roomsError } = await supabase
                .from("rooms")
                .select("*, room_members(count), room_exams(created_at)")
                .in("id", allRoomIds)
                .order("created_at", { ascending: false });
            if (roomsError) throw roomsError;

            setRooms((roomsData as any) ?? []);
        } catch (err) {
            setError(formatSupabaseError(err));
        } finally {
            setLoading(false);
            setHasLoadedOnce(true);
        }
    }, [supabase, userId]);

    React.useEffect(() => {
        if (userId) refresh();
    }, [userId]);

    const handleJoin = async () => {
        const roomId = roomIdInput.trim();
        if (!roomId || !isLoaded || !userId) return;
        setJoining(true);
        setError(null);
        try {
            const { data: roomData, error: roomMatchError } = await supabase
                .from("rooms")
                .select("id")
                .eq("id", roomId)
                .single();
            if (roomMatchError || !roomData) throw new Error("해당 ID의 룸을 찾을 수 없습니다.");

            const { error: joinError } = await supabase
                .from("room_members")
                .insert({ room_id: roomData.id, user_id: userId });
            if (joinError && !joinError.message.includes("unique")) throw joinError;

            setRoomIdInput("");
            await refresh();
            router.push(`/room/${roomData.id}`);
        } catch (err: any) {
            setError(formatSupabaseError(err));
        } finally {
            setJoining(false);
        }
    };

    const RightActions = (
        <View style={styles.headerActions}>
            <Pressable
                onPress={() => router.push("/(tabs)/rooms/create")}
                style={({ pressed }) => [styles.createBtn, pressed && { transform: [{ scale: 0.95 }] }]}
            >
                <Ionicons name="add" size={28} color={COLORS.text} />
            </Pressable>
            <HeaderSettings />
        </View>
    );

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="스터디 룸"
                rightElement={RightActions}
                showBack={false}
                align="left"
            />

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.listSection}>
                    {loading && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 20 }} />}
                    {hasLoadedOnce && rooms.length === 0 ? (
                        <Card variant="outlined" style={styles.emptyCard} padding="xl">
                            <View style={styles.emptyIconCircle}>
                                <Ionicons name="school-outline" size={32} color={COLORS.primary} />
                            </View>
                            <ThemedText variant="h3" style={styles.emptyTitle}>참여 중인 룸이 없습니다</ThemedText>
                            <ThemedText variant="body2" color={COLORS.textMuted} align="center" style={styles.emptySubtitle}>
                                초대 링크를 통해 룸에 입장하거나{"\n"}직접 새로운 룸을 만들어보세요.
                            </ThemedText>
                            <Button
                                label="새 룸 만들기"
                                onPress={() => router.push("/(tabs)/rooms/create")}
                                style={styles.emptyAction}
                                variant="primary" // Explicitly primary
                            />
                        </Card>
                    ) : (
                        <View style={styles.roomList}>
                            {rooms.map((room) => (
                                <RoomCard
                                    key={room.id}
                                    room={room}
                                    isHost={room.owner_id === userId}
                                    onPress={() => router.push(`/room/${room.id}`)}
                                    participantCount={room.room_members?.[0]?.count}
                                    hasNewExam={room.room_exams?.some(e => {
                                        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
                                        return (Date.now() - new Date(e.created_at).getTime()) < threeDaysMs;
                                    })}
                                />
                            ))}
                        </View>
                    )}
                </View>

                <View style={styles.footerSection}>
                    <Button
                        variant="ghost"
                        label={joining ? "닫기" : "ID로 참여하기"}
                        onPress={() => setJoining(!joining)}
                        style={styles.idJoinLink}
                        textStyle={styles.idJoinText}
                        size="sm"
                    />
                    {joining && (
                        <View style={styles.subtleJoinInput}>
                            <TextInput
                                value={roomIdInput}
                                onChangeText={setRoomIdInput}
                                placeholder="룸 ID 붙여넣기"
                                placeholderTextColor={COLORS.textMuted}
                                autoCapitalize="none"
                                autoCorrect={false}
                                style={styles.miniInput}
                            />
                            <Pressable
                                onPress={handleJoin}
                                disabled={roomIdInput.trim().length === 0}
                                style={styles.miniJoinBtn}
                            >
                                <Ionicons name="arrow-forward" size={20} color={COLORS.primary} />
                            </Pressable>
                        </View>
                    )}
                    {error ? <ThemedText style={styles.errorText} color={COLORS.error}>{error}</ThemedText> : null}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    content: {
        padding: SPACING.xxl,
        paddingBottom: 40,
        gap: SPACING.lg,
    },
    createBtn: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    listHeaderSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        marginTop: SPACING.md,
    },
    listInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    listTitle: { letterSpacing: -0.5 },
    listSection: { gap: SPACING.md },
    roomList: { gap: SPACING.md },
    emptyCard: { alignItems: "center", borderStyle: 'dashed' },
    emptyIconCircle: {
        width: 80,
        height: 80,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: SPACING.lg,
    },
    emptyTitle: { marginBottom: SPACING.sm },
    emptySubtitle: { marginBottom: SPACING.lg, lineHeight: 24 },
    emptyAction: { width: '100%' },
    footerSection: { marginTop: SPACING.md, alignItems: 'center', gap: SPACING.md },
    idJoinLink: {},
    subtleJoinInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        height: 56,
        paddingLeft: SPACING.md,
        paddingRight: 6,
        width: '100%',
    },
    miniInput: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '500' },
    miniJoinBtn: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.primary, // Changed to primary for better visibility
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 8 },
    countBadge: {
        backgroundColor: COLORS.surfaceVariant,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: RADIUS.full,
    },
    countText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.text,
        opacity: 0.8,
    },
    idJoinText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
});
