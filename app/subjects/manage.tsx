import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    LayoutAnimation,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { ResponsiveContainer } from '../../components/ui/Layout';
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

    // 부드러운 리스트 변화를 위한 애니메이션
    const animate = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    };

    const handleAdd = () => {
        const name = newSubjectName.trim();
        if (!name) return;

        animate();
        addSubject(name);
        setNewSubjectName('');
        setIsAdding(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleDeleteClick = (id: string) => {
        setSubjectToDelete(id);
        setIsDeleteModalVisible(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const confirmDelete = () => {
        if (subjectToDelete) {
            animate();
            deleteSubject(subjectToDelete);
            setSubjectToDelete(null);
            setIsDeleteModalVisible(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    const saveEdit = () => {
        if (!editingId) return;
        const trimmedName = editName.trim();

        if (trimmedName) {
            updateSubject(editingId, { name: trimmedName });
        }
        setEditingId(null);
        Haptics.selectionAsync();
    };

    const renderItem = useCallback(({ item }: { item: typeof subjects[0] }) => {
        const isEditing = editingId === item.id;

        return (
            <View style={[styles.item, isEditing && styles.itemEditing]}>
                {isEditing ? (
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
                        <View style={styles.itemDot} />
                        <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    onPress={() => handleDeleteClick(item.id)}
                    style={styles.deleteBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="trash-outline" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
            </View>
        );
    }, [editingId, editName]);

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="과목 관리"
                onBack={() => router.back()}
                rightElement={
                    <TouchableOpacity
                        onPress={() => {
                            setIsAdding(true);
                            Haptics.selectionAsync();
                        }}
                        style={styles.addHeaderBtn}
                    >
                        <Ionicons name="add-circle" size={32} color={COLORS.primary} />
                    </TouchableOpacity>
                }
            />

            <View style={styles.content}>
                <ResponsiveContainer withPadding={false}>
                    <FlatList
                        data={activeSubjects}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="book-outline" size={48} color={COLORS.border} />
                                <ThemedText style={styles.emptyText}>등록된 과목이 없습니다.</ThemedText>
                            </View>
                        }
                    />
                </ResponsiveContainer>
            </View>

            {/* 과목 추가 모달 */}
            <Modal visible={isAdding} transparent animationType="fade">
                <Pressable style={styles.modalOverlay} onPress={() => setIsAdding(false)}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrapper}>
                        <Pressable style={styles.addModalCard} onPress={e => e.stopPropagation()}>
                            <View style={styles.modalHeader}>
                                <ThemedText style={styles.modalTitle}>새 과목 추가</ThemedText>
                                <TouchableOpacity onPress={() => setIsAdding(false)}>
                                    <Ionicons name="close" size={24} color={COLORS.textMuted} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.modalInputWrapper}>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="과목명을 입력하세요 (예: 수학)"
                                    placeholderTextColor={COLORS.textMuted}
                                    value={newSubjectName}
                                    onChangeText={setNewSubjectName}
                                    autoFocus
                                    onSubmitEditing={handleAdd}
                                />
                                <TouchableOpacity
                                    onPress={handleAdd}
                                    style={[styles.modalAddBtn, !newSubjectName.trim() && styles.disabledBtn]}
                                    disabled={!newSubjectName.trim()}
                                >
                                    <ThemedText style={styles.modalAddBtnText}>추가</ThemedText>
                                </TouchableOpacity>
                            </View>
                        </Pressable>
                    </KeyboardAvoidingView>
                </Pressable>
            </Modal>

            {/* 삭제 확인 모달 */}
            <Modal visible={isDeleteModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.deleteModalCard}>
                        <ThemedText style={styles.deleteTitle}>과목 삭제</ThemedText>
                        <ThemedText style={styles.deleteDescription}>
                            이 과목을 삭제할까요? 관련 기록이 모두 사라집니다.
                        </ThemedText>
                        <View style={styles.deleteActionRow}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsDeleteModalVisible(false)}>
                                <ThemedText style={styles.cancelBtnText}>취소</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmDeleteBtn} onPress={confirmDelete}>
                                <ThemedText style={styles.confirmDeleteBtnText}>삭제</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    addHeaderBtn: {
        padding: 4,
    },
    content: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 64,
        paddingHorizontal: 12,
    },
    itemEditing: {
        backgroundColor: COLORS.bg,
        borderRadius: RADIUS.md,
    },
    nameContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: '100%',
    },
    itemDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.primary,
        marginRight: 16,
    },
    itemName: {
        fontSize: 17,
        fontWeight: '500',
        color: COLORS.text,
    },
    editInput: {
        flex: 1,
        fontSize: 17,
        fontWeight: '600',
        color: COLORS.primary,
        padding: 0,
    },
    deleteBtn: {
        padding: 8,
    },
    separator: {
        height: 1,
        backgroundColor: COLORS.bg,
        marginHorizontal: 12,
    },
    emptyContainer: {
        marginTop: 100,
        alignItems: 'center',
        gap: 12,
    },
    emptyText: {
        color: COLORS.textMuted,
        fontSize: 16,
    },
    // 모달 공통
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalWrapper: {
        width: '100%',
    },
    addModalCard: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 24,
        ...SHADOWS.heavy,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    modalInputWrapper: {
        gap: 12,
    },
    modalInput: {
        height: 54,
        backgroundColor: COLORS.bg,
        borderRadius: RADIUS.md,
        paddingHorizontal: 16,
        fontSize: 16,
        color: COLORS.text,
    },
    modalAddBtn: {
        height: 54,
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalAddBtnText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '700',
    },
    disabledBtn: {
        backgroundColor: COLORS.border,
    },
    // 삭제 모달
    deleteModalCard: {
        width: '80%',
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
    },
    deleteTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    deleteDescription: {
        fontSize: 15,
        color: COLORS.textMuted,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    deleteActionRow: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelBtn: {
        flex: 1,
        height: 48,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtnText: {
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    confirmDeleteBtn: {
        flex: 1,
        height: 48,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.error,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmDeleteBtnText: {
        color: COLORS.white,
        fontWeight: '600',
    },
});