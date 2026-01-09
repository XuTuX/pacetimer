import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Database } from "../../../lib/db-types";
import { useSupabase } from "../../../lib/supabase";
import { formatSupabaseError } from "../../../lib/supabaseError";
import { COLORS } from "../../../lib/theme";

type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];
type RoomMemberRow = Database["public"]["Tables"]["room_members"]["Row"];
type AttemptRow = Database["public"]["Tables"]["attempts"]["Row"];

function formatDurationMs(ms: number): string {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes > 0 ? `${minutes}m ${String(seconds).padStart(2, "0")}s` : `${seconds}s`;
}

export default function RoomDetailScreen() {
    const supabase = useSupabase();
    const { userId } = useAuth();
    const params = useLocalSearchParams<{ id: string }>();

    const roomId = useMemo(() => {
        const raw = params.id;
        if (!raw) return "";
        return Array.isArray(raw) ? raw[0] ?? "" : raw;
    }, [params.id]);

    const [room, setRoom] = useState<RoomRow | null>(null);
    const [members, setMembers] = useState<RoomMemberRow[]>([]);
    const [attempts, setAttempts] = useState<AttemptRow[]>([]);

    const [loading, setLoading] = useState(false);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
    const [activeAttemptStartedAtMs, setActiveAttemptStartedAtMs] = useState<number | null>(null);
    const [nowMs, setNowMs] = useState(Date.now());

    const isRunning = activeAttemptId !== null && activeAttemptStartedAtMs !== null;

    useEffect(() => {
        if (!isRunning) return;
        const id = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(id);
    }, [isRunning]);

    const refresh = useCallback(async () => {
        if (!roomId) return;
        setLoading(true);
        setError(null);

        try {
            const { data: roomData, error: roomError } = await supabase
                .from("rooms")
                .select("*")
                .eq("id", roomId)
                .maybeSingle();
            if (roomError) throw roomError;
            setRoom(roomData ?? null);

            const { data: membersData, error: membersError } = await supabase
                .from("room_members")
                .select("*")
                .eq("room_id", roomId)
                .order("created_at", { ascending: true });
            if (membersError) throw membersError;
            setMembers(membersData ?? []);

            const { data: attemptsData, error: attemptsError } = await supabase
                .from("attempts")
                .select("*")
                .eq("room_id", roomId)
                .order("created_at", { ascending: false });
            if (attemptsError) throw attemptsError;
            setAttempts(attemptsData ?? []);
        } catch (err) {
            setError(formatSupabaseError(err));
        } finally {
            setLoading(false);
        }
    }, [roomId, supabase]);

    useFocusEffect(
        useCallback(() => {
            refresh();
        }, [refresh]),
    );

    const handleJoin = async () => {
        if (!roomId) return;
        setJoining(true);
        setError(null);
        try {
            const { error } = await supabase
                .from("room_members")
                .insert({ room_id: roomId });

            if (error) {
                const code = typeof (error as { code?: unknown }).code === "string" ? (error as { code: string }).code : null;
                if (code !== "23505") throw error;
            }

            await refresh();
        } catch (err) {
            setError(formatSupabaseError(err));
        } finally {
            setJoining(false);
        }
    };

    const handleToggleAttempt = async () => {
        if (!roomId) return;
        if (!room) return;

        setError(null);

        try {
            if (!isRunning) {
                const startedAtIso = new Date().toISOString();
                const startedAtMs = Date.now();

                const { data, error } = await supabase
                    .from("attempts")
                    .insert({ room_id: roomId, duration_ms: 0, started_at: startedAtIso })
                    .select("*")
                    .single();
                if (error) throw error;

                setActiveAttemptId(data.id);
                setActiveAttemptStartedAtMs(startedAtMs);
                setNowMs(startedAtMs);
                await refresh();
                return;
            }

            const endedAtIso = new Date().toISOString();
            const durationMs = Math.max(0, Date.now() - (activeAttemptStartedAtMs ?? Date.now()));

            const { error } = await supabase
                .from("attempts")
                .update({ ended_at: endedAtIso, duration_ms: durationMs })
                .eq("id", activeAttemptId!)
                .select("*")
                .single();
            if (error) throw error;

            setActiveAttemptId(null);
            setActiveAttemptStartedAtMs(null);
            await refresh();
        } catch (err) {
            setError(formatSupabaseError(err));
        }
    };

    const isOwner = room?.owner_id === userId;
    const memberCountLabel = members.length === 0 ? "—" : String(members.length);
    const attemptsCountLabel = attempts.length === 0 ? "—" : String(attempts.length);
    const runningLabel = isRunning ? formatDurationMs(nowMs - (activeAttemptStartedAtMs ?? nowMs)) : null;

    return (
        <SafeAreaView style={styles.container} edges={["bottom"]}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.card}>
                    <Text style={styles.title}>{room?.name ?? "Room"}</Text>
                    <Text style={styles.meta}>{roomId}</Text>
                    <View style={styles.pillsRow}>
                        <View style={styles.pill}>
                            <Ionicons name="people-outline" size={14} color={COLORS.textMuted} />
                            <Text style={styles.pillText}>{memberCountLabel} members</Text>
                        </View>
                        <View style={styles.pill}>
                            <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
                            <Text style={styles.pillText}>{attemptsCountLabel} attempts</Text>
                        </View>
                        {isOwner ? (
                            <View style={[styles.pill, { backgroundColor: COLORS.primaryLight }]}>
                                <Ionicons name="star-outline" size={14} color={COLORS.primary} />
                                <Text style={[styles.pillText, { color: COLORS.primary }]}>owner</Text>
                            </View>
                        ) : null}
                    </View>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    {loading ? <Text style={styles.hint}>Loading…</Text> : null}

                    {!room ? (
                        <View style={styles.notice}>
                            <Text style={styles.noticeTitle}>No access (or room not found)</Text>
                            <Text style={styles.noticeBody}>
                                If you have a room ID, try joining. RLS will keep you locked out unless you’re a member/owner.
                            </Text>
                            <Pressable
                                onPress={handleJoin}
                                disabled={joining}
                                style={({ pressed }) => [
                                    styles.primaryBtn,
                                    joining && { opacity: 0.6 },
                                    pressed && !joining && { opacity: 0.9 },
                                ]}
                            >
                                <Text style={styles.primaryBtnText}>{joining ? "Joining…" : "Join Room"}</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <Pressable
                            onPress={handleToggleAttempt}
                            style={({ pressed }) => [
                                styles.primaryBtn,
                                pressed && { opacity: 0.9 },
                            ]}
                        >
                            <Text style={styles.primaryBtnText}>
                                {isRunning ? `End attempt (${runningLabel})` : "Start attempt"}
                            </Text>
                        </Pressable>
                    )}
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Members</Text>
                    {members.length === 0 ? (
                        <Text style={styles.hint}>
                            No members visible. If your RLS policy on `room_members` only allows “self”, you’ll only ever see your own row.
                        </Text>
                    ) : (
                        <View style={{ gap: 10 }}>
                            {members.map((m) => (
                                <View key={`${m.room_id}:${m.user_id}`} style={styles.row}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.rowTitle} numberOfLines={1}>
                                            {m.user_id}
                                        </Text>
                                        <Text style={styles.rowMeta}>{m.role}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Attempts</Text>
                    {attempts.length === 0 ? (
                        <Text style={styles.hint}>No attempts yet.</Text>
                    ) : (
                        <View style={{ gap: 10 }}>
                            {attempts.map((a) => (
                                <View key={a.id} style={styles.row}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.rowTitle}>{formatDurationMs(a.duration_ms)}</Text>
                                        <Text style={styles.rowMeta} numberOfLines={1}>
                                            {a.started_at ?? "—"} → {a.ended_at ?? "—"}
                                        </Text>
                                    </View>
                                    <Text style={styles.rowMeta} numberOfLines={1}>
                                        {a.user_id === userId ? "me" : a.user_id}
                                    </Text>
                                </View>
                            ))}
                        </View>
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
    card: {
        backgroundColor: COLORS.surface,
        borderColor: COLORS.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        gap: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: "800",
        color: COLORS.text,
    },
    meta: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.textMuted,
    },
    pillsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 8,
    },
    pill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: COLORS.bg,
        borderColor: COLORS.border,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    pillText: {
        fontSize: 11,
        fontWeight: "800",
        color: COLORS.textMuted,
        textTransform: "uppercase",
    },
    errorText: {
        color: COLORS.error,
        fontSize: 12,
        fontWeight: "700",
    },
    hint: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.textMuted,
    },
    primaryBtn: {
        marginTop: 8,
        backgroundColor: COLORS.primary,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: "center",
    },
    primaryBtnText: {
        color: COLORS.white,
        fontWeight: "800",
        fontSize: 14,
    },
    notice: {
        marginTop: 6,
        backgroundColor: COLORS.bg,
        borderColor: COLORS.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        gap: 8,
    },
    noticeTitle: {
        fontSize: 13,
        fontWeight: "900",
        color: COLORS.text,
    },
    noticeBody: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.textMuted,
        lineHeight: 16,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "900",
        color: COLORS.text,
    },
    row: {
        flexDirection: "row",
        gap: 10,
        alignItems: "center",
        backgroundColor: COLORS.bg,
        borderColor: COLORS.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
    },
    rowTitle: {
        fontSize: 13,
        fontWeight: "900",
        color: COLORS.text,
    },
    rowMeta: {
        marginTop: 4,
        fontSize: 11,
        fontWeight: "700",
        color: COLORS.textMuted,
    },
});

