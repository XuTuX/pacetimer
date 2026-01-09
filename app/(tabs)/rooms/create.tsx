import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSupabase } from "../../../lib/supabase";
import { formatSupabaseError } from "../../../lib/supabaseError";
import { COLORS } from "../../../lib/theme";

export default function RoomsCreateScreen() {
    const supabase = useSupabase();
    const router = useRouter();
    const { userId } = useAuth();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canCreate = name.trim().length > 0 && !saving;

    const handleCreate = async () => {
        if (!canCreate || !userId) return;
        setSaving(true);
        setError(null);

        try {
            // 1. Create Room
            const { data: roomData, error: createError } = await supabase
                .from("rooms")
                .insert({
                    name: name.trim(),
                    description: description.trim() || null,
                    owner_id: userId
                })
                .select("*")
                .single();

            if (createError) throw createError;

            // 2. Auto-join as participant (The host is implicitly a participant too?)
            // Usually good practice to add them to participants table for consistent querying, 
            // although they are already 'host'. Let's add them.
            const { error: joinError } = await supabase
                .from("room_members")
                .insert({ room_id: roomData.id, user_id: userId });

            if (joinError) throw joinError;

            router.replace({ pathname: "/(tabs)/rooms/[id]", params: { id: roomData.id } });
        } catch (err) {
            setError(formatSupabaseError(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={["bottom"]}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.card}>
                    <Text style={styles.title}>Create a Room</Text>
                    <Text style={styles.hint}>
                        Create a shared space for asynchronous mock exams. You will be the host.
                    </Text>

                    <Text style={styles.label}>Room Name</Text>
                    <TextInput
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g. 2026 SAT Study Group"
                        placeholderTextColor={COLORS.textMuted}
                        style={styles.input}
                        returnKeyType="next"
                    />

                    <Text style={styles.label}>Description (Optional)</Text>
                    <TextInput
                        value={description}
                        onChangeText={setDescription}
                        placeholder="e.g. Weekly math practice..."
                        placeholderTextColor={COLORS.textMuted}
                        style={[styles.input, { minHeight: 80 }]}
                        multiline
                    />

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <Pressable
                        onPress={handleCreate}
                        disabled={!canCreate}
                        style={({ pressed }) => [
                            styles.primaryBtn,
                            !canCreate && { opacity: 0.5 },
                            pressed && canCreate && { opacity: 0.9 },
                        ]}
                    >
                        <Text style={styles.primaryBtnText}>{saving ? "Creating..." : "Create Room"}</Text>
                    </Pressable>
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
    },
    card: {
        backgroundColor: COLORS.surface,
        borderColor: COLORS.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        gap: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: "800",
        color: COLORS.text,
    },
    hint: {
        fontSize: 13,
        fontWeight: "500",
        color: COLORS.textMuted,
        marginBottom: 8,
        lineHeight: 18,
    },
    label: {
        marginTop: 6,
        fontSize: 13,
        fontWeight: "700",
        color: COLORS.text,
    },
    input: {
        backgroundColor: COLORS.bg,
        borderColor: COLORS.border,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: COLORS.text,
        fontSize: 14,
        textAlignVertical: 'top',
    },
    errorText: {
        color: COLORS.error,
        fontSize: 12,
        fontWeight: "700",
        marginTop: 6,
    },
    primaryBtn: {
        marginTop: 16,
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
});

