import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { RoomCard } from "../../../components/rooms/RoomCard";
import { Button } from "../../../components/ui/Button";
import { HeaderSettings } from "../../../components/ui/HeaderSettings";
import { ScreenHeader } from "../../../components/ui/ScreenHeader";
import { ThemedText } from "../../../components/ui/ThemedText";
import type { Database } from "../../../lib/db-types";
import { useSupabase } from "../../../lib/supabase";
import { formatSupabaseError } from "../../../lib/supabaseError";
import { COLORS, RADIUS, SHADOWS, SPACING } from "../../../lib/theme";

type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];

type RoomWithDetails = RoomRow & {
    room_members: { count: number }[];
    room_exams: { id: string; created_at: string }[];
    unsolved_count?: number;
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
                .select("*, room_members(count), room_exams(id, created_at)")
                .in("id", allRoomIds)
                .order("created_at", { ascending: false });
            if (roomsError) throw roomsError;

            const { data: myAttempts, error: attemptsError } = await supabase
                .from("attempts")
                .select("exam_id")
                .eq("user_id", userId ?? "")
                .in("room_id", allRoomIds);

            if (attemptsError) throw attemptsError;

            const mySolvedExamIds = new Set(myAttempts?.map(a => a.exam_id));

            const enrichedRooms = (roomsData as any)?.map((room: any) => {
                const totalExams = room.room_exams || [];
                const unsolved = totalExams.filter((e: any) => !mySolvedExamIds.has(e.id)).length;
                return { ...room, unsolved_count: unsolved };
            });

            setRooms(enrichedRooms ?? []);
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
            const { data: rooms, error: searchError } = await supabase
                .from("rooms")
                .select("id")
                .ilike("id", `${roomId}%`);

            if (searchError) throw searchError;

            if (!rooms || rooms.length === 0) {
                throw new Error("해당 ID의 스터디를 찾을 수 없습니다.");
            }
            if (rooms.length > 1) {
                throw new Error("비슷한 ID가 여러 개 있습니다. 더 길게 입력해주세요.");
            }

            const roomData = rooms[0];

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
                style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
            >
                <Ionicons name="add-outline" size={26} color={COLORS.text} />
            </Pressable>
            <HeaderSettings />
        </View>
    );

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="스터디"
                rightElement={RightActions}
                showBack={false}
                align="left"
            />

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {/* Search Bar Section */}
                <View style={styles.searchSection}>
                    <ThemedText style={styles.sectionTitle}>스터디 참가</ThemedText>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={18} color={COLORS.textMuted} />
                        <TextInput
                            value={roomIdInput}
                            onChangeText={setRoomIdInput}
                            placeholder="참여 코드 입력"
                            placeholderTextColor={COLORS.textMuted}
                            autoCapitalize="none"
                            autoCorrect={false}
                            style={styles.searchInput}
                            onSubmitEditing={handleJoin}
                        />
                        {roomIdInput.length > 0 && (
                            <Pressable onPress={handleJoin} disabled={joining} style={styles.searchBtn}>
                                {joining ? (
                                    <ActivityIndicator size="small" color={COLORS.white} />
                                ) : (
                                    <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                                )}
                            </Pressable>
                        )}
                    </View>

                    {error && (
                        <View style={styles.errorBanner}>
                            <Ionicons name="alert-circle" size={14} color={COLORS.error} />
                            <ThemedText variant="caption" color={COLORS.error}>{error}</ThemedText>
                        </View>
                    )}
                </View>

                {/* List Section */}
                <View style={styles.listSection}>
                    <ThemedText style={styles.sectionTitle}>스터디 목록 {rooms.length}</ThemedText>
                    {loading && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 20 }} />}

                    {hasLoadedOnce && rooms.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIcon}>
                                <Ionicons name="people-outline" size={32} color={COLORS.textMuted} />
                            </View>
                            <ThemedText variant="subtitle1" style={styles.emptyTitle}>
                                참여 중인 스터디가 없어요
                            </ThemedText>
                            <ThemedText variant="body2" color={COLORS.textMuted} align="center" style={styles.emptyDesc}>
                                참여 코드로 스터디에 입장하거나{"\n"}새로운 스터디를 만들어보세요
                            </ThemedText>
                            <Button
                                label="스터디 만들기"
                                onPress={() => router.push("/(tabs)/rooms/create")}
                                style={styles.emptyBtn}
                            />
                        </View>
                    ) : (
                        <View style={styles.roomList}>
                            {rooms.map((room) => (
                                <RoomCard
                                    key={room.id}
                                    room={room}
                                    onPress={() => router.push(`/room/${room.id}`)}
                                    participantCount={room.room_members?.[0]?.count}
                                    unsolvedCount={room.unsolved_count}
                                />
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    addBtn: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    content: {
        padding: SPACING.lg,
        paddingBottom: 40,
    },
    searchSection: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        marginBottom: SPACING.md,
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text,
        opacity: 0.8,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        paddingLeft: SPACING.lg,
        paddingRight: 6,
        height: 54,
        ...SHADOWS.small,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: COLORS.text,
        fontWeight: '600',
    },
    searchBtn: {
        width: 42,
        height: 42,
        borderRadius: RADIUS.lg,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.small,
    },
    errorBanner: {
        backgroundColor: COLORS.errorLight,
        padding: SPACING.sm,
        paddingHorizontal: SPACING.md,
        borderRadius: RADIUS.md,
        marginTop: SPACING.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    listSection: {
        marginTop: SPACING.sm,
    },
    roomList: {
        gap: SPACING.md,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xxl,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
    },
    emptyIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
    },
    emptyTitle: {
        marginBottom: SPACING.xs,
    },
    emptyDesc: {
        marginBottom: SPACING.xl,
        lineHeight: 22,
        paddingHorizontal: SPACING.xl,
    },
    emptyBtn: {
        paddingHorizontal: 32,
        borderRadius: RADIUS.xl,
    },
});
