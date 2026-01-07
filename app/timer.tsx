import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../lib/store';
import { COLORS } from '../lib/theme';
import { QuestionRecord } from '../lib/types';

export default function TimerScreen() {
    const router = useRouter();
    const {
        stopwatch, startStopwatch, pauseStopwatch, resetStopwatch,
        subjects, addSubject, addQuestionRecord
    } = useAppStore();

    const [now, setNow] = useState(Date.now());
    const [currentPage, setCurrentPage] = useState(0);
    const pagerRef = useRef<PagerView>(null);

    // Problem Solving State
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
    const [questionNo, setQuestionNo] = useState(1);
    const [lapStatus, setLapStatus] = useState<'IDLE' | 'RUNNING'>('IDLE');
    const [lapStartAt, setLapStartAt] = useState<number | null>(null);
    const [lapElapsed, setLapElapsed] = useState(0);
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');

    // 1. Auto-pause logic
    useFocusEffect(
        useCallback(() => {
            // Auto-start when entering this screen
            startStopwatch();

            return () => {
                pauseStopwatch();
            };
        }, [startStopwatch, pauseStopwatch])
    );

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState !== 'active') {
                pauseStopwatch();
            }
        });
        return () => subscription.remove();
    }, [pauseStopwatch]);

    // 2. Timer Update Loop
    useEffect(() => {
        const id = setInterval(() => {
            setNow(Date.now());
            if (lapStatus === 'RUNNING' && lapStartAt) {
                setLapElapsed(Date.now() - lapStartAt);
            }
        }, 100);
        return () => clearInterval(id);
    }, [lapStatus, lapStartAt]);

    const totalElapsedMs = useMemo(() => {
        if (stopwatch.isRunning && stopwatch.startedAt) {
            return stopwatch.accumulatedMs + (now - stopwatch.startedAt);
        }
        return stopwatch.accumulatedMs;
    }, [now, stopwatch.accumulatedMs, stopwatch.isRunning, stopwatch.startedAt]);

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleLapTap = () => {
        if (!stopwatch.isRunning) {
            startStopwatch();
        }

        const nowTs = Date.now();
        if (lapStatus === 'IDLE') {
            setLapStatus('RUNNING');
            setLapStartAt(nowTs);
            setLapElapsed(0);
        } else {
            if (!lapStartAt || !selectedSubjectId) return;
            const duration = nowTs - lapStartAt;

            const record: QuestionRecord = {
                id: Math.random().toString(36).substr(2, 9),
                userId: 'local-user',
                sessionId: 'current-session',
                subjectId: selectedSubjectId,
                questionNo: questionNo,
                durationMs: duration,
                startedAt: lapStartAt,
                endedAt: nowTs,
                source: 'tap',
            };
            addQuestionRecord(record);

            setQuestionNo(q => q + 1);
            setLapStartAt(nowTs);
            setLapElapsed(0);
        }
    };

    const handleFinishSubject = () => {
        setLapStatus('IDLE');
        setLapStartAt(null);
        setLapElapsed(0);
        setQuestionNo(1);
        setSelectedSubjectId(null);
    };

    const handleSubjectSelect = (id: string) => {
        if (selectedSubjectId === id) return;

        // Reset states for new subject
        setLapStatus('IDLE');
        setLapStartAt(null);
        setLapElapsed(0);
        setQuestionNo(1);
        setSelectedSubjectId(id);
    };

    const handleQuickAddSubject = () => {
        setIsAddModalVisible(true);
    };

    const confirmAddSubject = () => {
        if (newSubjectName.trim()) {
            addSubject(newSubjectName.trim());
            setNewSubjectName('');
            setIsAddModalVisible(false);
        }
    };

    const selectedSubjectName = subjects.find(s => s.id === selectedSubjectId)?.name || "과목 선택";

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <View style={styles.tabHeader}>
                    <TouchableOpacity
                        style={[styles.tabItem, currentPage === 0 && styles.activeTabItem]}
                        onPress={() => pagerRef.current?.setPage(0)}
                    >
                        <Text style={[styles.tabText, currentPage === 0 && styles.activeTabText]}>전체 타이머</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabItem, currentPage === 1 && styles.activeTabItem]}
                        onPress={() => pagerRef.current?.setPage(1)}
                    >
                        <Text style={[styles.tabText, currentPage === 1 && styles.activeTabText]}>과목별 기록</Text>
                    </TouchableOpacity>
                </View>
                <View style={{ width: 44 }} />
            </View>

            <PagerView
                style={styles.pager}
                initialPage={0}
                onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
                ref={pagerRef}
            >
                {/* PAGE 1: GLOBAL TIMER */}
                <View key="1" style={styles.page}>
                    <View style={styles.timerContent}>
                        <Text style={styles.timerLabel}>오늘 집중 시간</Text>
                        <Text style={styles.mainTimer}>{formatTime(totalElapsedMs)}</Text>

                        <TouchableOpacity
                            style={[styles.bigCircle, stopwatch.isRunning ? styles.pauseBtn : styles.startBtn]}
                            onPress={() => stopwatch.isRunning ? pauseStopwatch() : startStopwatch()}
                        >
                            <Ionicons name={stopwatch.isRunning ? "pause" : "play"} size={48} color={COLORS.white} />
                        </TouchableOpacity>

                        <Text style={styles.tip}>왼쪽으로 밀어서 과목별 기록을 시작하세요</Text>
                    </View>
                </View>

                {/* PAGE 2: QUESTION TRACKER */}
                <View key="2" style={styles.page}>
                    <View style={styles.trackerContent}>
                        <View style={styles.subjectSelector}>
                            <Text style={styles.sectionTitle}>과목 선택</Text>
                            <View style={styles.subjectList}>
                                {subjects.map(s => (
                                    <TouchableOpacity
                                        key={s.id}
                                        style={[styles.subjectChip, selectedSubjectId === s.id && styles.activeChip]}
                                        onPress={() => handleSubjectSelect(s.id)}
                                    >
                                        <Text style={[styles.chipText, selectedSubjectId === s.id && styles.activeChipText]}>
                                            {s.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity
                                    style={styles.addChip}
                                    onPress={handleQuickAddSubject}
                                >
                                    <Ionicons name="add" size={20} color={COLORS.primary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.lapMainTouchable}
                            activeOpacity={0.8}
                            onPress={handleLapTap}
                            disabled={!selectedSubjectId}
                        >
                            <View style={styles.lapInfo}>
                                <Text style={styles.lapQ}>Q{questionNo}</Text>
                                <Text style={styles.lapSubject}>{selectedSubjectName}</Text>
                            </View>
                            <Text style={styles.lapTime}>{formatTime(lapElapsed)}</Text>

                            <View style={styles.lapHint}>
                                <Ionicons
                                    name={lapStatus === 'IDLE' ? 'play-circle' : 'checkmark-circle'}
                                    size={24}
                                    color={COLORS.primary}
                                />
                                <Text style={styles.lapHintText}>
                                    {lapStatus === 'IDLE' ? '터치하여 시작' : '풀이 완료 (화면 터치)'}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {selectedSubjectId && (
                            <TouchableOpacity
                                style={styles.finishSubjectBtn}
                                onPress={handleFinishSubject}
                            >
                                <Text style={styles.finishSubjectText}>이 과목 공부 종료</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </PagerView>

            <Modal
                visible={isAddModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsAddModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setIsAddModalVisible(false)}
                >
                    <View style={styles.sheetContainer}>
                        <View style={styles.sheetHandle} />
                        <Text style={styles.sheetTitle}>새 과목 추가</Text>
                        <TextInput
                            style={styles.sheetInput}
                            placeholder="과목 이름을 입력하세요"
                            value={newSubjectName}
                            onChangeText={setNewSubjectName}
                            autoFocus={true}
                        />
                        <TouchableOpacity style={styles.sheetSubmit} onPress={confirmAddSubject}>
                            <Text style={styles.sheetSubmitText}>추가하기</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    sheetContainer: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingBottom: 40,
        gap: 20,
    },
    sheetHandle: {
        width: 40,
        height: 5,
        backgroundColor: COLORS.border,
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 8,
    },
    sheetTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.text,
    },
    sheetInput: {
        backgroundColor: COLORS.bg,
        borderRadius: 16,
        padding: 16,
        fontSize: 16,
        color: COLORS.text,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    sheetSubmit: {
        backgroundColor: COLORS.primary,
        paddingVertical: 18,
        borderRadius: 20,
        alignItems: 'center',
    },
    sheetSubmitText: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    tabHeader: {
        flexDirection: 'row',
        gap: 20,
    },
    tabItem: {
        paddingVertical: 8,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTabItem: {
        borderBottomColor: COLORS.primary,
    },
    tabText: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    activeTabText: {
        color: COLORS.primary,
    },
    pager: {
        flex: 1,
    },
    page: {
        flex: 1,
        paddingHorizontal: 24,
    },
    timerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
    },
    timerLabel: {
        fontSize: 16,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    mainTimer: {
        fontSize: 64,
        fontWeight: '900',
        color: COLORS.text,
        fontVariant: ['tabular-nums'],
    },
    bigCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    startBtn: {
        backgroundColor: COLORS.primary,
    },
    pauseBtn: {
        backgroundColor: COLORS.text,
    },
    tip: {
        marginTop: 60,
        fontSize: 14,
        color: COLORS.textMuted,
    },
    trackerContent: {
        flex: 1,
        paddingTop: 20,
        gap: 40,
    },
    subjectSelector: {
        gap: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
    },
    subjectList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    subjectChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    activeChip: {
        backgroundColor: COLORS.primaryLight,
        borderColor: COLORS.primary,
    },
    chipText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    activeChipText: {
        color: COLORS.primary,
    },
    addChip: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    emptySubject: {
        width: '100%',
        padding: 20,
        borderRadius: 16,
        backgroundColor: COLORS.white,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: COLORS.textMuted,
        alignItems: 'center',
    },
    emptyText: {
        color: COLORS.textMuted,
        fontSize: 14,
    },
    lapMainTouchable: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 40,
        marginVertical: 20,
        borderWidth: 2,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
        gap: 10,
    },
    lapInfo: {
        alignItems: 'center',
    },
    lapQ: {
        fontSize: 32,
        fontWeight: '900',
        color: COLORS.primary,
    },
    lapSubject: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    lapTime: {
        fontSize: 64,
        fontWeight: '900',
        color: COLORS.text,
        fontVariant: ['tabular-nums'],
    },
    lapHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 20,
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    lapHintText: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.primary,
    },
    finishSubjectBtn: {
        paddingVertical: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    finishSubjectText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.accent,
        textDecorationLine: 'underline',
    },
});

