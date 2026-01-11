import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SproutVisual from '../../components/SproutVisual';
import { useAppStore } from '../../lib/store';
import { getStudyDateKey } from '../../lib/studyDate';
import { COLORS } from '../../lib/theme';
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

    return (
        <SafeAreaView style={styles.container}>
            {/* 배경 클릭 시 드롭다운 닫기 */}
            {isDropdownOpen && (
                <Pressable style={StyleSheet.absoluteFill} onPress={() => { setIsDropdownOpen(false); setIsAdding(false); }} />
            )}

            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>오늘의 기록</Text>
                    <Text style={styles.headerSubtitle}>성장하는 즐거움을 느껴보세요 🌱</Text>
                </View>
                <TouchableOpacity style={styles.headerIcon} onPress={() => router.push('/timer')}>
                    <Ionicons name="settings-outline" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
            </View>

            <View style={styles.mainCard}>
                <SproutVisual totalMinutes={totalMinutes} />
                <View style={styles.timeContainer}>
                    <Text style={styles.timeLabel}>누적 학습 시간</Text>
                    <Text style={styles.timeText}>{formatTime(totalMs)}</Text>
                </View>
            </View>

            {/* 과목 선택 영역 (Dropdown 컨테이너) */}
            <View style={styles.subjectWrapper}>
                <Text style={styles.label}>공부 과목</Text>
                <View style={{ zIndex: 10 }}>
                    <TouchableOpacity
                        style={[styles.selector, isDropdownOpen && styles.selectorActive]}
                        onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.selectorText, !selectedSubject && styles.placeholder]}>
                            {selectedSubject ? selectedSubject.name : "과목을 선택하세요"}
                        </Text>
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
                                        <Text style={[styles.dropdownItemText, activeSubjectId === s.id && styles.activeItemText]}>{s.name}</Text>
                                        {activeSubjectId === s.id && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
                                    </TouchableOpacity>
                                ))}

                                {!isAdding ? (
                                    <TouchableOpacity style={styles.addItemRow} onPress={() => setIsAdding(true)}>
                                        <Ionicons name="add" size={18} color={COLORS.primary} />
                                        <Text style={styles.addItemText}>새 과목 추가</Text>
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
                <TouchableOpacity
                    style={[styles.startBtn, !activeSubjectId && !stopwatch.isRunning && styles.disabledBtn]}
                    onPress={() => {
                        if (stopwatch.isRunning) router.push('/timer');
                        else if (activeSubjectId) router.push('/timer');
                        else {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                            setIsDropdownOpen(true);
                        }
                    }}
                >
                    <Ionicons name={stopwatch.isRunning ? "pause" : "play"} size={22} color={COLORS.white} />
                    <Text style={styles.startBtnText}>{stopwatch.isRunning ? "집중 이어가기" : "집중 시작"}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.mockLink} onPress={() => router.push('/modes/mock-exam/setup')}>
                    <Text style={styles.mockLinkText}>모의고사 모드</Text>
                    <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
        paddingHorizontal: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: COLORS.text,
    },
    headerSubtitle: {
        fontSize: 13,
        color: COLORS.textMuted,
    },
    headerIcon: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    mainCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        height: height * 0.35,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    timeContainer: {
        alignItems: 'center',
        marginTop: 10,
    },
    timeLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    timeText: {
        fontSize: 32,
        fontWeight: '900',
        color: COLORS.text,
    },
    subjectWrapper: {
        marginTop: 25,
        position: 'relative',
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textMuted,
        marginBottom: 8,
        marginLeft: 4,
    },
    selector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.surface,
        height: 52,
        paddingHorizontal: 16,
        borderRadius: 14,
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
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        maxHeight: 200,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        zIndex: 100,
    },
    dropdownScroll: {
        padding: 6,
    },
    dropdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderRadius: 10,
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
        padding: 12,
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
        padding: 8,
        gap: 8,
    },
    inlineInput: {
        flex: 1,
        backgroundColor: COLORS.bg,
        height: 36,
        borderRadius: 8,
        paddingHorizontal: 10,
        fontSize: 14,
    },
    bottomActions: {
        marginTop: 'auto',
        marginBottom: 20,
        gap: 10,
    },
    startBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        height: 60,
        borderRadius: 20,
        gap: 8,
    },
    startBtnText: {
        fontSize: 17,
        fontWeight: '700',
        color: COLORS.white,
    },
    disabledBtn: {
        backgroundColor: '#E0E0E0',
    },
    mockLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        gap: 4,
    },
    mockLinkText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
    },
});
