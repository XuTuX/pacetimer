import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RoomCard } from "../../../components/rooms/RoomCard";
import type { Database } from "../../../lib/db-types";
import { useSupabase } from "../../../lib/supabase";
import { formatSupabaseError } from "../../../lib/supabaseError";
import { COLORS } from "../../../lib/theme";

type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];
type RoomMemberRow = Database["public"]["Tables"]["room_members"]["Row"];

export default function RoomsIndexScreen() {
    const supabase = useSupabase();
    const router = useRouter();
    const { isLoaded, userId } = useAuth();

    const [rooms, setRooms] = useState<RoomRow[]>([]);
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
                .select("*")
                .in("id", allRoomIds)
                .order("created_at", { ascending: false });
            if (roomsError) throw roomsError;

            setRooms(roomsData ?? []);
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
        if (!roomId) return;
        if (!isLoaded) return;
        if (!userId) {
            setError("룸에 참여하려면 로그인해 주세요.");
            return;
        }

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

    const openRoom = (id: string) => {
        router.push(`/room/${id}`);
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                {/* Header Section */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>스터디 룸</Text>
                        <Text style={styles.subtitle}>함께 집중하는 스터디</Text>
                    </View>
                    <Pressable
                        onPress={() => router.push("/(tabs)/rooms/create")}
                        style={({ pressed }) => [styles.createBtn, pressed && { transform: [{ scale: 0.95 }] }]}
                    >
                        <Ionicons name="add" size={24} color={COLORS.white} />
                    </Pressable>
                </View>

                {/* List Header */}
                <View style={styles.listHeaderSection}>
                    <View style={styles.listInfo}>
                        <Text style={styles.sectionLabel}>나의 스터디 공간</Text>
                        <Text style={styles.listTitle}>내 활성 룸</Text>
                    </View>
                    {loading && <ActivityIndicator size="small" color={COLORS.primary} />}
                </View>

                {/* Rooms List */}
                <View style={styles.listSection}>
                    {hasLoadedOnce && rooms.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <View style={styles.emptyIconCircle}>
                                <Ionicons name="school-outline" size={32} color={COLORS.primary} />
                            </View>
                            <Text style={styles.emptyTitle}>참여 중인 룸이 없습니다</Text>
                            <Text style={styles.emptySubtitle}>
                                초대 링크를 통해 룸에 입장하거나{"\n"}직접 새로운 룸을 만들어보세요.
                            </Text>
                            <Pressable
                                style={styles.emptyAction}
                                onPress={() => router.push("/(tabs)/rooms/create")}
                            >
                                <Text style={styles.emptyActionText}>새 룸 만들기</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <View style={styles.roomList}>
                            {rooms.map((room) => (
                                <RoomCard
                                    key={room.id}
                                    room={room}
                                    isHost={room.owner_id === userId}
                                    onPress={() => openRoom(room.id)}
                                />
                            ))}
                        </View>
                    )}
                </View>

                {/* Subtle Join Toggle */}
                <View style={styles.footerSection}>
                    <Pressable
                        onPress={() => setJoining(!joining)}
                        style={styles.idJoinLink}
                    >
                        <Text style={styles.idJoinLinkText}>
                            {joining ? "닫기" : "ID로 참여하기"}
                        </Text>
                    </Pressable>

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
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
        gap: 32,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 10,
    },
    title: {
        fontSize: 32,
        fontWeight: "900",
        color: COLORS.text,
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.textMuted,
        marginTop: -4,
    },
    createBtn: {
        width: 48,
        height: 48,
        backgroundColor: COLORS.text,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
    },
    listHeaderSection: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    listInfo: {
        gap: 4,
    },
    listTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.text,
        letterSpacing: -0.5,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: "800",
        color: COLORS.textMuted,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    listSection: {
        gap: 16,
    },
    roomList: {
        gap: 12,
    },
    emptyCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 32,
        padding: 40,
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.primaryLight,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: COLORS.text,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 15,
        color: COLORS.textMuted,
        textAlign: "center",
        lineHeight: 24,
        fontWeight: "500",
        marginBottom: 32,
    },
    emptyAction: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 16,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    emptyActionText: {
        color: COLORS.white,
        fontWeight: "800",
        fontSize: 16,
    },
    footerSection: {
        marginTop: 12,
        alignItems: 'center',
        gap: 16,
    },
    idJoinLink: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    idJoinLinkText: {
        fontSize: 14,
        color: COLORS.textMuted,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    subtleJoinInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        height: 56,
        paddingLeft: 16,
        paddingRight: 6,
        width: '100%',
    },
    miniInput: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '600',
    },
    miniJoinBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: {
        color: COLORS.error,
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
});
