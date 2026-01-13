import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../../../components/ui/ScreenHeader";
import { useSupabase } from "../../../lib/supabase";
import { formatSupabaseError } from "../../../lib/supabaseError";
import { COLORS, RADIUS, SPACING } from "../../../lib/theme";

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
            const trimmedName = name.trim();
            const trimmedDescription = description.trim();

            const { data: roomData, error: createError } = await supabase
                .from("rooms")
                .insert({
                    name: trimmedName,
                    description: trimmedDescription || null,
                    owner_id: userId
                })
                .select("*")
                .single();

            if (createError) throw createError;
            if (!roomData) {
                throw new Error("스터디 생성에 실패했습니다.");
            }

            const roomId = roomData.id;

            const { error: joinError } = await supabase
                .from("room_members")
                .upsert(
                    { room_id: roomId, user_id: userId },
                    { onConflict: "room_id,user_id", ignoreDuplicates: true },
                );

            if (joinError) throw joinError;

            router.replace(`/room/${roomId}`);
        } catch (err) {
            setError(formatSupabaseError(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={["bottom"]}>
            <ScreenHeader title="스터디 만들기" />

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                {/* Form Card */}
                <View style={styles.formCard}>
                    <View style={styles.field}>
                        <Text style={styles.label}>스터디 이름</Text>
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
                            placeholder="예: 매주 모의고사 함께 풀기"
                            placeholderTextColor={COLORS.textMuted}
                            style={[styles.input, styles.textarea]}
                            multiline
                        />
                    </View>

                    {error && (
                        <View style={styles.errorBox}>
                            <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    {/* Info */}
                    <View style={styles.infoRow}>
                        <Ionicons name="information-circle-outline" size={16} color={COLORS.textMuted} />
                        <Text style={styles.infoText}>
                            생성 후 참여 코드를 공유하면 친구들이 바로 입장할 수 있어요
                        </Text>
                    </View>
                </View>

                {/* Create Button */}
                <Pressable
                    onPress={handleCreate}
                    disabled={!canCreate}
                    style={({ pressed }) => [
                        styles.createBtn,
                        !canCreate && styles.createBtnDisabled,
                        pressed && canCreate && { opacity: 0.9 },
                    ]}
                >
                    <Text style={styles.createBtnText}>
                        {saving ? "생성 중..." : "스터디 만들기"}
                    </Text>
                </Pressable>
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
        padding: SPACING.xl,
        gap: SPACING.xl,
    },
    formCard: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        gap: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    field: {
        gap: 8,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textMuted,
        marginLeft: 4,
    },
    input: {
        backgroundColor: COLORS.bg,
        borderRadius: RADIUS.lg,
        paddingHorizontal: SPACING.md,
        paddingVertical: 14,
        fontSize: 15,
        color: COLORS.text,
        fontWeight: '500',
    },
    textarea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: COLORS.errorLight,
        padding: SPACING.sm,
        borderRadius: RADIUS.md,
    },
    errorText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.error,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: COLORS.textMuted,
        lineHeight: 18,
    },
    createBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.xl,
        paddingVertical: 16,
        alignItems: 'center',
    },
    createBtnDisabled: {
        opacity: 0.5,
    },
    createBtnText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '700',
    },
});
