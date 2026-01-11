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
import { COLORS, RADIUS, SHADOWS, SPACING } from "../../lib/theme";
import { useAppStore } from "../../lib/store";
import { useSupabase } from "../../lib/supabase";
import { formatSupabaseError } from "../../lib/supabaseError";

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

    // Management states (Add/Edit)
    const [newSubjectName, setNewSubjectName] = useState("");
    const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
    const [editingSubjectName, setEditingSubjectName] = useState("");

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
                        leftIcon="close"
                        onPress={() => router.back()}
                        style={styles.closeBtn}
                        fullWidth={false}
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
                                onPress={() => setIsPickerOpen(true)}
                            >
                                <Typography.Body1 bold style={[styles.modernValue, !selectedSubjectId && { color: COLORS.textMuted }]}>
                                    {activeSubjects.find(s => s.id === selectedSubjectId)?.name || "과목 선택"}
                                </Typography.Body1>
                                <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
                            </Pressable>
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
                                <Ionicons name="warning" size={16} color={COLORS.error} />
                                <Typography.Label bold color={COLORS.error}>{error}</Typography.Label>
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
                        rightIcon={!saving ? "chevron-forward" : undefined}
                    />
                </View>

                {/* Unified Subject Picker & Manager Popover */}
                {isPickerOpen && (
                    <View style={styles.popoverOverlay}>
                        <Pressable
                            style={styles.popoverBackdrop}
                            onPress={() => {
                                setIsPickerOpen(false);
                                setEditingSubjectId(null);
                                setNewSubjectName("");
                            }}
                        />
                        <Card padding="xl" radius="xxl" style={styles.pickerCard}>
                            <View style={styles.pickerHeader}>
                                <Typography.Subtitle1 bold>과목 선택</Typography.Subtitle1>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    leftIcon="close"
                                    onPress={() => {
                                        setIsPickerOpen(false);
                                        setEditingSubjectId(null);
                                        setNewSubjectName("");
                                    }}
                                    style={styles.pickerCloseBtn}
                                    fullWidth={false}
                                />
                            </View>

                            <ScrollView
                                style={styles.pickerScroll}
                                showsVerticalScrollIndicator={false}
                                bounces={true}
                                keyboardShouldPersistTaps="handled"
                            >
                                {activeSubjects.map((s) => (
                                    <View key={s.id} style={styles.pickerItemRow}>
                                        {editingSubjectId === s.id ? (
                                            <View style={styles.editRow}>
                                                <TextInput
                                                    value={editingSubjectName}
                                                    onChangeText={setEditingSubjectName}
                                                    autoFocus
                                                    style={styles.editInput}
                                                    onSubmitEditing={() => {
                                                        if (editingSubjectName.trim()) {
                                                            useAppStore.getState().updateSubject(s.id, { name: editingSubjectName.trim() });
                                                            setEditingSubjectId(null);
                                                        }
                                                    }}
                                                />
                                                <Pressable
                                                    onPress={() => {
                                                        if (editingSubjectName.trim()) {
                                                            useAppStore.getState().updateSubject(s.id, { name: editingSubjectName.trim() });
                                                            setEditingSubjectId(null);
                                                        }
                                                    }}
                                                    style={styles.saveBtn}
                                                >
                                                    <Ionicons name="checkmark" size={16} color={COLORS.primary} />
                                                </Pressable>
                                            </View>
                                        ) : (
                                            <>
                                                <Pressable
                                                    style={styles.pickerItemLabel}
                                                    onPress={() => {
                                                        setSelectedSubjectId(s.id);
                                                        setIsPickerOpen(false);
                                                    }}
                                                >
                                                    <Typography.Body1 bold color={selectedSubjectId === s.id ? COLORS.primary : COLORS.text}>
                                                        {s.name}
                                                    </Typography.Body1>
                                                    {selectedSubjectId === s.id && <Ionicons name="checkmark" size={18} color={COLORS.primary} />}
                                                </Pressable>

                                                <View style={styles.pickerItemActions}>
                                                    <Pressable
                                                        onPress={() => {
                                                            setEditingSubjectId(s.id);
                                                            setEditingSubjectName(s.name);
                                                        }}
                                                        style={styles.itemActionBtn}
                                                    >
                                                        <Ionicons name="create-outline" size={16} color={COLORS.textMuted} />
                                                    </Pressable>
                                                    <Pressable
                                                        onPress={() => useAppStore.getState().deleteSubject(s.id)}
                                                        style={styles.itemActionBtn}
                                                    >
                                                        <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                                                    </Pressable>
                                                </View>
                                            </>
                                        )}
                                    </View>
                                ))}

                                {/* Inline Add Row */}
                                <View style={styles.addInlineRow}>
                                    <View style={styles.addIconCircle}>
                                        <Ionicons name="add" size={14} color={COLORS.textMuted} />
                                    </View>
                                    <TextInput
                                        value={newSubjectName}
                                        onChangeText={setNewSubjectName}
                                        placeholder="새 과목 추가..."
                                        placeholderTextColor={COLORS.textMuted}
                                        style={styles.addInput}
                                        onSubmitEditing={() => {
                                            if (newSubjectName.trim()) {
                                                useAppStore.getState().addSubject(newSubjectName.trim());
                                                setNewSubjectName("");
                                            }
                                        }}
                                    />
                                    {newSubjectName.trim() ? (
                                        <Pressable
                                            onPress={() => {
                                                useAppStore.getState().addSubject(newSubjectName.trim());
                                                setNewSubjectName("");
                                            }}
                                            style={styles.addSubmitBtn}
                                        >
                                            <Ionicons name="arrow-up" size={16} color={COLORS.white} />
                                        </Pressable>
                                    ) : null}
                                </View>
                            </ScrollView>
                        </Card>
                    </View>
                )}
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
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        width: 36,
        paddingHorizontal: 0,
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
        fontSize: 16,
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
    // Popover / Picker Styling
    popoverOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        zIndex: 5000,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    popoverBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    pickerCard: {
        width: '100%',
        maxWidth: 320,
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        maxHeight: '80%',
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    pickerCloseBtn: {
        width: 28,
        height: 28,
        backgroundColor: COLORS.surfaceVariant,
        paddingHorizontal: 0,
    },
    pickerScroll: {
        paddingHorizontal: 0,
    },
    pickerItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.03)',
    },
    pickerItemLabel: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginRight: 8,
    },
    pickerItemActions: {
        flexDirection: 'row',
        gap: 4,
    },
    itemActionBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addInlineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        marginTop: 4,
    },
    addIconCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    addInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        height: 40,
    },
    addSubmitBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.text,
        alignItems: 'center',
        justifyContent: 'center',
    },
    editRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    editInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        borderBottomWidth: 1.5,
        borderBottomColor: COLORS.primary,
        padding: 0,
        height: 32,
    },
    saveBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: COLORS.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
