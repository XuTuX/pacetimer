import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
                .upsert(
                    { room_id: roomData.id, user_id: userId },
                    { onConflict: "room_id,user_id", ignoreDuplicates: true },
                );

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
                <LinearGradient
                    colors={[COLORS.primaryLight, "#FFFFFF"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.hero}
                >
                    <View style={styles.heroRow}>
                        <View style={styles.heroIcon}>
                            <Ionicons name="people" size={22} color={COLORS.primary} />
                        </View>
                        <View style={styles.heroText}>
                            <Text style={styles.title}>스터디 룸 만들기</Text>
                            <Text style={styles.hint}>
                                비동기 모의고사를 함께하는 공간을 만듭니다. 생성한 분이 호스트가 됩니다.
                            </Text>
                        </View>
                    </View>
                    <View style={styles.heroPills}>
                        <View style={styles.heroPill}>
                            <Ionicons name="sparkles-outline" size={14} color={COLORS.primary} />
                            <Text style={styles.heroPillText}>호스트 자동 참여</Text>
                        </View>
                        <View style={styles.heroPill}>
                            <Ionicons name="key-outline" size={14} color={COLORS.textMuted} />
                            <Text style={styles.heroPillText}>ID 공유로 초대</Text>
                        </View>
                    </View>
                </LinearGradient>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>기본 정보</Text>

                    <View style={styles.field}>
                        <Text style={styles.label}>룸 이름</Text>
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            placeholder="예: 2026 수능 스터디"
                            placeholderTextColor={COLORS.textMuted}
                            style={styles.input}
                            returnKeyType="next"
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>설명 (선택)</Text>
                        <TextInput
                            value={description}
                            onChangeText={setDescription}
                            placeholder="예: 매주 수학 연습"
                            placeholderTextColor={COLORS.textMuted}
                            style={[styles.input, styles.multilineInput]}
                            multiline
                        />
                    </View>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <View style={styles.infoBanner}>
                        <Ionicons name="information-circle" size={16} color={COLORS.primary} />
                        <Text style={styles.infoText}>생성 후 룸 ID를 공유하면 바로 참여할 수 있어요.</Text>
                    </View>

                    <Pressable
                        onPress={handleCreate}
                        disabled={!canCreate}
                        style={({ pressed }) => [
                            styles.primaryBtn,
                            !canCreate && { opacity: 0.5 },
                            pressed && canCreate && { opacity: 0.9 },
                        ]}
                    >
                        <Text style={styles.primaryBtnText}>{saving ? "생성 중..." : "룸 생성"}</Text>
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
        padding: 20,
        paddingBottom: 40,
        gap: 18,
    },
    hero: {
        borderRadius: 20,
        padding: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: "rgba(0, 208, 148, 0.15)",
    },
    heroRow: {
        flexDirection: "row",
        gap: 12,
        alignItems: "flex-start",
    },
    heroIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        alignItems: "center",
        justifyContent: "center",
    },
    heroText: {
        flex: 1,
        gap: 6,
    },
    title: {
        fontSize: 22,
        fontWeight: "900",
        color: COLORS.text,
    },
    hint: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textMuted,
        lineHeight: 18,
    },
    heroPills: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    heroPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "rgba(0, 0, 0, 0.04)",
    },
    heroPillText: {
        fontSize: 12,
        fontWeight: "700",
        color: COLORS.textMuted,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderColor: COLORS.border,
        borderWidth: 1,
        borderRadius: 20,
        padding: 18,
        gap: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: "800",
        color: COLORS.textMuted,
        letterSpacing: 1.2,
    },
    field: {
        gap: 8,
    },
    label: {
        fontSize: 13,
        fontWeight: "700",
        color: COLORS.text,
    },
    input: {
        backgroundColor: COLORS.surfaceVariant,
        borderColor: "rgba(0, 0, 0, 0.05)",
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: COLORS.text,
        fontSize: 14,
        textAlignVertical: "top",
    },
    multilineInput: {
        minHeight: 90,
    },
    errorText: {
        color: COLORS.error,
        fontSize: 12,
        fontWeight: "700",
        marginTop: 6,
    },
    infoBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(0, 208, 148, 0.2)",
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.text,
        lineHeight: 16,
    },
    primaryBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: "center",
        marginTop: 8,
        shadowColor: "#00D094",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 3,
    },
    primaryBtnText: {
        color: COLORS.white,
        fontWeight: "800",
        fontSize: 15,
    },
});
