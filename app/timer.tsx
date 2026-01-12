import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../lib/store';
import { COLORS, RADIUS, SHADOWS } from '../lib/theme';

export default function TimerScreen() {
    const router = useRouter();
    const {
        stopwatch, startStopwatch, pauseStopwatch,
        subjects, addSubject,
        activeSubjectId, activeSegmentId,
        addQuestionRecordForActiveSegment, undoLastQuestionInSegment,
        endSession,
        setActiveSubjectId
    } = useAppStore();

    const [now, setNow] = useState(Date.now());
    const [currentPage, setCurrentPage] = useState(1);
    const pagerRef = useRef<PagerView>(null);
    const ignoreNextSegmentResetRef = useRef(false);

    const [questionNo, setQuestionNo] = useState(1);
    const [lapStatus, setLapStatus] = useState<'IDLE' | 'RUNNING'>('IDLE');
    const [lapStartAt, setLapStartAt] = useState<number | null>(null);
    const [lapElapsed, setLapElapsed] = useState(0);

    const flashValue = useRef(new Animated.Value(0)).current;
    const isSubjectSelected = !!activeSubjectId;

    // --- [기존 로직 유지] ---
    useFocusEffect(
        useCallback(() => {
            if (isSubjectSelected) startStopwatch();
            return () => pauseStopwatch();
        }, [isSubjectSelected, startStopwatch, pauseStopwatch])
    );

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState !== 'active') {
                if (lapStatus === 'RUNNING' && lapStartAt) {
                    const nowTs = Date.now();
                    addQuestionRecordForActiveSegment({
                        durationMs: nowTs - lapStartAt,
                        startedAt: lapStartAt,
                        endedAt: nowTs,
                        source: 'finish',
                    });
                    setLapStatus('IDLE');
                    setLapStartAt(null);
                    setLapElapsed(0);
                }
                pauseStopwatch();
            }
        });
        return () => subscription.remove();
    }, [pauseStopwatch, lapStatus, lapStartAt, addQuestionRecordForActiveSegment]);

    useEffect(() => {
        setQuestionNo(1);
        if (ignoreNextSegmentResetRef.current) {
            ignoreNextSegmentResetRef.current = false;
            return;
        }
        setLapStatus('IDLE');
        setLapStartAt(null);
        setLapElapsed(0);
    }, [activeSegmentId]);

    useEffect(() => {
        const id = setInterval(() => {
            setNow(Date.now());
            if (lapStatus === 'RUNNING' && lapStartAt && stopwatch.isRunning) {
                setLapElapsed(Date.now() - lapStartAt);
            }
        }, 100);
        return () => clearInterval(id);
    }, [lapStatus, lapStartAt, stopwatch.isRunning]);

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
        const ss = totalSeconds % 60;
        return `${h}:${m.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
    };

    const formatLapTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const m = Math.floor(totalSeconds / 60);
        const ss = totalSeconds % 60;
        return `${m.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
    };

    const finalizeRunningLap = useCallback((source: 'finish' | 'manual' = 'finish') => {
        if (lapStatus !== 'RUNNING' || !lapStartAt) return;
        const nowTs = Date.now();
        const saved = addQuestionRecordForActiveSegment({
            durationMs: nowTs - lapStartAt,
            startedAt: lapStartAt,
            endedAt: nowTs,
            source,
        });
        if (saved) setQuestionNo(saved.questionNo + 1);
        setLapStatus('IDLE');
        setLapStartAt(null);
        setLapElapsed(0);
    }, [addQuestionRecordForActiveSegment, lapStartAt, lapStatus]);

    const handleLapTap = () => {
        if (!isSubjectSelected) return;
        flashValue.setValue(1);
        Animated.timing(flashValue, { toValue: 0, duration: 500, useNativeDriver: false }).start();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (!stopwatch.isRunning) { ignoreNextSegmentResetRef.current = true; startStopwatch(); }
        const nowTs = Date.now();
        if (lapStatus === 'IDLE') {
            setLapStatus('RUNNING');
            setLapStartAt(nowTs);
            setLapElapsed(0);
        } else {
            if (!lapStartAt) return;
            const saved = addQuestionRecordForActiveSegment({ durationMs: nowTs - lapStartAt, startedAt: lapStartAt, endedAt: nowTs, source: 'tap' });
            if (saved) setQuestionNo(saved.questionNo + 1);
            setLapStartAt(nowTs);
            setLapElapsed(0);
        }
    };

    const handleStopQuestionTracking = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        finalizeRunningLap('finish');
        pagerRef.current?.setPage(1);
    };

    const handleUndoLast = () => {
        if (!activeSegmentId) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const removed = undoLastQuestionInSegment(activeSegmentId);
        if (!removed) return;
        setQuestionNo(removed.questionNo);
        setLapStatus('RUNNING');
        setLapStartAt(removed.startedAt);
        setLapElapsed(Date.now() - removed.startedAt);
    };

    const handleFinishStudy = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        finalizeRunningLap('finish');
        pauseStopwatch();
        endSession();
        setLapStatus('IDLE');
        setActiveSubjectId(null);
        router.replace('/(tabs)/analysis');
    };

    const handleSubjectSelect = (id: string) => {
        Haptics.selectionAsync();
        setActiveSubjectId(id);
        setTimeout(() => pagerRef.current?.setPage(1), 300);
    };

    const selectedSubjectName = subjects.find(s => s.id === activeSubjectId)?.name || "과목 선택";
    const animatedBgColor = flashValue.interpolate({ inputRange: [0, 1], outputRange: [COLORS.white, '#EFFFFA'] });

    return (
        <SafeAreaView style={styles.container}>
            <PagerView
                style={styles.pager}
                initialPage={isSubjectSelected ? 1 : 0}
                onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
                ref={pagerRef}
                scrollEnabled={isSubjectSelected}
            >
                {/* PAGE 0: 과목 선택 (2열 그리드) */}
                <View key="0" style={styles.page}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.headerCircleBtn}>
                            <Ionicons name="close" size={22} color={COLORS.text} />
                        </TouchableOpacity>
                        <View style={styles.dotIndicator}>
                            <View style={[styles.dot, currentPage === 0 && styles.dotActive]} />
                            <View style={[styles.dot, currentPage === 1 && styles.dotActive]} />
                            <View style={[styles.dot, currentPage === 2 && styles.dotActive]} />
                        </View>
                        <View style={{ width: 44 }} />
                    </View>

                    <View style={styles.titleGroup}>
                        <Text style={styles.preTitle}>START STUDY</Text>
                        <Text style={styles.mainTitle}>과목 변경</Text>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.gridContainer}>
                        {subjects.filter(s => !s.isArchived).map(s => {
                            const isActive = activeSubjectId === s.id;
                            return (
                                <TouchableOpacity
                                    key={s.id}
                                    style={[styles.gridItem, isActive && styles.gridItemActive]}
                                    onPress={() => handleSubjectSelect(s.id)}
                                >
                                    <View style={[styles.gridIconBox, isActive && styles.gridIconBoxActive]}>
                                        <Ionicons name="book" size={20} color={isActive ? COLORS.white : COLORS.textMuted} />
                                    </View>
                                    <Text style={[styles.gridText, isActive && styles.gridTextActive]} numberOfLines={1}>{s.name}</Text>
                                    {isActive && <View style={styles.gridCheck}><Ionicons name="checkmark-circle" size={18} color={COLORS.primary} /></View>}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* PAGE 1: 메인 타이머 */}
                <View key="1" style={styles.page}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.headerCircleBtn}>
                            <Ionicons name="close" size={22} color={COLORS.text} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => pagerRef.current?.setPage(0)} style={styles.cleanSubjectTitle}>
                            <Text style={styles.cleanSubjectText}>{selectedSubjectName}</Text>
                            <Ionicons name="chevron-down" size={18} color={COLORS.primary} />
                        </TouchableOpacity>
                        <View style={styles.dotIndicator}>
                            <View style={[styles.dot, currentPage === 0 && styles.dotActive]} />
                            <View style={[styles.dot, currentPage === 1 && styles.dotActive]} />
                            <View style={[styles.dot, currentPage === 2 && styles.dotActive]} />
                        </View>
                    </View>

                    <View style={styles.timerWrapper}>
                        <Text style={styles.timerMainText} numberOfLines={1} adjustsFontSizeToFit>{formatTime(totalElapsedMs)}</Text>

                        <View style={styles.mainActionGroup}>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    stopwatch.isRunning ? pauseStopwatch() : startStopwatch();
                                }}
                            >
                                <LinearGradient
                                    colors={stopwatch.isRunning ? ['#444', '#222'] : [COLORS.primary, '#00D197']}
                                    style={styles.compactCircleBtn}
                                >
                                    <Ionicons name={stopwatch.isRunning ? "pause" : "play"} size={32} color={COLORS.white} style={!stopwatch.isRunning && { marginLeft: 4 }} />
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.bottomFinishBtn} onPress={handleFinishStudy}>
                                <Text style={styles.bottomFinishText}>공부 종료</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* PAGE 2: 문제 기록 (세로로 길게) */}
                <View key="2" style={[styles.page, { backgroundColor: COLORS.white }]}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={handleStopQuestionTracking} style={styles.headerCircleBtn}>
                            <Ionicons name="chevron-back" size={22} color={COLORS.text} />
                        </TouchableOpacity>
                        <Text style={styles.largeHeaderSubject}>{selectedSubjectName}</Text>
                        <View style={styles.dotIndicator}>
                            <View style={[styles.dot, currentPage === 0 && styles.dotActive]} />
                            <View style={[styles.dot, currentPage === 1 && styles.dotActive]} />
                            <View style={[styles.dot, currentPage === 2 && styles.dotActive]} />
                        </View>
                    </View>

                    <View style={styles.trackerContainer}>
                        <Pressable style={styles.tallTouchArea} onPress={handleLapTap}>
                            <Animated.View style={[styles.tallLapCard, { backgroundColor: animatedBgColor }]}>
                                <Text style={styles.lapQuestionNo}>{questionNo}번째 문제</Text>
                                <Text style={styles.lapTimerBig} numberOfLines={1} adjustsFontSizeToFit>{formatLapTime(lapElapsed)}</Text>
                                <View style={styles.tapGuide}>
                                    <Text style={styles.tapGuideText}>화면 어디든 탭하여 다음 문제</Text>
                                </View>
                            </Animated.View>
                        </Pressable>

                        <View style={styles.trackerActions}>
                            <TouchableOpacity
                                style={[styles.undoBtn, questionNo <= 1 && { opacity: 0.3 }]}
                                onPress={handleUndoLast}
                                disabled={questionNo <= 1}
                            >
                                <Ionicons name="refresh" size={16} color={COLORS.text} />
                                <Text style={styles.undoBtnText}>기록 취소</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.linkStopBtn} onPress={handleStopQuestionTracking}>
                                <Text style={styles.linkStopBtnText}>문제 기록 중단</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </PagerView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.white },
    pager: { flex: 1 },
    page: { flex: 1, paddingHorizontal: 24 },

    // Header
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
    headerCircleBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    dotIndicator: { flexDirection: 'row', gap: 4 },
    dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.border },
    dotActive: { width: 12, backgroundColor: COLORS.primary },

    // Page 0 (Selection - 2열 그리드)
    titleGroup: { marginTop: 16, marginBottom: 24 },
    preTitle: { fontSize: 11, fontWeight: '800', color: COLORS.primary, letterSpacing: 1.5, marginBottom: 4 },
    mainTitle: { fontSize: 26, fontWeight: '900', color: COLORS.text },
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 40 },
    gridItem: { width: '48%', backgroundColor: COLORS.bg, padding: 16, borderRadius: RADIUS.xl, marginBottom: 12, alignItems: 'center', justifyContent: 'center', minHeight: 120 },
    gridItemActive: { backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.primary, ...SHADOWS.small },
    gridIconBox: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    gridIconBoxActive: {},
    gridText: { fontSize: 16, fontWeight: '600', color: COLORS.textMuted },
    gridTextActive: { color: COLORS.text, fontWeight: '700' },
    gridCheck: { position: 'absolute', top: 10, right: 10 },

    // Page 1 (Main Timer)
    cleanSubjectTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    cleanSubjectText: { fontSize: 24, fontWeight: '800', color: COLORS.text },
    timerWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    timerMainText: { fontSize: 88, fontWeight: '900', color: COLORS.text, fontVariant: ['tabular-nums'], letterSpacing: -3, marginBottom: 60 },
    mainActionGroup: { alignItems: 'center', width: '100%' },
    compactCircleBtn: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', ...SHADOWS.medium },
    bottomFinishBtn: { marginTop: 120, padding: 15 },
    bottomFinishText: { fontSize: 15, color: COLORS.textMuted, fontWeight: '600', textDecorationLine: 'underline', opacity: 0.6 },

    // Page 2 (Question Tracker - 세로로 길게)
    largeHeaderSubject: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    trackerContainer: { flex: 1 },
    tallTouchArea: { flex: 1, marginVertical: 15 },
    tallLapCard: {
        flex: 1,
        borderRadius: 48,
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.bg,
        ...SHADOWS.medium
    },
    lapQuestionNo: { fontSize: 22, fontWeight: '800', color: COLORS.primary, marginBottom: 20 },
    lapTimerBig: { fontSize: 80, fontWeight: '900', color: COLORS.text, fontVariant: ['tabular-nums'], letterSpacing: -2 },
    tapGuide: { marginTop: 60, backgroundColor: COLORS.bg, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24 },
    tapGuideText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
    trackerActions: { paddingBottom: 20, alignItems: 'center', gap: 24 },
    undoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 28,
        height: 54,
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.xl,
        ...SHADOWS.small
    },
    undoBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.text },
    linkStopBtn: { padding: 10 },
    linkStopBtnText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600', textDecorationLine: 'underline', opacity: 0.4 },
});