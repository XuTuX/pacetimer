import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../lib/store';
import { COLORS } from '../lib/theme';
import { QuestionRecord } from '../lib/types';

export default function TimerScreen() {
    const router = useRouter();
    const {
        stopwatch, startStopwatch, pauseStopwatch,
        subjects, addSubject, addQuestionRecord,
        activeSubjectId, setActiveSubjectId
    } = useAppStore();

    const [now, setNow] = useState(Date.now());
    const [currentPage, setCurrentPage] = useState(1); // Default to Center
    const pagerRef = useRef<PagerView>(null);

    // Problem Solving State
    const [questionNo, setQuestionNo] = useState(1);
    const [lapStatus, setLapStatus] = useState<'IDLE' | 'RUNNING'>('IDLE');
    const [lapStartAt, setLapStartAt] = useState<number | null>(null);
    const [lapElapsed, setLapElapsed] = useState(0);
    const [isAddingSubject, setIsAddingSubject] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');

    const isSubjectSelected = !!activeSubjectId;

    // 2. Auto-pause logic
    useFocusEffect(
        useCallback(() => {
            // Only auto-start if subject is selected
            if (isSubjectSelected) {
                startStopwatch();
            }

            return () => {
                pauseStopwatch();
            };
        }, [startStopwatch, pauseStopwatch, isSubjectSelected])
    );

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState !== 'active') {
                pauseStopwatch();
            }
        });
        return () => subscription.remove();
    }, [pauseStopwatch]);

    // 3. Timer Update Loop
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

    const handleLapTap = () => {
        if (!isSubjectSelected) {
            pagerRef.current?.setPage(0);
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (!stopwatch.isRunning) {
            startStopwatch();
        }

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

    const toggleStopwatch = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (stopwatch.isRunning) {
            pauseStopwatch();
        } else {
            startStopwatch();
        }
    };

    const handleSubjectSelect = (id: string) => {
        if (activeSubjectId === id) {
            pagerRef.current?.setPage(1);
            return;
        }

        // Reset states for new subject
        setLapStatus('IDLE');
        setLapStartAt(null);
        setLapElapsed(0);
        setQuestionNo(1);
        setActiveSubjectId(id);

        // Move to main timer
        setTimeout(() => {
            pagerRef.current?.setPage(1);
        }, 300);
    };

    const handleFinishStudy = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Record current lap if running
        if (lapStatus === 'RUNNING' && lapStartAt && activeSubjectId) {
            const nowTs = Date.now();
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
                source: 'finish',
            };
            addQuestionRecord(record);
        }

        // Reset and go back
        pauseStopwatch();
        setLapStatus('IDLE');
        setLapStartAt(null);
        setLapElapsed(0);
        setQuestionNo(1);
        setActiveSubjectId(null);
        router.replace('/(tabs)/analysis');
    };

    const handleQuickAddSubject = () => {
        setIsAddingSubject(true);
    };

    const confirmAddSubject = () => {
        if (newSubjectName.trim()) {
            addSubject(newSubjectName.trim());
            setNewSubjectName('');
            setIsAddingSubject(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    const selectedSubjectName = subjects.find(s => s.id === activeSubjectId)?.name || "과목 선택 필요";

    return (
        <SafeAreaView style={styles.container}>
            <PagerView
                style={styles.pager}
                initialPage={isSubjectSelected ? 1 : 0}
                onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
                ref={pagerRef}
                scrollEnabled={isSubjectSelected}
            >
                {/* PAGE 0: SUBJECT SELECTION (LEFT) */}
                <View key="0" style={styles.page}>
                    <View style={styles.pageHeaderContainer}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
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
                            <Text style={styles.pageSubtitle}>어떤 과목을 공부할까요?</Text>
                            <Text style={styles.pageTitle}>과목 선택</Text>
                        </View>

                        <ScrollView
                            contentContainerStyle={styles.subjectScroll}
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.subjectGrid}>
                                {subjects.filter(s => !s.isArchived).map(s => (
                                    <TouchableOpacity
                                        key={s.id}
                                        style={[styles.subjectCard, activeSubjectId === s.id && styles.activeSubjectCard]}
                                        onPress={() => handleSubjectSelect(s.id)}
                                        activeOpacity={0.7}
                                    >
                                        <LinearGradient
                                            colors={activeSubjectId === s.id ? [COLORS.primaryLight, COLORS.white] : [COLORS.white, COLORS.white]}
                                            style={styles.subjectCardGradient}
                                        >
                                            <View style={[styles.subjectIcon, activeSubjectId === s.id && styles.activeSubjectIcon]}>
                                                <Ionicons
                                                    name="book"
                                                    size={24}
                                                    color={activeSubjectId === s.id ? COLORS.primary : COLORS.textMuted}
                                                />
                                            </View>
                                            <Text style={[styles.subjectName, activeSubjectId === s.id && styles.activeSubjectName]}>
                                                {s.name}
                                            </Text>
                                            {activeSubjectId === s.id && (
                                                <View style={styles.checkIcon}>
                                                    <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                                                </View>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                ))}

                                {isAddingSubject && (
                                    <View style={[styles.subjectCard, styles.activeSubjectCard]}>
                                        <View style={styles.subjectCardPadding}>
                                            <TextInput
                                                style={styles.subjectInputInline}
                                                placeholder="과목명"
                                                value={newSubjectName}
                                                onChangeText={setNewSubjectName}
                                                autoFocus
                                                returnKeyType="done"
                                                onSubmitEditing={confirmAddSubject}
                                                onBlur={() => {
                                                    if (!newSubjectName.trim()) setIsAddingSubject(false);
                                                }}
                                            />
                                            <TouchableOpacity onPress={confirmAddSubject} style={styles.confirmInlineBtn}>
                                                <Ionicons name="checkmark" size={20} color={COLORS.white} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                                {!isAddingSubject && (
                                    <TouchableOpacity
                                        style={styles.addSubjectCard}
                                        onPress={handleQuickAddSubject}
                                        activeOpacity={0.6}
                                    >
                                        <View style={styles.addIconCircle}>
                                            <Ionicons name="add" size={32} color={COLORS.primary} />
                                        </View>
                                        <Text style={styles.addText}>새 과목 추가</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </ScrollView>

                        {!isSubjectSelected && (
                            <View style={styles.bottomTip}>
                                <Ionicons name="information-circle-outline" size={16} color={COLORS.textMuted} />
                                <Text style={styles.tipText}>과목을 선택해야 타이머를 시작할 수 있습니다.</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* PAGE 1: GLOBAL TIMER (CENTER) */}
                <View key="1" style={styles.page}>
                    <View style={styles.pageHeaderContainer}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                            <Ionicons name="close" size={24} color={COLORS.text} />
                        </TouchableOpacity>
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

                        <Text style={styles.timerLabel}>오늘 총 집중 시간</Text>
                        <Text style={styles.mainTimer}>{formatTime(totalElapsedMs)}</Text>

                        <TouchableOpacity
                            style={styles.bigCircleWrapper}
                            onPress={toggleStopwatch}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={stopwatch.isRunning ? [COLORS.text, '#444'] : [COLORS.primary, '#00E6A5']}
                                style={styles.bigCircle}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Ionicons name={stopwatch.isRunning ? "pause" : "play"} size={52} color={COLORS.white} />
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={[styles.swipeHint, { opacity: isSubjectSelected ? 1 : 0 }]}>
                            <View style={styles.hintColumn}>
                                <Ionicons name="arrow-back" size={20} color={COLORS.textMuted} />
                                <Text style={styles.hintText}>과목 변경</Text>
                            </View>
                            <View style={styles.hintColumn}>
                                <Ionicons name="arrow-forward" size={20} color={COLORS.textMuted} />
                                <Text style={styles.hintText}>문항별 기록</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* PAGE 2: QUESTION TRACKER (RIGHT) */}
                <View key="2" style={styles.page}>
                    <View style={styles.pageHeaderContainer}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                            <Ionicons name="close" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                        <View style={styles.tabDots}>
                            <View style={[styles.dot, currentPage === 0 && styles.activeDot]} />
                            <View style={[styles.dot, currentPage === 1 && styles.activeDot]} />
                            <View style={[styles.dot, currentPage === 2 && styles.activeDot]} />
                        </View>
                        <View style={{ width: 44 }} />
                    </View>

                    <View style={styles.trackerContent}>
                        <View style={styles.totalStatsHeader}>
                            <Text style={styles.totalStatsLabel}>오늘 총 집중 시간</Text>
                            <Text style={styles.totalStatsValue}>{formatTime(totalElapsedMs)}</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.lapCenterContent}
                            activeOpacity={0.8}
                            onPress={handleLapTap}
                            disabled={!activeSubjectId}
                        >
                            <View style={styles.lapInfoMini}>
                                <Text style={styles.lapQMini}>{questionNo}번 문항</Text>
                                <Text style={styles.lapSubjectMini}>{selectedSubjectName}</Text>
                            </View>

                            <Text style={styles.lapTimeHuge}>
                                {formatLapTime(lapElapsed)}
                            </Text>

                            <View style={styles.lapActionPrompt}>
                                <Text style={styles.lapActionPromptText}>
                                    {lapStatus === 'IDLE' ? '터치하여 시작' : '터치하여 해결 완료'}
                                </Text>
                            </View>

                            {!stopwatch.isRunning && lapStatus === 'RUNNING' && (
                                <View style={styles.pauseIndicator}>
                                    <Ionicons name="pause" size={20} color={COLORS.accent} />
                                    <Text style={styles.pauseIndicatorText}>전체 타이머가 정지됨</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.finishBtn}
                            onPress={handleFinishStudy}
                        >
                            <LinearGradient
                                colors={[COLORS.primary, '#00E6A5']}
                                style={styles.finishBtnGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Text style={styles.finishBtnText}>공부 끝내기 (분석으로)</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.simpleBackBtn}
                            onPress={() => pagerRef.current?.setPage(1)}
                        >
                            <Text style={styles.simpleBackText}>전체 타이머로 돌아가기</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </PagerView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    pageHeaderContainer: {
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
    tabDots: {
        flexDirection: 'row',
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.border,
    },
    activeDot: {
        backgroundColor: COLORS.primary,
        width: 18,
        height: 6,
        borderRadius: 3,
    },
    pager: {
        flex: 1,
    },
    page: {
        flex: 1,
        paddingHorizontal: 24,
    },
    pageHeader: {
        marginBottom: 24,
    },
    pageSubtitle: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '700',
        marginBottom: 4,
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.text,
    },
    subjectSelectionContent: {
        flex: 1,
    },
    subjectHeader: {
        paddingVertical: 20,
        marginBottom: 8,
    },
    subjectScroll: {
        paddingBottom: 40,
    },
    subjectGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    subjectCard: {
        width: '48%',
        backgroundColor: COLORS.white,
        borderRadius: 28,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
    },
    subjectCardGradient: {
        padding: 24,
        alignItems: 'center',
    },
    subjectCardPadding: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        height: 140,
    },
    subjectInputInline: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        textAlign: 'center',
        width: '100%',
        marginBottom: 16,
    },
    confirmInlineBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeSubjectCard: {
        borderColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 5,
    },
    subjectIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    activeSubjectIcon: {
        backgroundColor: COLORS.white,
    },
    subjectName: {
        fontSize: 17,
        fontWeight: '800',
        color: COLORS.text,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    activeSubjectName: {
        color: COLORS.primary,
    },
    checkIcon: {
        position: 'absolute',
        top: 14,
        right: 14,
    },
    addSubjectCard: {
        width: '48%',
        height: 140,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
        backgroundColor: COLORS.surfaceVariant,
    },
    addIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    addText: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.primary,
    },
    bottomTip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        justifyContent: 'center',
        paddingVertical: 20,
    },
    tipText: {
        fontSize: 13,
        color: COLORS.textMuted,
        fontWeight: '500',
    },
    timerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    currentSubjectBadge: {
        backgroundColor: COLORS.white,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    subjectBadgeText: {
        color: COLORS.primary,
        fontWeight: '800',
        fontSize: 14,
        letterSpacing: -0.5,
    },
    timerLabel: {
        fontSize: 15,
        color: COLORS.textMuted,
        fontWeight: '600',
        marginBottom: 4,
    },
    mainTimer: {
        fontSize: 84,
        fontWeight: '900',
        color: COLORS.text,
        fontVariant: ['tabular-nums'],
        letterSpacing: -2,
    },
    bigCircleWrapper: {
        marginTop: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 12,
    },
    bigCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        alignItems: 'center',
        justifyContent: 'center',
    },
    swipeHint: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 80,
        paddingHorizontal: 20,
    },
    hintColumn: {
        alignItems: 'center',
        gap: 8,
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    hintText: {
        fontSize: 13,
        color: COLORS.textMuted,
        fontWeight: '700',
    },
    trackerContent: {
        flex: 1,
        paddingTop: 10,
    },
    finishBtn: {
        marginHorizontal: 24,
        marginBottom: 8,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 8,
    },
    finishBtnGradient: {
        paddingVertical: 20,
        borderRadius: 24,
        alignItems: 'center',
    },
    finishBtnText: {
        fontSize: 16,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: -0.5,
    },
    pauseIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 20,
        backgroundColor: COLORS.accentLight,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    pauseIndicatorText: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.accent,
    },
    totalStatsHeader: {
        alignItems: 'center',
        paddingVertical: 14,
        backgroundColor: COLORS.white,
        borderRadius: 24,
        marginHorizontal: 24,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 10,
    },
    totalStatsLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textMuted,
        marginBottom: 2,
    },
    totalStatsValue: {
        fontSize: 22,
        fontWeight: '800',
        color: COLORS.text,
        fontVariant: ['tabular-nums'],
    },
    lapCenterContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    lapInfoMini: {
        alignItems: 'center',
        marginBottom: 20,
    },
    lapQMini: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 4,
    },
    lapSubjectMini: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    lapTimeHuge: {
        fontSize: 100,
        fontWeight: '900',
        color: COLORS.text,
        fontVariant: ['tabular-nums'],
        letterSpacing: -4,
    },
    lapActionPrompt: {
        marginTop: 40,
        paddingHorizontal: 30,
        paddingVertical: 16,
        borderRadius: 30,
        backgroundColor: COLORS.primaryLight,
    },
    lapActionPromptActive: {
        backgroundColor: COLORS.white,
    },
    lapActionPromptText: {
        fontSize: 17,
        fontWeight: '800',
        color: COLORS.primary,
    },
    lapActionPromptTextActive: {
        color: COLORS.primary,
    },
    whiteText: {
        color: COLORS.white,
    },
    whiteTextMuted: {
        color: 'rgba(255,255,255,0.7)',
    },
    simpleBackBtn: {
        paddingVertical: 30,
        alignItems: 'center',
    },
    simpleBackText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    backBtnDark: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderColor: 'transparent',
    },
    dotWhite: {
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    sheetContainer: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        padding: 30,
        paddingBottom: 50,
        gap: 24,
    },
    sheetHandle: {
        width: 50,
        height: 6,
        backgroundColor: COLORS.border,
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 4,
    },
    sheetTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: COLORS.text,
        textAlign: 'center',
    },
    sheetInput: {
        backgroundColor: COLORS.bg,
        borderRadius: 20,
        padding: 20,
        fontSize: 18,
        color: COLORS.text,
        borderWidth: 1.5,
        borderColor: COLORS.border,
    },
    sheetSubmit: {
        backgroundColor: COLORS.primary,
        paddingVertical: 20,
        borderRadius: 24,
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    sheetSubmitText: {
        fontSize: 18,
        fontWeight: '900',
        color: COLORS.white,
    },
});

