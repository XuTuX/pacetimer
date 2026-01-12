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
    const { subjects, addSubject, activeSubjectId, setActiveSubjectId, sessions, segments, activeSegmentId, stopwatch } = useAppStore();

    // 모달(Bottom Sheet) 상태 관리
    const [isModalVisible, setModalVisible] = React.useState(false);

    const [newSubjectName, setNewSubjectName] = React.useState('');
    const [isAdding, setIsAdding] = React.useState(false);
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

    const selectedSubject = subjects.find(s => s.id === activeSubjectId);

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
                        <ThemedText variant="label" color={COLORS.textMuted} style={styles.label}>공부 과목</ThemedText>

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
                                    <Ionicons name="book" size={16} color={selectedSubject ? COLORS.white : COLORS.textMuted} />
                                </View>
                                <ThemedText style={[styles.selectorText, !selectedSubject && styles.placeholder]}>
                                    {selectedSubject ? selectedSubject.name : "과목을 선택해주세요"}
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
                                setModalVisible(true); // 과목 안 골랐으면 모달 띄우기
                            }
                        }}
                    />

                    <Button
                        label="모의고사 모드"
                        variant="ghost"
                        icon="arrow-forward"
                        iconPosition="right"
                        size="sm"
                        onPress={() => router.push('/modes/mock-exam/setup')}
                    />
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
                            <View style={styles.modalHeader}>
                                <ThemedText style={styles.modalTitle}>과목 선택</ThemedText>
                                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                    <Ionicons name="close" size={24} color={COLORS.textMuted} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.modalScroll} bounces={false}>
                                {subjects.map(s => (
                                    <TouchableOpacity
                                        key={s.id}
                                        style={[styles.modalItem, activeSubjectId === s.id && styles.modalItemActive]}
                                        onPress={() => {
                                            setActiveSubjectId(s.id);
                                            setModalVisible(false); // 선택 시 바로 닫힘
                                            Haptics.selectionAsync();
                                        }}
                                    >
                                        <ThemedText style={[styles.modalItemText, activeSubjectId === s.id && styles.activeItemText]}>
                                            {s.name}
                                        </ThemedText>
                                        {activeSubjectId === s.id && (
                                            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                                        )}
                                    </TouchableOpacity>
                                ))}

                                {/* 새 과목 추가 영역 */}
                                <View style={styles.modalAddSection}>
                                    {!isAdding ? (
                                        <TouchableOpacity
                                            style={styles.addItemRow}
                                            onPress={() => setIsAdding(true)}
                                        >
                                            <View style={styles.addIconCircle}>
                                                <Ionicons name="add" size={20} color={COLORS.primary} />
                                            </View>
                                            <ThemedText style={styles.addItemText}>새 과목 추가하기</ThemedText>
                                        </TouchableOpacity>
                                    ) : (
                                        <View style={styles.inputRow}>
                                            <TextInput
                                                style={styles.modalInput}
                                                placeholder="새 과목 이름..."
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
                                    )}
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
    label: {
        marginBottom: SPACING.sm,
        marginLeft: SPACING.xs,
        fontSize: 12,
        fontWeight: '600',
    },
    selector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.surface,
        height: 68,
        paddingHorizontal: SPACING.lg,
        borderRadius: RADIUS.xl,
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
        width: 40,
        height: 40,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconBoxActive: {
        backgroundColor: COLORS.primary,
    },
    selectorText: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    placeholder: {
        color: COLORS.textMuted,
        fontWeight: '500',
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
    },
    modalKeyboardAvoid: {
        width: '100%',
    },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: RADIUS.xl, // 24
        borderTopRightRadius: RADIUS.xl,
        paddingBottom: 40, // 하단 아이폰 홈 바 여유 공간
        maxHeight: height * 0.7, // 화면의 70%까지만 차지
        minHeight: 200,
        ...SHADOWS.heavy,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    closeBtn: {
        padding: 4,
    },
    modalScroll: {
        padding: SPACING.lg,
    },
    modalItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    modalItemActive: {
        backgroundColor: 'rgba(0,0,0,0.02)',
        marginHorizontal: -SPACING.lg,
        paddingHorizontal: SPACING.lg + SPACING.lg, // active state negative margin hack for full width bg
    },
    modalItemText: {
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '500',
    },
    activeItemText: {
        color: COLORS.primary,
        fontWeight: '700',
    },

    // Modal Add Section
    modalAddSection: {
        marginTop: SPACING.md,
        marginBottom: SPACING.xl,
    },
    addItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 12,
    },
    addIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addItemText: {
        fontSize: 15,
        color: COLORS.primary,
        fontWeight: '600',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    modalInput: {
        flex: 1,
        height: 48,
        backgroundColor: COLORS.bg,
        borderRadius: RADIUS.lg,
        paddingHorizontal: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    confirmBtn: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },

    bottomActions: {
        marginTop: 'auto',
        marginBottom: SPACING.lg,
        gap: SPACING.sm,
    },
    startBtn: {
        height: 64,
        borderRadius: RADIUS.xl,
    },
});