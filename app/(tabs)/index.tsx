import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
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
import SproutVisual from '../../components/SproutVisual';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { HeaderSettings } from '../../components/ui/HeaderSettings';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ThemedText } from '../../components/ui/ThemedText';
import { useAppStore } from '../../lib/store';
import { getStudyDateKey } from '../../lib/studyDate';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../lib/theme';
import type { Segment, Session } from '../../lib/types';

const { height } = Dimensions.get('window');

export default function HomeScreen() {
    const router = useRouter();
    const {
        subjects,
        addSubject,
        updateSubject,
        deleteSubject,
        activeSubjectId,
        setActiveSubjectId,
        sessions,
        segments,
        activeSegmentId,
        stopwatch
    } = useAppStore();

    // 모달(Bottom Sheet) 상태 관리
    const [isModalVisible, setModalVisible] = React.useState(false);

    const [newSubjectName, setNewSubjectName] = React.useState('');
    const [isAdding, setIsAdding] = React.useState(false);
    const [isManageMode, setIsManageMode] = React.useState(false);
    const [editingSubjectId, setEditingSubjectId] = React.useState<string | null>(null);
    const [editName, setEditName] = React.useState('');
    const [now, setNow] = React.useState(Date.now());

    React.useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const totalMs = React.useMemo(() => {
        const today = getStudyDateKey(now);
        const todaySessionIds = new Set(
            sessions.filter((s: Session) => s.studyDate === today).map((s: Session) => s.id)
        );
        let accumulated = segments.reduce((acc: number, seg: Segment) => {
            if (todaySessionIds.has(seg.sessionId) && seg.endedAt) {
                return acc + (seg.endedAt - seg.startedAt);
            }
            return acc;
        }, 0);
        if (activeSegmentId) {
            const activeSeg = segments.find((s: Segment) => s.id === activeSegmentId);
            if (activeSeg && todaySessionIds.has(activeSeg.sessionId)) {
                accumulated += (now - activeSeg.startedAt);
            }
        }
        return accumulated;
    }, [sessions, segments, activeSegmentId, now]);

    const totalMinutes = Math.floor(totalMs / 60000);

    const formatTime = (ms: number) => {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        if (hours > 0) return `${hours}시간 ${minutes}분`;
        return `${minutes}분 ${seconds}초`;
    };

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
        if (id === activeSubjectId) setActiveSubjectId(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const visibleSubjects = subjects.filter(s => !s.isArchived);
    const selectedSubject = visibleSubjects.find(s => s.id === activeSubjectId);

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="오늘의 기록"
                rightElement={<HeaderSettings />}
                showBack={false}
                align="left"
            />

            <View style={styles.content}>
                <Card variant="elevated" style={styles.mainCard}>
                    <SproutVisual totalMinutes={totalMinutes} />
                    <View style={styles.timeContainer}>
                        <ThemedText variant="caption" color={COLORS.textMuted} style={styles.timeLabel}>누적 학습 시간</ThemedText>
                        <ThemedText variant="h1" style={styles.timeText}>{formatTime(totalMs)}</ThemedText>
                    </View>
                </Card>

                <View style={styles.centerContent}>
                    {/* --- 과목 선택 버튼 영역 --- */}
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
                                    {selectedSubject ? selectedSubject.name : "공부할 과목을 선택하세요"}
                                </ThemedText>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    </View>
                    {/* ----------------------- */}
                </View>

                <View style={styles.bottomActions}>
                    <Button
                        label={stopwatch.isRunning ? "집중 이어가기" : "집중 시작"}
                        icon={stopwatch.isRunning ? "pause" : "play"}
                        size="lg"
                        style={styles.startBtn}
                        disabled={!activeSubjectId && !stopwatch.isRunning}
                        onPress={() => {
                            if (stopwatch.isRunning) router.push('/timer');
                            else if (activeSubjectId) router.push('/timer');
                            else {
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                setModalVisible(true);
                            }
                        }}
                    />

                    <TouchableOpacity
                        style={[
                            styles.mockExamBtn,
                            activeSubjectId ? styles.mockExamActive : null
                        ]}
                        onPress={() => {
                            if (activeSubjectId) {
                                router.push('/modes/mock-exam/setup');
                            } else {
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                setModalVisible(true);
                            }
                        }}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name="document-text-outline"
                            size={24}
                            color={activeSubjectId ? COLORS.primary : COLORS.textMuted}
                        />
                        <ThemedText
                            style={[
                                styles.mockExamText,
                                activeSubjectId && { color: COLORS.primaryDark }
                            ]}
                        >
                            모의고사
                        </ThemedText>
                    </TouchableOpacity>
                </View>
            </View>

            {/* --- Bottom Sheet Modal --- */}
            <Modal
                visible={isModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                {/* 배경 클릭 시 닫기 위한 Pressable */}
                <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.modalKeyboardAvoid}
                    >
                        {/* 모달 컨텐츠 (터치 전파 방지) */}
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
                                        <Ionicons name={isAdding ? "remove" : "add"} size={24} color={COLORS.primary} />
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
                                        <Ionicons name={isManageMode ? "settings" : "settings-outline"} size={24} color={isManageMode ? COLORS.primary : COLORS.textMuted} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.headerIconBtn}>
                                        <Ionicons name="close" size={24} color={COLORS.textMuted} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <ScrollView style={styles.modalScroll} bounces={true} showsVerticalScrollIndicator={false}>
                                {/* 새 과목 추가 입력창 (Header 활성화시) */}
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
                                                <View style={[styles.subjectDot, { backgroundColor: activeSubjectId === s.id ? COLORS.primary : COLORS.borderDark }]} />
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
                                                    <ThemedText style={[styles.modalItemText, activeSubjectId === s.id && styles.activeItemText]}>
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
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    content: {
        flex: 1,
        paddingHorizontal: SPACING.xxl,
        paddingBottom: 20,
    },
    mainCard: {
        height: height * 0.38,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.md,
        paddingBottom: SPACING.lg,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
    },
    timeContainer: {
        alignItems: 'center',
        marginTop: SPACING.xs,
        gap: 2,
    },
    timeLabel: {
        fontWeight: '600',
        marginBottom: 2,
    },
    timeText: {
        fontSize: 34,
    },

    // Selector Button Styles
    subjectWrapper: {
        marginTop: SPACING.sm,
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
        ...SHADOWS.small,
    },
    selectorLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconBoxActive: {
        backgroundColor: COLORS.primaryLight,
    },
    selectorText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    placeholder: {
        color: COLORS.textMuted,
        fontWeight: '500',
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        justifyContent: 'flex-end',
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: COLORS.borderDark,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 10,
    },
    modalKeyboardAvoid: {
        width: '100%',
    },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingBottom: 48,
        maxHeight: height * 0.75,
        minHeight: 300,
        ...SHADOWS.heavy,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.md,
    },
    modalHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    modalHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerIconBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalScroll: {
        paddingHorizontal: SPACING.xxl,
    },
    modalAddInputSection: {
        marginBottom: SPACING.md,
    },
    subjectList: {
        gap: 8,
        marginVertical: SPACING.md,
    },
    modalItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.lg,
        backgroundColor: COLORS.bg,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    modalItemLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    subjectDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    modalItemActive: {
        backgroundColor: COLORS.primaryLight,
        borderColor: 'rgba(0, 208, 148, 0.1)',
    },
    modalItemText: {
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '600',
    },
    activeItemText: {
        color: COLORS.primaryDark,
        fontWeight: '700',
    },
    itemRightActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    manageActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    manageBtn: {
        padding: 8,
    },
    editInput: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '600',
        padding: 0,
    },
    checkCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },

    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    modalInput: {
        flex: 1,
        height: 56,
        backgroundColor: COLORS.bg,
        borderRadius: RADIUS.lg,
        paddingHorizontal: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    confirmBtn: {
        width: 56,
        height: 56,
        borderRadius: RADIUS.lg,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.small,
    },

    bottomActions: {
        flexDirection: 'row',
        marginTop: 'auto',
        marginBottom: SPACING.xl,
        gap: SPACING.md,
        alignItems: 'center',
    },
    startBtn: {
        flex: 3,
        height: 64,
        borderRadius: RADIUS.xl,
    },
    mockExamBtn: {
        flex: 1,
        height: 64,
        borderRadius: RADIUS.xl,
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    mockExamActive: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryLight,
    },
    mockExamText: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.textMuted,
        marginTop: 2,
    },
});