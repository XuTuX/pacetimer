import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useGlobalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SubjectSelector from "../../../components/SubjectSelector";
import { Button } from "../../../components/ui/Button";
import { ScreenHeader } from "../../../components/ui/ScreenHeader";
import { useAppStore } from "../../../lib/store";
import { useSupabase } from "../../../lib/supabase";
import { formatSupabaseError } from "../../../lib/supabaseError";
import { COLORS, RADIUS, SPACING } from "../../../lib/theme";

export default function AddExamScreen() {
    const supabase = useSupabase();
    const router = useRouter();
    const { userId } = useAuth();
    const { id } = useGlobalSearchParams<{ id: string }>();
    const roomId = Array.isArray(id) ? id[0] : id;

    // App Store (For referencing subjects and CRUD)
    const {
        subjects,
        addSubject,
        updateSubject,
        deleteSubject,
        activeSubjectId // We can default to this, or start null
    } = useAppStore();

    // Local State
    const [title, setTitle] = useState("");
    const [questions, setQuestions] = useState("30");
    const [minutes, setMinutes] = useState("100");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Subject Selector State
    // We use local state for the selected ID for *this* exam
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
        activeSubjectId && subjects.find(s => s.id === activeSubjectId) ? activeSubjectId : (subjects[0]?.id || null)
    );
    const [isSubjectModalVisible, setSubjectModalVisible] = useState(false);

    const canSave = title.trim().length > 0 &&
        parseInt(questions) > 0 &&
        parseInt(minutes) > 0 &&
        !!selectedSubjectId &&
        !saving &&
        !!userId;

    // Time/Question Adjusters
    const adjustTime = (delta: number) => {
        setMinutes(prev => {
            const next = Math.max(1, (parseInt(prev) || 0) + delta);
            return next.toString();
        });
    };

    const adjustQuestions = (delta: number) => {
        setQuestions(prev => {
            const next = Math.max(10, (parseInt(prev) || 0) + delta);
            return next.toString();
        });
    };

    const handleCreate = async () => {
        if (!canSave || !roomId || roomId === 'undefined' || !userId) {
            if (!userId) setError("모의고사를 만들려면 로그인해 주세요.");
            else if (!selectedSubjectId) setError("과목을 선택해주세요.");
            else if (!roomId) setError("스터디 정보를 찾을 수 없습니다.");
            return;
        }
        setSaving(true);
        setError(null);

        try {
            // Ensure member exists
            const { error: memberError } = await supabase
                .from("room_members")
                .upsert(
                    { room_id: roomId, user_id: userId },
                    { onConflict: "room_id,user_id", ignoreDuplicates: true },
                );

            if (memberError) throw memberError;

            const subject = subjects.find(s => s.id === selectedSubjectId);
            const finalTitle = subject ? `${subject.name} • ${title.trim()}` : title.trim();

            const { error } = await supabase
                .from("room_exams")
                .insert({
                    room_id: roomId,
                    title: finalTitle,
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
                title="새 모의고사"
                showBack={false}
                rightElement={
                    <Button
                        variant="ghost"
                        size="sm"
                        icon="close"
                        onPress={() => router.back()}
                        style={styles.closeBtn}
                    />
                }
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <View style={styles.formContainer}>
                    {/* 1. Subject Selector */}
                    <View style={styles.fieldSection}>
                        <Text style={styles.label}>과목</Text>
                        <SubjectSelector
                            subjects={subjects}
                            activeSubjectId={selectedSubjectId}
                            setActiveSubjectId={setSelectedSubjectId}
                            addSubject={addSubject}
                            updateSubject={updateSubject}
                            deleteSubject={deleteSubject}
                            isModalVisible={isSubjectModalVisible}
                            setModalVisible={setSubjectModalVisible}
                        />
                    </View>

                    {/* 2. Exam Title */}
                    <View style={styles.fieldSection}>
                        <Text style={styles.label}>시험 제목</Text>
                        <View style={styles.inputCard}>
                            <TextInput
                                value={title}
                                onChangeText={setTitle}
                                placeholder="예: 2026학년도 6월 모의평가"
                                placeholderTextColor={COLORS.textMuted}
                                style={styles.textInput}
                            />
                        </View>
                    </View>

                    {/* 3 & 4. Stats Row (Questions & Time) */}
                    <View style={styles.statsRow}>
                        <View style={[styles.fieldSection, { flex: 1 }]}>
                            <Text style={styles.label}>문항 수</Text>
                            <View style={styles.compactStepperCard}>
                                <View style={styles.inputGroup}>
                                    <TextInput
                                        style={styles.compactNumberInput}
                                        value={questions}
                                        onChangeText={setQuestions}
                                        keyboardType="number-pad"
                                    />
                                    <Text style={styles.unit}>문항</Text>
                                </View>
                                <View style={styles.compactStepper}>
                                    <TouchableOpacity style={styles.compactStepBtn} onPress={() => adjustQuestions(-5)}>
                                        <Ionicons name="remove" size={18} color={COLORS.text} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.compactStepBtn} onPress={() => adjustQuestions(5)}>
                                        <Ionicons name="add" size={18} color={COLORS.text} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        <View style={[styles.fieldSection, { flex: 1 }]}>
                            <Text style={styles.label}>제한 시간</Text>
                            <View style={styles.compactStepperCard}>
                                <View style={styles.inputGroup}>
                                    <TextInput
                                        style={styles.compactNumberInput}
                                        value={minutes}
                                        onChangeText={setMinutes}
                                        keyboardType="number-pad"
                                    />
                                    <Text style={styles.unit}>분</Text>
                                </View>
                                <View style={styles.compactStepper}>
                                    <TouchableOpacity style={styles.compactStepBtn} onPress={() => adjustTime(-10)}>
                                        <Ionicons name="remove" size={18} color={COLORS.text} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.compactStepBtn} onPress={() => adjustTime(10)}>
                                        <Ionicons name="add" size={18} color={COLORS.text} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>

                    {error && (
                        <View style={styles.errorAlert}>
                            <Ionicons name="warning-outline" size={18} color={COLORS.error} />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                </View>

                {/* Bottom Action Bar */}
                <View style={styles.bottomBar}>
                    <Button
                        label={saving ? "등록 중..." : "모의고사 만들기"}
                        onPress={handleCreate}
                        disabled={!canSave}
                        loading={saving}
                        size="lg"
                        icon={!saving ? "chevron-forward" : undefined}
                        iconPosition="right"
                        style={styles.createBtn}
                    />
                </View>

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    closeBtn: {
        backgroundColor: COLORS.surfaceVariant,
        borderRadius: RADIUS.full,
    },
    formContainer: {
        flex: 1,
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.md,
        gap: 24,
    },
    fieldSection: {
        gap: 8,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textMuted,
        marginLeft: 4,
    },
    inputCard: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: SPACING.lg,
        height: 56,
        justifyContent: 'center',
    },
    textInput: {
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '600',
        height: '100%',
    },
    // Compact Stepper Styles for split row
    compactStepperCard: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 12,
        // height: 100, // Optional fixed height to match
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 2,
    },
    compactNumberInput: {
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.text,
        textAlign: 'center',
        minWidth: 32,
    },
    unit: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    compactStepper: {
        flexDirection: 'row',
        gap: 8,
    },
    compactStepBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorAlert: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.errorLight,
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
    },
    errorText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.error,
    },
    bottomBar: {
        padding: SPACING.xl,
        paddingBottom: Platform.OS === 'ios' ? 0 : SPACING.xl,
        backgroundColor: COLORS.bg, // Transparent/BG to blend? Or White
    },
    createBtn: {
        borderRadius: 24,
        height: 64,
        backgroundColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    }
});
