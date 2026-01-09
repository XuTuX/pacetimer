import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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

    // 진행 중인 시도 상태
    const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
    const [activeAttemptStartedAtMs, setActiveAttemptStartedAtMs] = useState<number | null>(null);
    const [nowMs, setNowMs] = useState(Date.now());

    const isRunning = activeAttemptId !== null && activeAttemptStartedAtMs !== null;

    // 타이머 효과
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
            // 1. 방 정보 가져오기
            const { data: roomData, error: roomError } = await supabase
                .from("rooms")
                .select("*")
                .eq("id", roomId)
                .maybeSingle();
            if (roomError) throw roomError;
            setRoom(roomData ?? null);

            // 2. 멤버 목록 가져오기
            const { data: membersData, error: membersError } = await supabase
                .from("room_members")
                .select("*")
                .eq("room_id", roomId)
                .order("created_at", { ascending: true });
            if (membersError) throw membersError;
            setMembers(membersData ?? []);

            // 3. 전체 시도 기록 가져오기
            const { data: attemptsData, error: attemptsError } = await supabase
                .from("attempts")
                .select("*")
                .eq("room_id", roomId)
                .order("created_at", { ascending: false });
            if (attemptsError) throw attemptsError;
            setAttempts(attemptsData ?? []);

            // 4. ⭐ 진행 중인 시도(끝나지 않은 것)가 있는지 확인하여 타이머 복구
            const active = (attemptsData ?? []).find(a => a.user_id === userId && a.ended_at === null);
            if (active) {
                setActiveAttemptId(active.id);
                setActiveAttemptStartedAtMs(new Date(active.started_at!).getTime());
            } else {
                setActiveAttemptId(null);
                setActiveAttemptStartedAtMs(null);
            }

        } catch (err) {
            setError(formatSupabaseError(err));
        } finally {
            setLoading(false);
        }
    }, [roomId, supabase, userId]);

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
                const code = typeof (error as any).code === "string" ? (error as any).code : null;
                if (code !== "23505") throw error; // 이미 멤버인 경우 제외
            }
            await refresh();
        } catch (err) {
            setError(formatSupabaseError(err));
        } finally {
            setJoining(false);
        }
    };

    const handleToggleAttempt = async () => {
        if (!roomId || !room) return;
        setError(null);

        try {
            if (!isRunning) {
                // 시도 시작
                const startedAtIso = new Date().toISOString();
                const { data, error } = await supabase
                    .from("attempts")
                    .insert({
                        room_id: roomId,
                        started_at: startedAtIso,
                        duration_ms: 0
                    })
                    .select("*")
                    .single();

                if (error) throw error;

                setActiveAttemptId(data.id);
                setActiveAttemptStartedAtMs(new Date(data.started_at!).getTime());
            } else {
                // 시도 종료
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
            }
            await refresh();
        } catch (err) {
            setError(formatSupabaseError(err));
        }
    };

    const isOwner = room?.owner_id === userId;
    const runningLabel = isRunning ? formatDurationMs(nowMs - (activeAttemptStartedAtMs ?? nowMs)) : null;

    return (
        <SafeAreaView style={styles.container} edges={["bottom"]}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.title}>{room?.name ?? "Room Detail"}</Text>
                    <Text style={styles.meta}>{roomId}</Text>

                    <View style={styles.pillsRow}>
                        <View style={styles.pill}>
                            <Ionicons name="people-outline" size={14} color={COLORS.textMuted} />
                            <Text style={styles.pillText}>{members.length} members</Text>
                        </View>
                        <View style={styles.pill}>
                            <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
                            <Text style={styles.pillText}>{attempts.length} attempts</Text>
                        </View>
                        {isOwner && (
                            <View style={[styles.pill, { backgroundColor: COLORS.primaryLight }]}>
                                <Ionicons name="star-outline" size={14} color={COLORS.primary} />
                                <Text style={[styles.pillText, { color: COLORS.primary }]}>Owner</Text>
                            </View>
                        )}
                    </View>

                    {error && <Text style={styles.errorText}>{error}</Text>}

                    {!room && !loading ? (
                        <View style={styles.notice}>
                            <Text style={styles.noticeTitle}>Not a member yet</Text>
                            <Pressable
                                onPress={handleJoin}
                                disabled={joining}
                                style={styles.primaryBtn}
                            >
                                <Text style={styles.primaryBtnText}>{joining ? "Joining..." : "Join Room"}</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <Pressable
                            onPress={handleToggleAttempt}
                            disabled={loading}
                            style={[styles.primaryBtn, isRunning && { backgroundColor: COLORS.error }]}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.primaryBtnText}>
                                    {isRunning ? `End attempt (${runningLabel})` : "Start attempt"}
                                </Text>
                            )}
                        </Pressable>
                    )}
                </View>

                {/* 멤버 목록 */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Members</Text>
                    {members.map((m) => (
                        <View key={m.user_id} style={styles.row}>
                            <Text style={styles.rowTitle}>{m.user_id === userId ? "Me" : m.user_id.split('_')[0]}</Text>
                            <Text style={styles.rowMeta}>{m.role}</Text>
                        </View>
                    ))}
                </View>

                {/* 시도 기록 */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Recent Attempts</Text>
                    {attempts.length === 0 ? (
                        <Text style={styles.hint}>No attempts yet.</Text>
                    ) : (
                        attempts.map((a) => (
                            <View key={a.id} style={styles.row}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.rowTitle}>{formatDurationMs(a.duration_ms)}</Text>
                                    <Text style={styles.rowMeta}>{new Date(a.created_at).toLocaleDateString()}</Text>
                                </View>
                                {a.ended_at === null && (
                                    <View style={styles.liveBadge}>
                                        <Text style={styles.liveBadgeText}>LIVE</Text>
                                    </View>
                                )}
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    content: { padding: 16, gap: 14 },
    card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
    title: { fontSize: 20, fontWeight: "800", color: COLORS.text },
    meta: { fontSize: 12, color: COLORS.textMuted },
    pillsRow: { flexDirection: "row", gap: 8 },
    pill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.bg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
    pillText: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase" },
    sectionTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text, marginBottom: 4 },
    primaryBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center", minHeight: 50 },
    primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    rowTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text },
    rowMeta: { fontSize: 12, color: COLORS.textMuted },
    errorText: { color: COLORS.error, fontSize: 12, fontWeight: "600" },
    hint: { fontSize: 13, color: COLORS.textMuted, textAlign: "center", marginTop: 10 },
    notice: { gap: 10 },
    noticeTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text, textAlign: "center" },
    liveBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    liveBadgeText: { color: "#fff", fontSize: 10, fontWeight: "900" }
});