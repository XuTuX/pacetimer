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
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../lib/theme';
import type { Subject } from '../lib/types';
import { ThemedText } from './ui/ThemedText';

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
    const [isManageMode, setIsManageMode] = React.useState(false);
    const [editingSubjectId, setEditingSubjectId] = React.useState<string | null>(null);
    const [editName, setEditName] = React.useState('');

    // Reset state on close
    React.useEffect(() => {
        if (!isModalVisible) {
            setIsManageMode(false);
            setEditingSubjectId(null);
            setNewSubjectName('');
        }
    }, [isModalVisible]);

    const visibleSubjects = subjects.filter(s => !s.isArchived);
    const selectedSubject = visibleSubjects.find(s => s.id === activeSubjectId);

    const handleAddSubject = () => {
        if (newSubjectName.trim()) {
            addSubject(newSubjectName.trim());
            setNewSubjectName('');
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
                    activeOpacity={0.7}
                >
                    <View style={styles.selectorContent}>
                        <View style={[styles.selectorDot, selectedSubject && styles.selectorDotActive]} />
                        <ThemedText style={[styles.selectorText, !selectedSubject && styles.placeholder]}>
                            {selectedSubject ? selectedSubject.name : '과목 선택하기'}
                        </ThemedText>
                    </View>
                    <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} style={{ opacity: 0.5 }} />
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
                            {/* Handle & Header */}
                            <View style={styles.handleBar} />

                            <View style={styles.headerRow}>
                                <View style={{ flex: 1 }} />
                                <TouchableOpacity
                                    onPress={() => {
                                        setIsManageMode(!isManageMode);
                                        Haptics.selectionAsync();
                                    }}
                                    style={styles.manageBtn}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Text style={[styles.manageBtnText, isManageMode && styles.manageBtnTextActive]}>
                                        {isManageMode ? '완료' : '편집'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.modalScroll} bounces showsVerticalScrollIndicator={false}>
                                <View style={styles.subjectList}>
                                    {visibleSubjects.map(s => (
                                        <View key={s.id} style={styles.itemContainer}>
                                            <TouchableOpacity
                                                style={styles.modalItem}
                                                onPress={() => {
                                                    if (isManageMode) return;
                                                    setActiveSubjectId(s.id);
                                                    setModalVisible(false);
                                                    Haptics.selectionAsync();
                                                }}
                                                activeOpacity={isManageMode ? 1 : 0.7}
                                            >
                                                {/* Left: Delete or Dot */}
                                                <View style={styles.itemLeft}>
                                                    {isManageMode ? (
                                                        <TouchableOpacity
                                                            onPress={() => handleDeleteSubject(s.id)}
                                                            style={styles.deleteBtn}
                                                        >
                                                            <Ionicons name="remove-circle" size={22} color={COLORS.error} />
                                                        </TouchableOpacity>
                                                    ) : (
                                                        <View style={[styles.dot, activeSubjectId === s.id && styles.dotActive]} />
                                                    )}

                                                    {/* Center: Name or Edit Input */}
                                                    {editingSubjectId === s.id ? (
                                                        <TextInput
                                                            style={styles.inlineInput}
                                                            value={editName}
                                                            onChangeText={setEditName}
                                                            autoFocus
                                                            onBlur={() => handleUpdateSubject(s.id)}
                                                            onSubmitEditing={() => handleUpdateSubject(s.id)}
                                                            selectionColor={COLORS.primary}
                                                        />
                                                    ) : (
                                                        <ThemedText style={[styles.itemText, activeSubjectId === s.id && styles.itemTextActive]}>
                                                            {s.name}
                                                        </ThemedText>
                                                    )}
                                                </View>

                                                {/* Right: Edit Icon or Checkmark */}
                                                <View style={styles.itemRight}>
                                                    {isManageMode ? (
                                                        editingSubjectId !== s.id && (
                                                            <TouchableOpacity
                                                                onPress={() => {
                                                                    setEditingSubjectId(s.id);
                                                                    setEditName(s.name);
                                                                }}
                                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                            >
                                                                <Ionicons name="pencil" size={16} color={COLORS.textMuted} />
                                                            </TouchableOpacity>
                                                        )
                                                    ) : (
                                                        activeSubjectId === s.id && (
                                                            <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                                                        )
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        </View>
                                    ))}

                                    {/* Add New Subject Row (Always at bottom) */}
                                    <View style={styles.addItemRow}>
                                        <TouchableOpacity
                                            onPress={handleAddSubject}
                                            disabled={!newSubjectName.trim()}
                                            style={styles.addIconBtn}
                                        >
                                            <Ionicons
                                                name="add"
                                                size={22}
                                                color={newSubjectName.trim() ? COLORS.primary : COLORS.textMuted}
                                            />
                                        </TouchableOpacity>
                                        <TextInput
                                            style={styles.addInput}
                                            placeholder="새로운 과목 추가"
                                            placeholderTextColor={COLORS.textMuted}
                                            value={newSubjectName}
                                            onChangeText={setNewSubjectName}
                                            onSubmitEditing={handleAddSubject}
                                            returnKeyType="done"
                                        />
                                    </View>
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
        height: 56,
        paddingHorizontal: SPACING.lg,
        borderRadius: RADIUS.xl,
        ...SHADOWS.small,
        shadowOpacity: 0.03,
    },
    selectorContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    selectorDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.borderDark
    },
    selectorDotActive: {
        backgroundColor: COLORS.primary
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
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end'
    },
    modalKeyboardAvoid: {
        width: '100%',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingBottom: 40,
        maxHeight: height * 0.8,
        ...SHADOWS.medium
    },
    handleBar: {
        width: 36,
        height: 4,
        backgroundColor: COLORS.borderDark,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 10,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.md,
        paddingBottom: SPACING.xs,
    },
    manageBtn: {
        paddingVertical: 4,
        paddingHorizontal: 4
    },
    manageBtnText: {
        fontSize: 14,
        color: COLORS.textMuted,
        fontWeight: '600'
    },
    manageBtnTextActive: {
        color: COLORS.primary
    },
    modalScroll: {
        paddingHorizontal: SPACING.xl
    },
    subjectList: {
        paddingBottom: SPACING.xl,
        marginTop: 8
    },
    itemContainer: {
        marginBottom: 4,
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 8,
    },
    itemLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.gray,
        opacity: 0.3
    },
    dotActive: {
        backgroundColor: COLORS.primary,
        opacity: 1
    },
    itemText: {
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '500'
    },
    itemTextActive: {
        fontWeight: '700',
        color: COLORS.text
    },
    itemRight: {
        minWidth: 24,
        alignItems: 'flex-end'
    },
    deleteBtn: {
        marginRight: 4
    },
    inlineInput: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '600',
        padding: 0,
        marginLeft: -2
    },
    addItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 4,
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: COLORS.surfaceVariant, // Very subtle separator
        gap: 12
    },
    addIconBtn: {
        width: 24,
        alignItems: 'center',
    },
    addInput: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
        height: 40
    }
});
