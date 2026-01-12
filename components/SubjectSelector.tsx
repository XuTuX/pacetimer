import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { ThemedText } from './ui/ThemedText';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../lib/theme';
import type { Subject } from '../lib/types';

type Props = {
    subjects: Subject[];
    activeSubjectId: string | null;
    setActiveSubjectId: (id: string | null) => void;
    addSubject: (name: string) => void;
    updateSubject: (id: string, payload: { name: string }) => void;
    deleteSubject: (id: string) => void;
    isModalVisible: boolean;
    setModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
};

const { height } = Dimensions.get('window');

export default function SubjectSelector({
    subjects,
    activeSubjectId,
    setActiveSubjectId,
    addSubject,
    updateSubject,
    deleteSubject,
    isModalVisible,
    setModalVisible
}: Props) {
    const [newSubjectName, setNewSubjectName] = React.useState('');
    const [isAdding, setIsAdding] = React.useState(false);
    const [isManageMode, setIsManageMode] = React.useState(false);
    const [editingSubjectId, setEditingSubjectId] = React.useState<string | null>(null);
    const [editName, setEditName] = React.useState('');

    const visibleSubjects = subjects.filter(s => !s.isArchived);
    const selectedSubject = visibleSubjects.find(s => s.id === activeSubjectId);

    const handleAddSubject = () => {
        if (newSubjectName.trim()) {
            addSubject(newSubjectName.trim());
            setNewSubjectName('');
            setIsAdding(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    const handleUpdateSubject = (id: string) => {
        if (editName.trim()) {
            updateSubject(id, { name: editName.trim() });
            setEditingSubjectId(null);
            setEditName('');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    const handleDeleteSubject = (id: string) => {
        deleteSubject(id);
        if (id === activeSubjectId) {
            setActiveSubjectId(null);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const closeModal = () => {
        setModalVisible(false);
        setIsAdding(false);
        setIsManageMode(false);
        setEditingSubjectId(null);
        setEditName('');
    };

    return (
        <View>
            <View style={styles.subjectWrapper}>
                <TouchableOpacity
                    style={styles.selector}
                    onPress={() => {
                        setModalVisible(true);
                        Haptics.selectionAsync();
                    }}
                    activeOpacity={0.8}
                >
                    <View style={styles.selectorLeft}>
                        <View style={[styles.iconBox, selectedSubject ? styles.iconBoxActive : null]}>
                            <Ionicons name="book" size={18} color={selectedSubject ? COLORS.primary : COLORS.textMuted} />
                        </View>
                        <ThemedText style={[styles.selectorText, !selectedSubject && styles.placeholder]}>
                            {selectedSubject ? selectedSubject.name : '공부할 과목을 선택하세요'}
                        </ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
            </View>

            <Modal
                visible={isModalVisible}
                animationType="slide"
                transparent
                onRequestClose={closeModal}
            >
                <Pressable style={styles.modalOverlay} onPress={closeModal}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.modalKeyboardAvoid}
                    >
                        <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
                            <View style={styles.modalHandle} />

                            <View style={styles.modalHeader}>
                                <View style={styles.modalHeaderLeft}>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setIsAdding(!isAdding);
                                            setIsManageMode(false);
                                            Haptics.selectionAsync();
                                        }}
                                        style={styles.headerIconBtn}
                                    >
                                        <Ionicons name={isAdding ? 'remove' : 'add'} size={24} color={COLORS.primary} />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.modalHeaderRight}>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setIsManageMode(!isManageMode);
                                            setIsAdding(false);
                                            Haptics.selectionAsync();
                                        }}
                                        style={styles.headerIconBtn}
                                    >
                                        <Ionicons
                                            name={isManageMode ? 'settings' : 'settings-outline'}
                                            size={24}
                                            color={isManageMode ? COLORS.primary : COLORS.textMuted}
                                        />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={closeModal} style={styles.headerIconBtn}>
                                        <Ionicons name="close" size={24} color={COLORS.textMuted} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <ScrollView style={styles.modalScroll} bounces showsVerticalScrollIndicator={false}>
                                {isAdding && (
                                    <View style={styles.modalAddInputSection}>
                                        <View style={styles.inputRow}>
                                            <TextInput
                                                style={styles.modalInput}
                                                placeholder="과목명을 입력하세요"
                                                placeholderTextColor={COLORS.textMuted}
                                                value={newSubjectName}
                                                onChangeText={setNewSubjectName}
                                                autoFocus
                                                onSubmitEditing={handleAddSubject}
                                                returnKeyType="done"
                                            />
                                            <TouchableOpacity onPress={handleAddSubject} style={styles.confirmBtn}>
                                                <Ionicons name="arrow-up" size={20} color={COLORS.white} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}

                                <View style={styles.subjectList}>
                                    {visibleSubjects.map(s => (
                                        <TouchableOpacity
                                            key={s.id}
                                            style={[styles.modalItem, activeSubjectId === s.id && styles.modalItemActive]}
                                            onPress={() => {
                                                if (isManageMode) return;
                                                setActiveSubjectId(s.id);
                                                setModalVisible(false);
                                                Haptics.selectionAsync();
                                            }}
                                            disabled={isManageMode}
                                        >
                                            <View style={styles.modalItemLeft}>
                                                <View
                                                    style={[
                                                        styles.subjectDot,
                                                        { backgroundColor: activeSubjectId === s.id ? COLORS.primary : COLORS.borderDark }
                                                    ]}
                                                />
                                                {editingSubjectId === s.id ? (
                                                    <TextInput
                                                        style={styles.editInput}
                                                        value={editName}
                                                        onChangeText={setEditName}
                                                        autoFocus
                                                        onBlur={() => handleUpdateSubject(s.id)}
                                                        onSubmitEditing={() => handleUpdateSubject(s.id)}
                                                    />
                                                ) : (
                                                    <ThemedText
                                                        style={[styles.modalItemText, activeSubjectId === s.id && styles.activeItemText]}
                                                    >
                                                        {s.name}
                                                    </ThemedText>
                                                )}
                                            </View>

                                            <View style={styles.itemRightActions}>
                                                {isManageMode ? (
                                                    <View style={styles.manageActions}>
                                                        <TouchableOpacity
                                                            onPress={() => {
                                                                setEditingSubjectId(s.id);
                                                                setEditName(s.name);
                                                            }}
                                                            style={styles.manageBtn}
                                                        >
                                                            <Ionicons name="pencil" size={18} color={COLORS.textMuted} />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            onPress={() => handleDeleteSubject(s.id)}
                                                            style={styles.manageBtn}
                                                        >
                                                            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                                                        </TouchableOpacity>
                                                    </View>
                                                ) : (
                                                    activeSubjectId === s.id && (
                                                        <View style={styles.checkCircle}>
                                                            <Ionicons name="checkmark" size={14} color={COLORS.white} />
                                                        </View>
                                                    )
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>
                        </Pressable>
                    </KeyboardAvoidingView>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    subjectWrapper: {
        marginTop: SPACING.sm
    },
    selector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.surface,
        height: 60,
        paddingHorizontal: SPACING.xl,
        borderRadius: RADIUS.full,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.small
    },
    selectorLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center'
    },
    iconBoxActive: {
        backgroundColor: COLORS.primaryLight
    },
    selectorText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text
    },
    placeholder: {
        color: COLORS.textMuted,
        fontWeight: '500'
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        justifyContent: 'flex-end'
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: COLORS.borderDark,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 10
    },
    modalKeyboardAvoid: {
        width: '100%'
    },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingBottom: 48,
        maxHeight: height * 0.75,
        minHeight: 300,
        ...SHADOWS.heavy
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.md
    },
    modalHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    modalHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    headerIconBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center'
    },
    modalScroll: {
        paddingHorizontal: SPACING.xxl
    },
    modalAddInputSection: {
        marginBottom: SPACING.md
    },
    subjectList: {
        gap: 8,
        marginVertical: SPACING.md
    },
    modalItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.lg,
        backgroundColor: COLORS.bg,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: 'transparent'
    },
    modalItemLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    subjectDot: {
        width: 8,
        height: 8,
        borderRadius: 4
    },
    modalItemActive: {
        backgroundColor: COLORS.primaryLight,
        borderColor: 'rgba(0, 208, 148, 0.1)'
    },
    modalItemText: {
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '600'
    },
    activeItemText: {
        color: COLORS.primaryDark,
        fontWeight: '700'
    },
    itemRightActions: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    manageActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    manageBtn: {
        padding: 8
    },
    editInput: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '600',
        padding: 0
    },
    checkCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center'
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    modalInput: {
        flex: 1,
        height: 56,
        backgroundColor: COLORS.bg,
        borderRadius: RADIUS.lg,
        paddingHorizontal: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: COLORS.primary
    },
    confirmBtn: {
        width: 56,
        height: 56,
        borderRadius: RADIUS.lg,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.small
    }
});
