import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useGlobalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { Typography } from "../../components/ui/Typography";
import { useAppStore } from "../../lib/store";
import { useSupabase } from "../../lib/supabase";
import { formatSupabaseError } from "../../lib/supabaseError";
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from "../../lib/theme";

const SUBJECT_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#82E0AA'
];

export default function AddExamScreen() {
    const supabase = useSupabase();
    const router = useRouter();
    const { userId } = useAuth();
    const { id } = useGlobalSearchParams<{ id: string }>();
    const roomId = Array.isArray(id) ? id[0] : id;

    const { subjects, activeSubjectId } = useAppStore();

    const [title, setTitle] = useState("");
    const [questions, setQuestions] = useState("30");
    const [minutes, setMinutes] = useState("100");
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(activeSubjectId || (subjects.length > 0 ? subjects[0].id : null));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    // Management states (Add)
    const [newSubjectName, setNewSubjectName] = useState("");

    const activeSubjects = subjects.filter(s => !s.isArchived);

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
                title="시험 추가"
                onBack={() => router.back()}
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
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.formContainer}>
                        <View style={styles.headerInfo}>
                            <Typography.H2 bold>새 모의고사 등록</Typography.H2>
                            <Typography.Body2 color={COLORS.textMuted} style={{ marginTop: 4 }}>룸 멤버들과 공유할 시험 정보를 입력해 주세요.</Typography.Body2>
                        </View>

                        {/* Subject Selection (Unified Picker) */}
                        <View style={styles.fieldSection}>
                            <View style={styles.fieldHeader}>
                                <Ionicons name="library" size={18} color={COLORS.primary} />
                                <Typography.Subtitle2 bold>과목</Typography.Subtitle2>
                            </View>
                            <Pressable
                                style={[styles.modernInput, isPickerOpen && styles.modernInputActive]}
                                onPress={() => setIsPickerOpen(!isPickerOpen)}
                            >
                                <View style={styles.labelLeft}>
                                    <View style={[
                                        styles.colorDot,
                                        {
                                            backgroundColor: selectedSubjectId
                                                ? SUBJECT_COLORS[Math.max(0, activeSubjects.findIndex(s => s.id === selectedSubjectId)) % SUBJECT_COLORS.length]
                                                : COLORS.border
                                        }
                                    ]} />
                                    <Typography.Body1 bold style={[styles.modernValue, !selectedSubjectId && { color: COLORS.textMuted }]}>
                                        {activeSubjects.find(s => s.id === selectedSubjectId)?.name || "과목 선택"}
                                    </Typography.Body1>
                                </View>
                                <Ionicons name={isPickerOpen ? "chevron-up" : "chevron-down"} size={18} color={COLORS.textMuted} />
                            </Pressable>

                            {isPickerOpen && (
                                <View style={styles.dropdownContainer}>
                                    <View style={styles.dropdownList}>
                                        <ScrollView
                                            style={styles.dropdownScroll}
                                            nestedScrollEnabled={true}
                                            showsVerticalScrollIndicator={true}
                                        >
                                            {activeSubjects.length > 0 ? (
                                                activeSubjects.map((s, idx) => (
                                                    <Pressable
                                                        key={s.id}
                                                        style={[
                                                            styles.dropdownItem,
                                                            selectedSubjectId === s.id && styles.dropdownItemActive
                                                        ]}
                                                        onPress={() => {
                                                            setSelectedSubjectId(s.id);
                                                            setIsPickerOpen(false);
                                                        }}
                                                    >
                                                        <View style={styles.labelLeft}>
                                                            <View style={[styles.colorDot, { backgroundColor: SUBJECT_COLORS[idx % SUBJECT_COLORS.length] }]} />
                                                            <Typography.Body2 bold color={selectedSubjectId === s.id ? COLORS.primary : COLORS.text}>
                                                                {s.name}
                                                            </Typography.Body2>
                                                        </View>
                                                        {selectedSubjectId === s.id && <Ionicons name="checkmark" size={18} color={COLORS.primary} />}
                                                    </Pressable>
                                                ))
                                            ) : (
                                                <View style={styles.emptySubjects}>
                                                    <Typography.Body2 color={COLORS.textMuted}>등록된 과목이 없습니다.</Typography.Body2>
                                                </View>
                                            )}
                                        </ScrollView>

                                        {/* Dropdown Footer: Add Subject */}
                                        <View style={styles.dropdownFooter}>
                                            <TextInput
                                                value={newSubjectName}
                                                onChangeText={setNewSubjectName}
                                                placeholder="새 과목 추가..."
                                                placeholderTextColor={COLORS.textMuted}
                                                style={styles.compactAddInput}
                                                onSubmitEditing={() => {
                                                    if (newSubjectName.trim()) {
                                                        useAppStore.getState().addSubject(newSubjectName.trim());
                                                        setNewSubjectName("");
                                                    }
                                                }}
                                            />
                                            <Pressable
                                                onPress={() => {
                                                    if (newSubjectName.trim()) {
                                                        useAppStore.getState().addSubject(newSubjectName.trim());
                                                        setNewSubjectName("");
                                                    }
                                                }}
                                                disabled={!newSubjectName.trim()}
                                                style={[styles.compactAddBtn, !newSubjectName.trim() && { opacity: 0.5 }]}
                                            >
                                                <Ionicons name="add" size={20} color={COLORS.white} />
                                            </Pressable>
                                        </View>
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Title Input */}
                        <View style={styles.fieldSection}>
                            <View style={styles.fieldHeader}>
                                <Ionicons name="bookmark" size={18} color={COLORS.primary} />
                                <Typography.Subtitle2 bold>시험 제목</Typography.Subtitle2>
                            </View>
                            <View style={styles.modernInput}>
                                <TextInput
                                    value={title}
                                    onChangeText={setTitle}
                                    placeholder="예: 2026학년도 6월 모의평가"
                                    placeholderTextColor={COLORS.textMuted}
                                    style={styles.textInput}
                                />
                            </View>
                        </View>

                        {/* Stats Row */}
                        <View style={styles.statsRow}>
                            <View style={[styles.fieldSection, { flex: 1 }]}>
                                <View style={styles.fieldHeader}>
                                    <Ionicons name="list" size={18} color={COLORS.primary} />
                                    <Typography.Subtitle2 bold>문항 수</Typography.Subtitle2>
                                </View>
                                <View style={styles.modernInput}>
                                    <TextInput
                                        value={questions}
                                        onChangeText={setQuestions}
                                        placeholder="30"
                                        keyboardType="number-pad"
                                        placeholderTextColor={COLORS.textMuted}
                                        style={styles.textInput}
                                    />
                                    <Typography.Label bold color={COLORS.textMuted}>문항</Typography.Label>
                                </View>
                            </View>

                            <View style={[styles.fieldSection, { flex: 1 }]}>
                                <View style={styles.fieldHeader}>
                                    <Ionicons name="time" size={18} color={COLORS.primary} />
                                    <Typography.Subtitle2 bold>제한 시간</Typography.Subtitle2>
                                </View>
                                <View style={styles.modernInput}>
                                    <TextInput
                                        value={minutes}
                                        onChangeText={setMinutes}
                                        placeholder="100"
                                        keyboardType="number-pad"
                                        placeholderTextColor={COLORS.textMuted}
                                        style={styles.textInput}
                                    />
                                    <Typography.Label bold color={COLORS.textMuted}>분</Typography.Label>
                                </View>
                            </View>
                        </View>

                        {error ? (
                            <Card variant="flat" padding="md" radius="xl" style={styles.errorAlert}>
                                <Ionicons name="warning-outline" size={18} color={COLORS.error} />
                                <Typography.Body2 bold color={COLORS.error}>{error}</Typography.Body2>
                            </Card>
                        ) : null}

                        <Card variant="flat" padding="md" radius="xl" style={styles.tipBox}>
                            <View style={styles.tipIcon}>
                                <Ionicons name="bulb" size={14} color={COLORS.white} />
                            </View>
                            <Typography.Caption bold color={COLORS.textMuted} style={{ flex: 1 }}>
                                생성 후 모든 멤버의 Race 탭에 바로 표시됩니다.
                            </Typography.Caption>
                        </Card>
                    </View>
                </ScrollView>

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
    scrollContent: {
        paddingTop: SPACING.md,
        paddingBottom: SPACING.xl,
    },
    closeBtn: {
        backgroundColor: COLORS.surfaceVariant,
        borderRadius: RADIUS.full,
    },
    formContainer: {
        paddingHorizontal: SPACING.xl,
        gap: SPACING.xl,
    },
    headerInfo: {
        marginBottom: SPACING.sm,
    },
    fieldSection: {
        gap: SPACING.sm,
    },
    fieldHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingLeft: 4,
    },
    modernInput: {
        height: 60,
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.xl,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
    },
    modernInputActive: {
        borderColor: COLORS.primary,
        ...SHADOWS.small,
    },
    modernValue: {
        flex: 1,
    },
    textInput: {
        flex: 1,
        fontSize: TYPOGRAPHY.body1.fontSize,
        color: COLORS.text,
        fontWeight: '700',
        height: '100%',
    },
    statsRow: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    errorAlert: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.errorLight,
    },
    tipBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        backgroundColor: COLORS.surfaceVariant,
    },
    tipIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bottomBar: {
        padding: SPACING.xl,
        paddingBottom: Platform.OS === 'ios' ? 0 : SPACING.xl,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    // Inline Dropdown Styling
    dropdownContainer: {
        marginTop: 4,
        zIndex: 1000,
    },
    dropdownList: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.xl,
        borderWidth: 1.5,
        borderColor: COLORS.primaryLight,
        overflow: 'hidden',
        ...SHADOWS.small,
    },
    dropdownScroll: {
        maxHeight: 240,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.03)',
    },
    dropdownItemActive: {
        backgroundColor: COLORS.primary + '08',
    },
    labelLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    colorDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    emptySubjects: {
        padding: SPACING.xl,
        alignItems: 'center',
    },
    dropdownFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.sm,
        backgroundColor: COLORS.surfaceVariant,
        gap: SPACING.sm,
    },
    compactAddInput: {
        flex: 1,
        height: 40,
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.md,
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    compactAddBtn: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
