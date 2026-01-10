import { useAuth } from "@clerk/clerk-expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSupabase } from "../../lib/supabase";
import { formatSupabaseError } from "../../lib/supabaseError";
import { COLORS } from "../../lib/theme";

export default function AddExamScreen() {
    const supabase = useSupabase();
    const router = useRouter();
    const { userId } = useAuth();
    const { id } = useLocalSearchParams<{ id: string }>();
    const roomId = Array.isArray(id) ? id[0] : id;

    const [title, setTitle] = useState("");
    const [questions, setQuestions] = useState("30");
    const [minutes, setMinutes] = useState("100");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canSave = title.trim().length > 0 &&
        parseInt(questions) > 0 &&
        parseInt(minutes) > 0 &&
        !saving &&
        !!userId;

    const handleCreate = async () => {
        if (!canSave || !roomId || !userId) {
            if (!userId) setError("모의고사를 만들려면 로그인해 주세요.");
            return;
        }
        setSaving(true);
        setError(null);

        try {
            const { error: memberError } = await supabase
                .from("room_members")
                .upsert(
                    { room_id: roomId, user_id: userId },
                    { onConflict: "room_id,user_id", ignoreDuplicates: true },
                );

            if (memberError) throw memberError;

            const { error } = await supabase
                .from("room_exams")
                .insert({
                    room_id: roomId,
                    title: title.trim(),
                    total_questions: parseInt(questions),
                    total_minutes: parseInt(minutes),
                    created_by: userId,
                });

            if (error) throw error;
            router.back();
        } catch (err) {
            setError(formatSupabaseError(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={["bottom"]}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>모의고사 추가</Text>
                    <Pressable onPress={() => router.back()}>
                        <Text style={styles.cancelText}>취소</Text>
                    </Pressable>
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>시험 제목</Text>
                    <TextInput
                        value={title}
                        onChangeText={setTitle}
                        placeholder="예: 2026-03 모의고사"
                        placeholderTextColor={COLORS.textMuted}
                        style={styles.input}
                    />

                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>총 문항 수</Text>
                            <TextInput
                                value={questions}
                                onChangeText={setQuestions}
                                placeholder="30"
                                keyboardType="number-pad"
                                placeholderTextColor={COLORS.textMuted}
                                style={styles.input}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>제한 시간(분)</Text>
                            <TextInput
                                value={minutes}
                                onChangeText={setMinutes}
                                placeholder="100"
                                keyboardType="number-pad"
                                placeholderTextColor={COLORS.textMuted}
                                style={styles.input}
                            />
                        </View>
                    </View>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <Pressable
                        onPress={handleCreate}
                        disabled={!canSave}
                        style={({ pressed }) => [
                            styles.primaryBtn,
                            !canSave && { opacity: 0.5 },
                            pressed && canSave && { opacity: 0.9 },
                        ]}
                    >
                        <Text style={styles.primaryBtnText}>{saving ? "추가 중..." : "시험 추가"}</Text>
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
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: "800",
        color: COLORS.text,
    },
    cancelText: {
        fontSize: 16,
        color: COLORS.primary,
        fontWeight: "600",
    },
    card: {
        backgroundColor: COLORS.surface,
        padding: 20,
        borderRadius: 20,
        gap: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    label: {
        fontSize: 13,
        fontWeight: "700",
        color: COLORS.text,
        marginBottom: 6,
    },
    input: {
        backgroundColor: COLORS.bg,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        color: COLORS.text,
    },
    row: {
        flexDirection: "row",
        gap: 12,
    },
    primaryBtn: {
        backgroundColor: COLORS.primary,
        padding: 16,
        borderRadius: 14,
        alignItems: "center",
        marginTop: 8,
    },
    primaryBtnText: {
        color: COLORS.white,
        fontWeight: "800",
        fontSize: 16,
    },
    errorText: {
        color: COLORS.error,
        fontSize: 12,
        fontWeight: "600",
    },
});
