import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useGlobalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { useSupabase } from "../../lib/supabase";
import { formatSupabaseError } from "../../lib/supabaseError";
import { COLORS } from "../../lib/theme";

export default function AddExamScreen() {
    const supabase = useSupabase();
    const router = useRouter();
    const { userId } = useAuth();
    const { id } = useGlobalSearchParams<{ id: string }>();
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
        if (!canSave || !roomId || roomId === 'undefined' || !userId) {
            if (!userId) setError("모의고사를 만들려면 로그인해 주세요.");
            if (!roomId || roomId === 'undefined') setError("룸 정보를 찾을 수 없습니다. 다시 시도해 주세요.");
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
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <ScreenHeader
                title="시험 추가"
                onBack={() => router.back()}
                rightElement={
                    <Pressable onPress={() => router.back()} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color={COLORS.textMuted} />
                    </Pressable>
                }
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Hero Area */}
                    <LinearGradient
                        colors={[COLORS.primaryLight, 'transparent']}
                        style={styles.heroGradient}
                    >
                        <View style={styles.iconContainer}>
                            <Ionicons name="document-text" size={32} color={COLORS.primary} />
                        </View>
                        <Text style={styles.heroTitle}>어떤 시험을 진행할까요?</Text>
                        <Text style={styles.heroSub}>룸 멤버들과 함께 풀 모의고사 정보를 입력해주세요.</Text>
                    </LinearGradient>

                    <View style={styles.formCard}>
                        {/* Title Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>시험 제목</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="bookmark-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                                <TextInput
                                    value={title}
                                    onChangeText={setTitle}
                                    placeholder="예: 2026학년도 6월 모의평가"
                                    placeholderTextColor={COLORS.textMuted}
                                    style={styles.input}
                                />
                            </View>
                        </View>

                        <View style={styles.row}>
                            {/* Questions Input */}
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>총 문항 수</Text>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="list-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                                    <TextInput
                                        value={questions}
                                        onChangeText={setQuestions}
                                        placeholder="30"
                                        keyboardType="number-pad"
                                        placeholderTextColor={COLORS.textMuted}
                                        style={styles.input}
                                    />
                                </View>
                            </View>

                            {/* Minutes Input */}
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>제한 시간 (분)</Text>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="time-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
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
                        </View>

                        {error ? (
                            <View style={styles.errorBox}>
                                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
                            <Text style={styles.infoText}>
                                생성된 시험은 룸 모든 멤버에게 즉시 공유됩니다.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.actionContainer}>
                        <Pressable
                            onPress={handleCreate}
                            disabled={!canSave}
                            style={({ pressed }) => [
                                styles.submitBtn,
                                !canSave && styles.submitBtnDisabled,
                                pressed && canSave && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                            ]}
                        >
                            <LinearGradient
                                colors={canSave ? [COLORS.primary, '#00B884'] : [COLORS.border, COLORS.border]}
                                style={styles.btnGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Text style={styles.submitBtnText}>
                                    {saving ? "생성 중..." : "모의고사 만들기"}
                                </Text>
                                {!saving && <Ionicons name="arrow-forward" size={20} color={COLORS.white} />}
                            </LinearGradient>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroGradient: {
        padding: 24,
        paddingBottom: 32,
        alignItems: 'center',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 24,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    heroTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.text,
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    heroSub: {
        fontSize: 14,
        color: COLORS.textMuted,
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 20,
    },
    formCard: {
        backgroundColor: COLORS.white,
        marginHorizontal: 20,
        borderRadius: 32,
        padding: 24,
        gap: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 5,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 13,
        fontWeight: '800',
        color: COLORS.text,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bg,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 16,
        height: 56,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '600',
    },
    row: {
        flexDirection: 'row',
        gap: 16,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: COLORS.errorLight,
        padding: 12,
        borderRadius: 12,
    },
    errorText: {
        fontSize: 12,
        color: COLORS.error,
        fontWeight: '700',
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: COLORS.primaryLight,
        padding: 16,
        borderRadius: 16,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: COLORS.text,
        fontWeight: '600',
        lineHeight: 18,
    },
    actionContainer: {
        padding: 24,
        marginTop: 8,
    },
    submitBtn: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 8,
    },
    submitBtnDisabled: {
        shadowOpacity: 0,
        elevation: 0,
    },
    btnGradient: {
        height: 64,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    submitBtnText: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.white,
    },
});
