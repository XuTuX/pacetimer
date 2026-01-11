import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useGlobalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { useAppStore } from "../../lib/store";
import { useSupabase } from "../../lib/supabase";
import { formatSupabaseError } from "../../lib/supabaseError";
import { COLORS } from "../../lib/theme";

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
            const finalTitle = subject ? `[${subject.name}] ${title.trim()}` : title.trim();

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
                    <View style={styles.formContainer}>
                        <View style={styles.headerInfo}>
                            <Text style={styles.headerTitle}>새 모의고사 등록</Text>
                            <Text style={styles.headerSubtitle}>룸 멤버들과 공유할 시험 정보를 입력해 주세요.</Text>
                        </View>

                        {/* Subject Selection (Unified Picker) */}
                        <View style={styles.fieldSection}>
                            <View style={styles.fieldHeader}>
                                <Ionicons name="library" size={18} color={COLORS.primary} />
                                <Text style={styles.fieldLabel}>과목</Text>
                            </View>
                            <Pressable
                                style={[styles.modernInput, isPickerOpen && styles.modernInputActive]}
                                onPress={() => setIsPickerOpen(true)}
                            >
                                <Text style={[styles.modernValue, !selectedSubjectId && styles.placeholderText]}>
                                    {activeSubjects.find(s => s.id === selectedSubjectId)?.name || "과목 선택"}
                                </Text>
                                <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
                            </Pressable>
                        </View>

                        {/* Title Input */}
                        <View style={styles.fieldSection}>
                            <View style={styles.fieldHeader}>
                                <Ionicons name="bookmark" size={18} color={COLORS.primary} />
                                <Text style={styles.fieldLabel}>시험 제목</Text>
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
                                    <Text style={styles.fieldLabel}>문항 수</Text>
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
                                    <Text style={styles.unitText}>문항</Text>
                                </View>
                            </View>

                            <View style={[styles.fieldSection, { flex: 1 }]}>
                                <View style={styles.fieldHeader}>
                                    <Ionicons name="time" size={18} color={COLORS.primary} />
                                    <Text style={styles.fieldLabel}>제한 시간</Text>
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
                                    <Text style={styles.unitText}>분</Text>
                                </View>
                            </View>
                        </View>

                        {error ? (
                            <View style={styles.errorAlert}>
                                <Ionicons name="warning" size={16} color={COLORS.error} />
                                <Text style={styles.errorAlertText}>{error}</Text>
                            </View>
                        ) : null}

                        <View style={styles.tipBox}>
                            <View style={styles.tipIcon}>
                                <Ionicons name="bulb" size={14} color={COLORS.white} />
                            </View>
                            <Text style={styles.tipText}>
                                생성 후 모든 멤버의 Race 탭에 바로 표시됩니다.
                            </Text>
                        </View>
                    </View>
                </ScrollView>

                {/* Bottom Action Bar */}
                <View style={styles.bottomBar}>
                    <Pressable
                        onPress={handleCreate}
                        disabled={!canSave}
                        style={({ pressed }) => [
                            styles.primaryBtn,
                            !canSave && styles.primaryBtnDisabled,
                            pressed && canSave && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                        ]}
                    >
                        <LinearGradient
                            colors={canSave ? [COLORS.primary, '#00C88C'] : [COLORS.border, COLORS.border]}
                            style={styles.primaryBtnGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.primaryBtnText}>
                                {saving ? "등록 중..." : "모의고사 만들기"}
                            </Text>
                            {!saving && <Ionicons name="chevron-forward" size={20} color={COLORS.white} />}
                        </LinearGradient>
                    </Pressable>
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
                        <View style={styles.pickerCard}>
                            <View style={styles.pickerHeader}>
                                <Text style={styles.pickerTitle}>과목 선택</Text>
                                <Pressable
                                    onPress={() => {
                                        setIsPickerOpen(false);
                                        setEditingSubjectId(null);
                                        setNewSubjectName("");
                                    }}
                                    style={styles.pickerCloseBtn}
                                >
                                    <Ionicons name="close" size={18} color={COLORS.textMuted} />
                                </Pressable>
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
                                                    <Text style={[styles.pickerItemText, selectedSubjectId === s.id && styles.selectedItemText]}>
                                                        {s.name}
                                                    </Text>
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
                        </View>
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
        paddingTop: 12,
        paddingBottom: 20,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    formContainer: {
        paddingHorizontal: 20,
        gap: 24,
    },
    headerInfo: {
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: COLORS.text,
        letterSpacing: -0.8,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: COLORS.textMuted,
        fontWeight: '500',
    },
    fieldSection: {
        gap: 12,
    },
    fieldHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingLeft: 4,
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '800',
        color: COLORS.text,
    },
    modernInput: {
        height: 60,
        backgroundColor: COLORS.white,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
    },
    modernInputActive: {
        borderColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 2,
    },
    modernValue: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '700',
    },
    placeholderText: {
        color: COLORS.textMuted,
        fontWeight: '500',
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '700',
        height: '100%',
    },
    unitText: {
        fontSize: 14,
        fontWeight: '800',
        color: COLORS.textMuted,
        marginLeft: 8,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 16,
    },
    errorAlert: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FFF5F5',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 0, 0, 0.05)',
    },
    errorAlertText: {
        fontSize: 13,
        color: COLORS.error,
        fontWeight: '700',
    },
    tipBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#F8F9FA',
        padding: 16,
        borderRadius: 20,
    },
    tipIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tipText: {
        flex: 1,
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: '700',
        lineHeight: 18,
    },
    bottomBar: {
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 0 : 20,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    primaryBtn: {
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
    },
    primaryBtnDisabled: {
        opacity: 0.5,
    },
    primaryBtnGradient: {
        height: 64,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    primaryBtnText: {
        fontSize: 18,
        fontWeight: '900',
        color: COLORS.white,
    },
    // Popover / Picker Styling
    popoverOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        zIndex: 5000,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    popoverBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    pickerCard: {
        width: '100%',
        maxWidth: 300,
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderRadius: 36,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.12,
        shadowRadius: 40,
        elevation: 15,
        overflow: 'hidden',
        paddingBottom: 20,
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 16,
    },
    pickerTitle: {
        fontSize: 17,
        fontWeight: '900',
        color: COLORS.text,
        letterSpacing: -0.5,
    },
    pickerCloseBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pickerScroll: {
        maxHeight: 350,
        paddingHorizontal: 16,
    },
    pickerItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
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
    pickerItemText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    selectedItemText: {
        color: COLORS.primary,
        fontWeight: '900',
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
        paddingHorizontal: 12,
        marginTop: 4,
    },
    addIconCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
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
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
