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

    const [name, setName] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canCreate = name.trim().length > 0 && !saving;

    const handleCreate = async () => {
        if (!canCreate) return;
        setSaving(true);
        setError(null);

        try {
            const { data, error } = await supabase
                .from("rooms")
                .insert({ name: name.trim() })
                .select("*")
                .single();
            if (error) throw error;

            router.replace({ pathname: "/(tabs)/rooms/[id]", params: { id: data.id } });
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
                    <Text style={styles.title}>Create a room</Text>
                    <Text style={styles.hint}>Rooms are protected by RLS. Only members/owners can read their data.</Text>

                    <Text style={styles.label}>Room name</Text>
                    <TextInput
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g. Study group"
                        placeholderTextColor={COLORS.textMuted}
                        style={styles.input}
                        returnKeyType="done"
                        onSubmitEditing={handleCreate}
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
                        <Text style={styles.primaryBtnText}>{saving ? "Creating…" : "Create Room"}</Text>
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
        padding: 14,
        gap: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: "800",
        color: COLORS.text,
    },
    hint: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.textMuted,
    },
    label: {
        marginTop: 10,
        fontSize: 12,
        fontWeight: "800",
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
    errorText: {
        color: COLORS.error,
        fontSize: 12,
        fontWeight: "700",
        marginTop: 6,
    },
    primaryBtn: {
        marginTop: 10,
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

