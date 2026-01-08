import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Dimensions, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../lib/store';
import { COLORS } from '../lib/theme';
import { QuestionRecord } from '../lib/types';

const { width } = Dimensions.get('window');

export default function TimerScreen() {
    const router = useRouter();
    const {
        stopwatch, startStopwatch, pauseStopwatch,
        subjects, addSubject, addQuestionRecord,
        activeSubjectId, setActiveSubjectId
    } = useAppStore();

    const [now, setNow] = useState(Date.now());
    const [currentPage, setCurrentPage] = useState(1);
    const pagerRef = useRef<PagerView>(null);

    // 문제별 기록 상태
    const [questionNo, setQuestionNo] = useState(1);
    const [lapStatus, setLapStatus] = useState<'IDLE' | 'RUNNING'>('IDLE');
    const [lapStartAt, setLapStartAt] = useState<number | null>(null);
    const [lapElapsed, setLapElapsed] = useState(0);

    // 과목 추가 상태
    const [isAddingSubject, setIsAddingSubject] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');

    const isSubjectSelected = !!activeSubjectId;

    // 1. 자동 시작/일시정지 로직
    useFocusEffect(
        useCallback(() => {
            if (isSubjectSelected) startStopwatch();
            return () => pauseStopwatch();
        }, [isSubjectSelected])
    );

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState !== 'active') pauseStopwatch();
        });
        return () => subscription.remove();
    }, [pauseStopwatch]);

    // 2. 타이머 업데이트 루프
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
        const s = totalSeconds % 60;
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const formatLapTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // 문제 기록 로직 (탭 2에서 사용)
    const handleLapTap = () => {
        if (!isSubjectSelected) {
            pagerRef.current?.setPage(0);
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (!stopwatch.isRunning) startStopwatch();

        const nowTs = Date.now();
        if (lapStatus === 'IDLE') {
            setLapStatus('RUNNING');
            setLapStartAt(nowTs);
            setLapElapsed(0);
        } else {
            if (!lapStartAt || !activeSubjectId) return;
            const duration = nowTs - lapStartAt;
            const record: QuestionRecord = {
                id: Math.random().toString(36).substr(2, 9),
                userId: 'local-user',
                sessionId: 'current-session',
                subjectId: activeSubjectId,
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

    // 문제 기록만 중단하고 메인 타이머로 돌아가기
    const handleStopQuestionTracking = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (lapStatus === 'RUNNING' && lapStartAt && activeSubjectId) {
            const duration = Date.now() - lapStartAt;
            addQuestionRecord({
                id: Math.random().toString(36).substr(2, 9),
                userId: 'local-user',
                sessionId: 'current-session',
                subjectId: activeSubjectId,
                questionNo: questionNo,
                durationMs: duration,
                startedAt: lapStartAt,
                endedAt: Date.now(),
                source: 'finish',
            });
        }
        setLapStatus('IDLE');
        setLapStartAt(null);
        setLapElapsed(0);
        setQuestionNo(1);
        pagerRef.current?.setPage(1);
    };

    // 오늘 공부 완료
    const handleFinishStudy = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (lapStatus === 'RUNNING' && lapStartAt && activeSubjectId) {
            addQuestionRecord({
                id: Math.random().toString(36).substr(2, 9),
                userId: 'local-user',
                sessionId: 'current-session',
                subjectId: activeSubjectId,
                questionNo: questionNo,
                durationMs: Date.now() - lapStartAt,
                startedAt: lapStartAt,
                endedAt: Date.now(),
                source: 'finish',
            });
        }
        pauseStopwatch();
        setLapStatus('IDLE');
        setActiveSubjectId(null);
        router.replace('/(tabs)/analysis');
    };

    const handleSubjectSelect = (id: string) => {
        Haptics.selectionAsync();
        setActiveSubjectId(id);
        setLapStatus('IDLE');
        setLapElapsed(0);
        setQuestionNo(1);
        setTimeout(() => pagerRef.current?.setPage(1), 300);
    };

    const confirmAddSubject = () => {
        if (newSubjectName.trim()) {
            addSubject(newSubjectName.trim());
            setNewSubjectName('');
            setIsAddingSubject(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    const selectedSubjectName = subjects.find(s => s.id === activeSubjectId)?.name || "과목을 선택해주세요";

    return (
        <SafeAreaView style={styles.container}>
            <PagerView
                style={styles.pager}
                initialPage={isSubjectSelected ? 1 : 0}
                onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
                ref={pagerRef}
                scrollEnabled={isSubjectSelected}
            >
                {/* PAGE 0: 과목 선택 */}
                <View key="0" style={styles.page}>
                    <View style={styles.pageHeaderContainer}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                        <View style={styles.tabDots}>
                            <View style={[styles.dot, currentPage === 0 && styles.activeDot]} />
                            <View style={[styles.dot, currentPage === 1 && styles.activeDot]} />
                            <View style={[styles.dot, currentPage === 2 && styles.activeDot]} />
                        </View>
                        <View style={{ width: 44 }} />
                    </View>

                    <View style={styles.subjectSelectionContent}>
                        <View style={styles.subjectHeader}>
                            <Text style={styles.pageSubtitle}>Ready to Study</Text>
                            <Text style={styles.pageTitle}>어떤 과목을{"\n"}공부할까요?</Text>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                            {subjects.filter(s => !s.isArchived).map(s => {
                                const isActive = activeSubjectId === s.id;
                                return (
                                    <TouchableOpacity
                                        key={s.id}
                                        style={[styles.wideSubjectCard, isActive && styles.activeWideCard]}
                                        onPress={() => handleSubjectSelect(s.id)}
                                    >
                                        <View style={[styles.wideIconBox, isActive && styles.activeWideIconBox]}>
                                            <Ionicons name={isActive ? "book" : "book-outline"} size={22} color={isActive ? COLORS.white : COLORS.textMuted} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.wideSubjectName, isActive && styles.activeWideSubjectName]}>{s.name}</Text>
                                        </View>
                                        {isActive && <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />}
                                    </TouchableOpacity>
                                );
                            })}

                            {isAddingSubject ? (
                                <View style={[styles.wideSubjectCard, styles.activeWideCard]}>
                                    <TextInput
                                        style={styles.wideInputInline}
                                        placeholder="과목 이름 입력..."
                                        value={newSubjectName}
                                        onChangeText={setNewSubjectName}
                                        autoFocus
                                        onSubmitEditing={confirmAddSubject}
                                    />
                                    <TouchableOpacity onPress={confirmAddSubject} style={styles.confirmInlineBtn}>
                                        <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity style={styles.addWideCard} onPress={() => setIsAddingSubject(true)}>
                                    <Ionicons name="add" size={20} color={COLORS.textMuted} />
                                    <Text style={styles.addWideText}>새 과목 만들기</Text>
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    </View>
                </View>

                {/* PAGE 1: 메인 타이머 */}
                <View key="1" style={styles.page}>
                    <View style={styles.pageHeaderContainer}>
                        <View style={{ width: 44 }} />
                        <View style={styles.tabDots}>
                            <View style={[styles.dot, currentPage === 0 && styles.activeDot]} />
                            <View style={[styles.dot, currentPage === 1 && styles.activeDot]} />
                            <View style={[styles.dot, currentPage === 2 && styles.activeDot]} />
                        </View>
                        <View style={{ width: 44 }} />
                    </View>

                    <View style={styles.timerContent}>
                        <View style={styles.currentSubjectBadge}>
                            <Text style={styles.subjectBadgeText}>{selectedSubjectName}</Text>
                        </View>
                        <Text style={styles.timerLabel}>오늘 누적 공부 시간</Text>
                        <Text style={styles.mainTimer}>{formatTime(totalElapsedMs)}</Text>

                        <TouchableOpacity style={styles.bigCircleWrapper} onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            stopwatch.isRunning ? pauseStopwatch() : startStopwatch();
                        }}>
                            <LinearGradient colors={stopwatch.isRunning ? ['#444', '#222'] : [COLORS.primary, '#00E6A5']} style={styles.bigCircle}>
                                <Ionicons name={stopwatch.isRunning ? "pause" : "play"} size={52} color={COLORS.white} />
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.finishSessionBtn} onPress={handleFinishStudy}>
                            <Text style={styles.finishSessionBtnText}>오늘 공부 마치기</Text>
                        </TouchableOpacity>

                        <View style={styles.swipeHint}>
                            <View style={styles.hintColumn}><Ionicons name="arrow-back" size={16} color={COLORS.textMuted} /><Text style={styles.hintText}>과목 바꾸기</Text></View>
                            <View style={styles.hintColumn}><Ionicons name="arrow-forward" size={16} color={COLORS.textMuted} /><Text style={styles.hintText}>문제별 기록</Text></View>
                        </View>
                    </View>
                </View>

                {/* PAGE 2: 문제별 기록 */}
                <View key="2" style={styles.page}>
                    <View style={styles.pageHeaderContainer}>
                        <View style={{ width: 44 }} />
                        <View style={styles.tabDots}>
                            <View style={[styles.dot, currentPage === 0 && styles.activeDot]} />
                            <View style={[styles.dot, currentPage === 1 && styles.activeDot]} />
                            <View style={[styles.dot, currentPage === 2 && styles.activeDot]} />
                        </View>
                        <View style={{ width: 44 }} />
                    </View>

                    <View style={styles.trackerContent}>
                        <View style={styles.totalStatsHeader}>
                            <Text style={styles.totalStatsLabel}>지금은 열공 중!</Text>
                            <Text style={styles.totalStatsValue}>{formatTime(totalElapsedMs)}</Text>
                        </View>

                        <TouchableOpacity style={styles.lapCenterContent} activeOpacity={0.8} onPress={handleLapTap}>
                            <View style={styles.lapInfoMini}>
                                <Text style={styles.lapQMini}>{questionNo}번 문제</Text>
                                <Text style={styles.lapSubjectMini}>{selectedSubjectName}</Text>
                            </View>
                            <Text style={styles.lapTimeHuge}>{formatLapTime(lapElapsed)}</Text>
                            <View style={styles.tapTip}><Text style={styles.tapTipText}>화면을 탭하면 다음 문제로</Text></View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.stopTrackingBtn} onPress={handleStopQuestionTracking}>
                            <LinearGradient colors={['#F8F9FA', '#E9ECEF']} style={styles.stopTrackingGradient}>
                                <Text style={styles.stopTrackingBtnText}>문제 기록 그만하기</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </PagerView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    pager: { flex: 1 },
    page: { flex: 1, paddingHorizontal: 24 },
    pageHeaderContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
    closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
    tabDots: { flexDirection: 'row', gap: 6 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.border },
    activeDot: { backgroundColor: COLORS.primary, width: 18, height: 6, borderRadius: 3 },

    // Page 0
    subjectSelectionContent: { flex: 1 },
    subjectHeader: { marginBottom: 30, marginTop: 10 },
    pageSubtitle: { fontSize: 13, color: COLORS.primary, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
    pageTitle: { fontSize: 26, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5, lineHeight: 34 },
    wideSubjectCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, padding: 18, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    activeWideCard: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '05' },
    wideIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    activeWideIconBox: { backgroundColor: COLORS.primary },
    wideSubjectName: { fontSize: 17, fontWeight: '700', color: COLORS.text },
    activeWideSubjectName: { color: COLORS.primary },
    addWideCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed', marginTop: 10, gap: 8 },
    addWideText: { fontSize: 15, color: COLORS.textMuted, fontWeight: '600' },
    wideInputInline: { flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.text },
    confirmInlineBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },

    // Page 1
    timerContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    currentSubjectBadge: { backgroundColor: COLORS.white, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: COLORS.primary },
    subjectBadgeText: { color: COLORS.primary, fontWeight: '800', fontSize: 14 },
    timerLabel: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
    mainTimer: { fontSize: 72, fontWeight: '900', color: COLORS.text, fontVariant: ['tabular-nums'], letterSpacing: -2 },
    bigCircleWrapper: { marginTop: 40, marginBottom: 30 },
    bigCircle: { width: 130, height: 130, borderRadius: 65, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
    finishSessionBtn: { paddingVertical: 14, paddingHorizontal: 28, borderRadius: 16, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
    finishSessionBtnText: { color: '#FF3B30', fontWeight: '800', fontSize: 15 },
    swipeHint: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 50 },
    hintColumn: { flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.6 },
    hintText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '700' },

    // Page 2
    trackerContent: { flex: 1, paddingTop: 10 },
    totalStatsHeader: { alignItems: 'center', paddingVertical: 14, backgroundColor: COLORS.white, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
    totalStatsLabel: { fontSize: 12, fontWeight: '700', color: COLORS.primary, marginBottom: 2 },
    totalStatsValue: { fontSize: 20, fontWeight: '800', color: COLORS.text },
    lapCenterContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    lapInfoMini: { alignItems: 'center', marginBottom: 20 },
    lapQMini: { fontSize: 24, fontWeight: '800', color: COLORS.text },
    lapSubjectMini: { fontSize: 15, color: COLORS.textMuted, fontWeight: '500' },
    lapTimeHuge: { fontSize: 90, fontWeight: '900', color: COLORS.text, fontVariant: ['tabular-nums'] },
    tapTip: { marginTop: 30, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: COLORS.bg },
    tapTipText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
    stopTrackingBtn: { marginBottom: 30 },
    stopTrackingGradient: { paddingVertical: 20, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
    stopTrackingBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.text },
});