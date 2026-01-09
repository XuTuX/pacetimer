import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Database } from "../../../lib/db-types";
import { useSupabase } from "../../../lib/supabase";
import { formatSupabaseError } from "../../../lib/supabaseError";
import { COLORS } from "../../../lib/theme";

type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];
type RoomMemberRow = Database["public"]["Tables"]["room_members"]["Row"];

export default function RoomsIndexScreen() {
    const supabase = useSupabase();
    const router = useRouter();
    const { userId } = useAuth();

    const [rooms, setRooms] = useState<RoomRow[]>([]);
    const [memberships, setMemberships] = useState<RoomMemberRow[]>([]);
    const [joinRoomId, setJoinRoomId] = useState("");
    const [loading, setLoading] = useState(false);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const membershipByRoomId = useMemo(() => {
        const map = new Map<string, RoomMemberRow>();
        for (const row of memberships) map.set(row.room_id, row);
        return map;
    }, [memberships]);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: roomsData, error: roomsError } = await supabase
                .from("rooms")
                .select("*")
                .order("created_at", { ascending: false });
            if (roomsError) throw roomsError;

            const { data: membershipData, error: membershipError } = await supabase
                .from("room_members")
                .select("*")
                .order("created_at", { ascending: false });
            if (membershipError) throw membershipError;

            setRooms(roomsData ?? []);
            setMemberships(membershipData ?? []);
        } catch (err) {
            setError(formatSupabaseError(err));
        } finally {
            setLoading(false);
            setHasLoadedOnce(true);
        }
    }, [supabase]);

    const handleJoin = async () => {
        const id = joinRoomId.trim();
        if (!id) return;

        setJoining(true);
        setError(null);
        try {
            const { error: joinError } = await supabase
                .from("room_members")
                .insert({ room_id: id });
            if (joinError) throw joinError;

            setJoinRoomId("");
            await refresh();
            router.push({ pathname: "/(tabs)/rooms/[id]", params: { id } });
        } catch (err) {
            setError(formatSupabaseError(err));
        } finally {
            setJoining(false);
        }
    };

    const openRoom = (id: string) => {
        router.push({ pathname: "/(tabs)/rooms/[id]", params: { id } });
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.title}>Rooms</Text>
                        <Text style={styles.subtitle}>{userId ?? "—"}</Text>
                    </View>
                    <Pressable
                        onPress={() => router.push("/(tabs)/rooms/create")}
                        style={({ pressed }) => [styles.createBtn, pressed && { opacity: 0.9 }]}
                    >
                        <Ionicons name="add" size={18} color={COLORS.white} />
                        <Text style={styles.createBtnText}>Create</Text>
                    </Pressable>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Join a room</Text>
                    <Text style={styles.cardHint}>Paste a room UUID and join as a member.</Text>
                    <View style={styles.joinRow}>
                        <TextInput
                            value={joinRoomId}
                            onChangeText={setJoinRoomId}
                            placeholder="room_id (uuid)"
                            placeholderTextColor={COLORS.textMuted}
                            autoCapitalize="none"
                            autoCorrect={false}
                            style={styles.input}
                        />
                        <Pressable
                            onPress={handleJoin}
                            disabled={joining || joinRoomId.trim().length === 0}
                            style={({ pressed }) => [
                                styles.joinBtn,
                                (joining || joinRoomId.trim().length === 0) && { opacity: 0.5 },
                                pressed && !joining && joinRoomId.trim().length > 0 && { opacity: 0.9 },
                            ]}
                        >
                            <Text style={styles.joinBtnText}>{joining ? "..." : "Join"}</Text>
                        </Pressable>
                    </View>
                </View>

                <View style={styles.card}>
                    <View style={styles.cardTitleRow}>
                        <Text style={styles.cardTitle}>My rooms</Text>
                        <Pressable onPress={refresh} disabled={loading} style={({ pressed }) => pressed && { opacity: 0.8 }}>
                            <Ionicons name="refresh" size={18} color={COLORS.textMuted} />
                        </Pressable>
                    </View>
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    {!hasLoadedOnce && loading ? <Text style={styles.cardHint}>Loading…</Text> : null}
                    {!hasLoadedOnce && !loading ? (
                        <Text style={styles.cardHint}>Tap refresh to load rooms.</Text>
                    ) : null}

                    {hasLoadedOnce && !loading && rooms.length === 0 ? (
                        <Text style={styles.cardHint}>No rooms yet. Create one, or join by ID.</Text>
                    ) : (
                        hasLoadedOnce && (
                            <View style={{ gap: 10 }}>
                                {rooms.map((room) => {
                                    const membership = membershipByRoomId.get(room.id);
                                    const role =
                                        room.owner_id === userId
                                            ? "owner"
                                            : membership?.role ?? "member";

                                    return (
                                        <Pressable
                                            key={room.id}
                                            onPress={() => openRoom(room.id)}
                                            style={({ pressed }) => [
                                                styles.roomRow,
                                                pressed && { opacity: 0.9 },
                                            ]}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.roomName}>{room.name}</Text>
                                                <Text style={styles.roomMeta} numberOfLines={1}>
                                                    {room.id}
                                                </Text>
                                            </View>
                                            <View style={styles.rolePill}>
                                                <Text style={styles.roleText}>{role}</Text>
                                            </View>
                                            <Ionicons
                                                name="chevron-forward"
                                                size={18}
                                                color={COLORS.textMuted}
                                            />
                                        </Pressable>
                                    );
                                })}
                            </View>
                        )
                    )}
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
        padding: 16,
        paddingBottom: 40,
        gap: 14,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    title: {
        fontSize: 22,
        fontWeight: "800",
        color: COLORS.text,
    },
    subtitle: {
        marginTop: 4,
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.textMuted,
    },
    createBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
    },
    createBtnText: {
        color: COLORS.white,
        fontWeight: "800",
        fontSize: 13,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderColor: COLORS.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        gap: 10,
    },
    cardTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: "800",
        color: COLORS.text,
    },
    cardHint: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.textMuted,
    },
    errorText: {
        color: COLORS.error,
        fontSize: 12,
        fontWeight: "700",
    },
    joinRow: {
        flexDirection: "row",
        gap: 10,
        alignItems: "center",
    },
    input: {
        flex: 1,
        backgroundColor: COLORS.bg,
        borderColor: COLORS.border,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: COLORS.text,
        fontSize: 14,
    },
    joinBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
    },
    joinBtnText: {
        color: COLORS.white,
        fontWeight: "800",
        fontSize: 13,
    },
    roomRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: COLORS.bg,
        borderColor: COLORS.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
    },
    roomName: {
        fontSize: 14,
        fontWeight: "800",
        color: COLORS.text,
    },
    roomMeta: {
        marginTop: 4,
        fontSize: 11,
        fontWeight: "600",
        color: COLORS.textMuted,
    },
    rolePill: {
        backgroundColor: COLORS.primaryLight,
        borderColor: COLORS.border,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    roleText: {
        fontSize: 11,
        fontWeight: "800",
        color: COLORS.primary,
        textTransform: "uppercase",
    },
});
