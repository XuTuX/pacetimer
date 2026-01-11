import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SproutVisual from '../../components/SproutVisual';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ScreenHeader } from '../../components/ui/ScreenHeader'; // Changed from AppHeader
import { ThemedText } from '../../components/ui/ThemedText';
import { useAppStore } from '../../lib/store';
import { getStudyDateKey } from '../../lib/studyDate';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../lib/theme';
import type { Segment, Session } from '../../lib/types';

const { height } = Dimensions.get('window');

export default function HomeScreen() {
    const router = useRouter();
    const { subjects, addSubject, activeSubjectId, setActiveSubjectId, sessions, segments, activeSegmentId, stopwatch } = useAppStore();
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
    const [newSubjectName, setNewSubjectName] = React.useState('');
    const [isAdding, setIsAdding] = React.useState(false);
    const [now, setNow] = React.useState(Date.now());

    // Update 'now' for real-time timer updates
    React.useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const totalMs = React.useMemo(() => {
        const today = getStudyDateKey(now);

        // 1. Get all sessions for today
        const todaySessionIds = new Set(
            sessions.filter((s: Session) => s.studyDate === today).map((s: Session) => s.id)
        );

        // 2. Sum up finished segments for these sessions
        let accumulated = segments.reduce((acc: number, seg: Segment) => {
            if (todaySessionIds.has(seg.sessionId) && seg.endedAt) {
                return acc + (seg.endedAt - seg.startedAt);
            }
            return acc;
        }, 0);

        // 3. Add active segment if it belongs to a today's session
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

    const SettingsButton = (
        <TouchableOpacity style={styles.headerIcon} onPress={() => router.push('/timer')}>
            <Ionicons name="settings-outline" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* 배경 클릭 시 드롭다운 닫기 */}
            {isDropdownOpen && (
                <Pressable style={StyleSheet.absoluteFill} onPress={() => { setIsDropdownOpen(false); setIsAdding(false); }} />
            )}

            <ScreenHeader
                title="오늘의 기록"
                subtitle="성장하는 즐거움을 느껴보세요 🌱"
                rightElement={SettingsButton}
                showBack={false}
                style={{ marginBottom: SPACING.lg, borderBottomWidth: 0, paddingBottom: SPACING.sm }}
            />

            <Card variant="elevated" style={styles.mainCard}>
                <SproutVisual totalMinutes={totalMinutes} />
                <View style={styles.timeContainer}>
                    <ThemedText variant="caption" color={COLORS.textMuted} style={styles.timeLabel}>누적 학습 시간</ThemedText>
                    <ThemedText variant="h1" style={styles.timeText}>{formatTime(totalMs)}</ThemedText>
                </View>
            </Card>

            {/* 과목 선택 영역 (Dropdown 컨테이너) */}
            <View style={styles.subjectWrapper}>
                <ThemedText variant="label" color={COLORS.textMuted} style={styles.label}>공부 과목</ThemedText>
                <View style={{ zIndex: 10 }}>
                    <TouchableOpacity
                        style={[styles.selector, isDropdownOpen && styles.selectorActive]}
                        onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                        activeOpacity={0.8}
                    >
                        <ThemedText style={[styles.selectorText, !selectedSubject && styles.placeholder]}>
                            {selectedSubject ? selectedSubject.name : "과목을 선택하세요"}
                        </ThemedText>
                        <Ionicons name={isDropdownOpen ? "chevron-up" : "chevron-down"} size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>

                    {/* 작은 팝업창 형태의 드롭다운 */}
                    {isDropdownOpen && (
                        <View style={styles.dropdownWindow}>
                            <ScrollView style={styles.dropdownScroll} bounces={false}>
                                {subjects.map(s => (
                                    <TouchableOpacity
                                        key={s.id}
                                        style={styles.dropdownItem}
                                        onPress={() => {
                                            setActiveSubjectId(s.id);
                                            setIsDropdownOpen(false);
                                        }}
                                    >
                                        <ThemedText style={[styles.dropdownItemText, activeSubjectId === s.id && styles.activeItemText]}>
                                            {s.name}
                                        </ThemedText>
                                        {activeSubjectId === s.id && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
                                    </TouchableOpacity>
                                ))}

                                {!isAdding ? (
                                    <TouchableOpacity style={styles.addItemRow} onPress={() => setIsAdding(true)}>
                                        <Ionicons name="add" size={18} color={COLORS.primary} />
                                        <ThemedText style={styles.addItemText}>새 과목 추가</ThemedText>
                                    </TouchableOpacity>
                                ) : (
                                    <View style={styles.inputRow}>
                                        <TextInput
                                            style={styles.inlineInput}
                                            placeholder="과목명..."
                                            value={newSubjectName}
                                            onChangeText={setNewSubjectName}
                                            autoFocus
                                            onSubmitEditing={handleAddSubject}
                                        />
                                        <TouchableOpacity onPress={handleAddSubject}>
                                            <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    )}
                </View>
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
                            setIsDropdownOpen(true);
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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
        paddingHorizontal: SPACING.xxl,
    },
    headerIcon: {
        width: 38,
        height: 38,
        borderRadius: RADIUS.md, // 12
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    mainCard: {
        height: height * 0.35,
        alignItems: 'center',
        justifyContent: 'center',
        // padding: 20 is handled by Card default or explicit padding
        // Card uses RADIUS.xl (24) by default
    },
    timeContainer: {
        alignItems: 'center',
        marginTop: SPACING.md,
    },
    timeLabel: {
        fontWeight: '600',
        marginBottom: 4,
    },
    timeText: {
        // fontSize: 32 -> h1 is 32
    },
    subjectWrapper: {
        marginTop: SPACING.xl,
        position: 'relative',
    },
    label: {
        marginBottom: SPACING.sm,
        marginLeft: SPACING.xs,
    },
    selector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.surface,
        height: 52,
        paddingHorizontal: SPACING.lg,
        borderRadius: RADIUS.lg, // 14
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    selectorActive: {
        borderColor: COLORS.primary,
    },
    selectorText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
    },
    placeholder: {
        color: COLORS.textMuted,
    },
    // 드롭다운 작은 창 스타일
    dropdownWindow: {
        position: 'absolute',
        top: 58,
        left: 0,
        right: 0,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        maxHeight: 200,
        ...SHADOWS.medium,
        zIndex: 100,
    },
    dropdownScroll: {
        padding: SPACING.xs,
    },
    dropdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.md,
        borderRadius: RADIUS.md,
    },
    dropdownItemText: {
        fontSize: 15,
        color: COLORS.text,
        fontWeight: '500',
    },
    activeItemText: {
        color: COLORS.primary,
        fontWeight: '700',
    },
    addItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        gap: 6,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        marginTop: 4,
    },
    addItemText: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '600',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.sm,
        gap: 8,
    },
    inlineInput: {
        flex: 1,
        backgroundColor: COLORS.bg,
        height: 36,
        borderRadius: RADIUS.sm,
        paddingHorizontal: 10,
        fontSize: 14,
    },
    bottomActions: {
        marginTop: 'auto',
        marginBottom: SPACING.xl, // 20
        gap: SPACING.sm,
    },
    startBtn: {
        height: 60,
        borderRadius: RADIUS.xl, // 20
        // primary color handled by Button
    },
});
