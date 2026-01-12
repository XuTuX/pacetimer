import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ThemedText } from '../../components/ui/ThemedText';
import { useAppStore } from '../../lib/store';
import { COLORS, RADIUS, SHADOWS } from '../../lib/theme';

export default function SubjectManageScreen() {
    const router = useRouter();
    const { subjects, addSubject, updateSubject, deleteSubject } = useAppStore();
    const [newSubjectName, setNewSubjectName] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
    const [subjectToDelete, setSubjectToDelete] = useState<string | null>(null);

    const activeSubjects = subjects
        .filter(s => !s.isArchived)
        .sort((a, b) => a.order - b.order);

    const handleAdd = () => {
        const name = newSubjectName.trim();
        if (!name) return;
        addSubject(name);
        setNewSubjectName('');
        setIsAdding(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleDelete = (id: string) => {
        setSubjectToDelete(id);
        setIsDeleteModalVisible(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const confirmDelete = () => {
        if (subjectToDelete) {
            deleteSubject(subjectToDelete);
            setSubjectToDelete(null);
            setIsDeleteModalVisible(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    const saveEdit = () => {
        if (!editingId || !editName.trim()) {
            setEditingId(null);
            return;
        }
        updateSubject(editingId, { name: editName.trim() });
        setEditingId(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    return (
        <View style={styles.container}>
            <ScreenHeader
                title=""
                onBack={() => router.back()}
                rightElement={
                    <TouchableOpacity
                        onPress={() => {
                            setIsAdding(!isAdding);
                            Haptics.selectionAsync();
                        }}
                        style={styles.addIconBtn}
                    >
                        <Ionicons name={isAdding ? "close" : "add"} size={28} color={COLORS.primary} />
                    </TouchableOpacity>
                }
            />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.content}>
                <View style={styles.card}>
                    <ThemedText style={styles.cardTitle}>과목 관리</ThemedText>

                    <FlatList
                        data={activeSubjects}
                        keyExtractor={item => item.id}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.list}
                        renderItem={({ item }) => (
                            <View style={[styles.item, editingId === item.id && styles.itemEditing]}>
                                <View style={styles.itemDot} />
                                {editingId === item.id ? (
                                    <TextInput
                                        style={styles.editInput}
                                        value={editName}
                                        onChangeText={setEditName}
                                        autoFocus
                                        onBlur={saveEdit}
                                        onSubmitEditing={saveEdit}
                                        returnKeyType="done"
                                    />
                                ) : (
                                    <TouchableOpacity
                                        style={styles.nameContainer}
                                        onPress={() => {
                                            setEditingId(item.id);
                                            setEditName(item.name);
                                            Haptics.selectionAsync();
                                        }}
                                    >
                                        <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                                    <Ionicons name="trash-outline" size={18} color={COLORS.textMuted} />
                                </TouchableOpacity>
                            </View>
                        )}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <ThemedText color={COLORS.textMuted} variant="caption">과목이 없습니다.</ThemedText>
                            </View>
                        }
                    />
                </View>
            </KeyboardAvoidingView>

            {/* 과목 추가 모달 */}
            <Modal
                visible={isAdding}
                transparent
                animationType="fade"
                onRequestClose={() => setIsAdding(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setIsAdding(false)}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.modalContentWrapper}
                    >
                        <Pressable style={styles.addModalCard} onPress={e => e.stopPropagation()}>
                            <ThemedText style={styles.modalTitle}>새 과목 추가</ThemedText>
                            <View style={styles.modalInputRow}>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="과목 이름을 입력하세요"
                                    placeholderTextColor={COLORS.textMuted}
                                    value={newSubjectName}
                                    onChangeText={setNewSubjectName}
                                    autoFocus
                                    onSubmitEditing={handleAdd}
                                    returnKeyType="done"
                                />
                                <TouchableOpacity onPress={handleAdd} style={styles.modalConfirmBtn}>
                                    <Ionicons name="add" size={24} color={COLORS.white} />
                                </TouchableOpacity>
                            </View>
                        </Pressable>
                    </KeyboardAvoidingView>
                </Pressable>
            </Modal>

            {/* 삭제 확인 모달 */}
            <Modal
                visible={isDeleteModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsDeleteModalVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setIsDeleteModalVisible(false)}>
                    <View style={styles.deleteModalCard}>
                        <View style={styles.deleteIconBox}>
                            <Ionicons name="trash" size={32} color={COLORS.error} />
                        </View>
                        <ThemedText style={styles.deleteTitle}>과목 삭제</ThemedText>
                        <ThemedText style={styles.deleteDescription}>
                            이 과목을 삭제하시겠습니까? 관련 데이터가 모두 삭제됩니다.
                        </ThemedText>
                        <View style={styles.deleteActionRow}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => setIsDeleteModalVisible(false)}
                            >
                                <ThemedText style={styles.cancelBtnText}>취소</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmDeleteBtn}
                                onPress={confirmDelete}
                            >
                                <ThemedText style={styles.confirmDeleteBtnText}>삭제</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    addIconBtn: {
        padding: 4,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 12,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 40,
        padding: 30,
        ...SHADOWS.medium,
        maxHeight: '85%',
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 24,
        color: COLORS.text,
        textAlign: 'center',
    },
    list: {
        paddingBottom: 20,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
    },
    itemEditing: {
        backgroundColor: COLORS.bg,
        borderRadius: RADIUS.md,
        paddingHorizontal: 8,
    },
    itemDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.primary,
        marginRight: 12,
    },
    nameContainer: {
        flex: 1,
    },
    itemName: {
        fontSize: 17,
        fontWeight: '600',
        color: COLORS.text,
    },
    editInput: {
        flex: 1,
        fontSize: 17,
        fontWeight: '600',
        color: COLORS.primaryDark,
        padding: 0,
    },
    deleteBtn: {
        padding: 8,
    },
    separator: {
        height: 1,
        backgroundColor: COLORS.border,
        opacity: 0.3,
    },
    emptyContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContentWrapper: {
        width: '100%',
        alignItems: 'center',
    },
    addModalCard: {
        width: '100%',
        backgroundColor: COLORS.surface,
        borderRadius: 32,
        padding: 24,
        ...SHADOWS.heavy,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 20,
        textAlign: 'center',
    },
    modalInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    modalInput: {
        flex: 1,
        height: 56,
        backgroundColor: COLORS.bg,
        borderRadius: RADIUS.xl,
        paddingHorizontal: 20,
        fontSize: 16,
        color: COLORS.text,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    modalConfirmBtn: {
        width: 56,
        height: 56,
        borderRadius: RADIUS.xl,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.small,
    },
    // Delete Modal Styles
    deleteModalCard: {
        width: '85%',
        backgroundColor: COLORS.surface,
        borderRadius: 32,
        padding: 30,
        alignItems: 'center',
        ...SHADOWS.heavy,
    },
    deleteIconBox: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.errorLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    deleteTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 12,
    },
    deleteDescription: {
        fontSize: 15,
        color: COLORS.textMuted,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 30,
    },
    deleteActionRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    cancelBtn: {
        flex: 1,
        height: 56,
        borderRadius: RADIUS.xl,
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    confirmDeleteBtn: {
        flex: 1,
        height: 56,
        borderRadius: RADIUS.xl,
        backgroundColor: COLORS.error,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.small,
    },
    confirmDeleteBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.white,
    },
});
