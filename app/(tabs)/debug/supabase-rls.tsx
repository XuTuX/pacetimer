import { useAuth } from "@clerk/clerk-expo";
import React, { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSupabase } from "../../../lib/supabase";
import { formatSupabaseError } from "../../../lib/supabaseError";
import { COLORS } from "../../../lib/theme";

function randomUuidV4(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = Math.floor(Math.random() * 16);
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

type ActionName =
    | "createRoom"
    | "joinRoom"
    | "insertAttempt"
    | "fetchRooms"
    | "fetchAttemptsCurrent"
    | "fetchAttemptsRandom";

function ActionButton({
    label,
    onPress,
    disabled,
    loading,
}: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
}) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled || loading}
            style={({ pressed }) => [
                styles.actionButton,
                (disabled || loading) && styles.actionButtonDisabled,
                pressed && !disabled && !loading && styles.actionButtonPressed,
            ]}
        >
            <Text style={styles.actionButtonText}>{loading ? "..." : label}</Text>
        </Pressable>
    );
}

export default function SupabaseRlsTestScreen() {
    const supabase = useSupabase();
    const { userId } = useAuth();

    const [roomId, setRoomId] = useState<string>("");
    const [roomName, setRoomName] = useState<string>("Debug Room");
    const [busy, setBusy] = useState<ActionName | null>(null);

    const [result, setResult] = useState<unknown>(null);
    const [error, setError] = useState<string | null>(null);

    const canUseRoom = roomId.trim().length > 0;

    const prettyResult = useMemo(() => {
        try {
            return result === null ? "" : JSON.stringify(result, null, 2);
        } catch {
            return String(result);
        }
    }, [result]);

    const run = async (action: ActionName, fn: () => Promise<void>) => {
        setBusy(action);
        setError(null);
        try {
            await fn();
        } catch (err) {
            setError(formatSupabaseError(err));
        } finally {
            setBusy(null);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={["bottom"]}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.card}>
                    <Text style={styles.title}>Supabase RLS Test</Text>
                    <Text style={styles.metaLabel}>Clerk userId</Text>
                    <Text style={styles.metaValue}>{userId ?? "—"}</Text>

                    <Text style={[styles.metaLabel, { marginTop: 12 }]}>Selected roomId</Text>
                    <TextInput
                        value={roomId}
                        onChangeText={setRoomId}
                        placeholder="Paste a room UUID (or create one)"
                        placeholderTextColor={COLORS.textMuted}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={styles.input}
                    />

                    <Text style={[styles.metaLabel, { marginTop: 12 }]}>Room name (create)</Text>
                    <TextInput
                        value={roomName}
                        onChangeText={setRoomName}
                        placeholder="Room name"
                        placeholderTextColor={COLORS.textMuted}
                        style={styles.input}
                    />
                </View>

                <View style={styles.actionsGrid}>
                    <ActionButton
                        label="Create Room"
                        loading={busy === "createRoom"}
                        onPress={() =>
                            run("createRoom", async () => {
                                const name = roomName.trim().length > 0 ? roomName.trim() : `Room ${new Date().toISOString()}`;
                                const { data, error } = await supabase
                                    .from("rooms")
                                    .insert({ name })
                                    .select("*")
                                    .single();
                                if (error) throw error;
                                setRoomId(data.id);
                                setResult(data);
                            })
                        }
                    />

                    <ActionButton
                        label="Join Room"
                        disabled={!canUseRoom}
                        loading={busy === "joinRoom"}
                        onPress={() =>
                            run("joinRoom", async () => {
                                const { data, error } = await supabase
                                    .from("room_members")
                                    .insert({ room_id: roomId.trim() })
                                    .select("*")
                                    .single();
                                if (error) throw error;
                                setResult(data);
                            })
                        }
                    />

                    <ActionButton
                        label="Insert Attempt"
                        disabled={!canUseRoom}
                        loading={busy === "insertAttempt"}
                        onPress={() =>
                            run("insertAttempt", async () => {
                                const startedAt = new Date().toISOString();
                                const endedAt = new Date().toISOString();
                                const { data, error } = await supabase
                                    .from("attempts")
                                    .insert({
                                        room_id: roomId.trim(),
                                        duration_ms: 1000,
                                        started_at: startedAt,
                                        ended_at: endedAt,
                                    })
                                    .select("*")
                                    .single();
                                if (error) throw error;
                                setResult(data);
                            })
                        }
                    />

                    <ActionButton
                        label="Fetch My Rooms"
                        loading={busy === "fetchRooms"}
                        onPress={() =>
                            run("fetchRooms", async () => {
                                const { data, error } = await supabase
                                    .from("rooms")
                                    .select("*")
                                    .order("created_at", { ascending: false });
                                if (error) throw error;
                                setResult(data);
                            })
                        }
                    />

                    <ActionButton
                        label="Fetch Attempts (Current Room)"
                        disabled={!canUseRoom}
                        loading={busy === "fetchAttemptsCurrent"}
                        onPress={() =>
                            run("fetchAttemptsCurrent", async () => {
                                const { data, error } = await supabase
                                    .from("attempts")
                                    .select("*")
                                    .eq("room_id", roomId.trim())
                                    .order("created_at", { ascending: false });
                                if (error) throw error;
                                setResult(data);
                            })
                        }
                    />

                    <ActionButton
                        label="Fetch Attempts (Random RoomId)"
                        loading={busy === "fetchAttemptsRandom"}
                        onPress={() =>
                            run("fetchAttemptsRandom", async () => {
                                const randomRoomId = randomUuidV4();
                                const { data, error } = await supabase
                                    .from("attempts")
                                    .select("*")
                                    .eq("room_id", randomRoomId)
                                    .order("created_at", { ascending: false });

                                if (error) throw error;
                                setResult({ randomRoomId, rows: data });
                            })
                        }
                    />
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Result</Text>
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    <Text selectable style={styles.json}>
                        {prettyResult || "—"}
                    </Text>
                </View>

                <Text style={styles.hint}>
                    Expected behavior: selecting attempts for a random room should return 0 rows (RLS blocks access).
                </Text>
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
        gap: 12,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderColor: COLORS.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
    },
    title: {
        fontSize: 18,
        fontWeight: "800",
        color: COLORS.text,
        marginBottom: 10,
    },
    metaLabel: {
        fontSize: 12,
        fontWeight: "700",
        color: COLORS.textMuted,
        marginBottom: 6,
    },
    metaValue: {
        fontSize: 12,
        fontWeight: "700",
        color: COLORS.text,
    },
    input: {
        backgroundColor: COLORS.bg,
        borderColor: COLORS.border,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: COLORS.text,
        fontSize: 14,
    },
    actionsGrid: {
        gap: 10,
    },
    actionButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: "center",
    },
    actionButtonPressed: {
        opacity: 0.9,
    },
    actionButtonDisabled: {
        opacity: 0.5,
    },
    actionButtonText: {
        color: COLORS.white,
        fontWeight: "800",
        fontSize: 14,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "800",
        color: COLORS.text,
        marginBottom: 8,
    },
    errorText: {
        color: COLORS.accent,
        fontSize: 12,
        fontWeight: "700",
        marginBottom: 8,
    },
    json: {
        fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
        fontSize: 12,
        color: COLORS.text,
        lineHeight: 16,
    },
    hint: {
        fontSize: 12,
        color: COLORS.textMuted,
        textAlign: "center",
        paddingHorizontal: 8,
    },
});
