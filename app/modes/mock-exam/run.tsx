import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../../lib/store';
import { COLORS } from '../../../lib/theme';

export default function MockExamRunScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const subjectIdsParam = useMemo(() => String(params.subjectIds ?? ''), [params.subjectIds]);
    const subjectIds = useMemo(() => subjectIdsParam.split(',').filter(Boolean), [subjectIdsParam]);
    const limitMin = useMemo(() => parseInt(String(params.limitMin ?? '0'), 10) || 0, [params.limitMin]);
    const totalQuestions = useMemo(() => parseInt(String(params.totalQuestions ?? '0'), 10) || 0, [params.totalQuestions]);

    const { subjects, pauseStopwatch, setActiveSubjectId, addQuestionRecord, startSession, startSegment, endSegment, endSession } = useAppStore();
    const activeSubjects = subjects.filter(s => subjectIds.includes(s.id));

    const examStartedAt = useRef(Date.now()).current;
    const [currentSubjectId, setCurrentSubjectId] = useState(subjectIds[0]);
    const [remainingSec, setRemainingSec] = useState(limitMin * 60);
    const [answeredCount, setAnsweredCount] = useState(0);
    const [isReviewMode, setIsReviewMode] = useState(false); // 검토 모드 여부 추가

    // 문항별/검토용 타이머
    const [lapStartAt, setLapStartAt] = useState(examStartedAt);
    const [lapElapsed, setLapElapsed] = useState(0);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [segmentId, setSegmentId] = useState<string | null>(null);

    useEffect(() => {
        // Ensure study timer isn't running while in mock-exam mode.
        pauseStopwatch();
        setActiveSubjectId(null);

        // Close any dangling session, then open a fresh mock-exam session.
        endSession();
        const id = startSession('mock-exam', {
            title: '모의고사',
            mockExam: {
                subjectIds,
                timeLimitSec: limitMin * 60,
                targetQuestions: totalQuestions,
            },
        });
        setSessionId(id);
        const segId = startSegment({ sessionId: id, subjectId: subjectIds[0], kind: 'solve', startedAt: examStartedAt });
        setSegmentId(segId);

        return () => {
            endSession();
        };
    }, [pauseStopwatch, setActiveSubjectId, endSession, startSession, startSegment, subjectIds, limitMin, totalQuestions, examStartedAt]);

    useEffect(() => {
        const interval = setInterval(() => {
            const elapsedSec = Math.floor((Date.now() - examStartedAt) / 1000);
            const remain = (limitMin * 60) - elapsedSec;
            setRemainingSec(remain > 0 ? remain : 0);
            setLapElapsed(Date.now() - lapStartAt);
        }, 16);

        return () => clearInterval(interval);
    }, [examStartedAt, limitMin, lapStartAt]);

    useEffect(() => {
        if (remainingSec > 0) return;

        const t = Date.now();
        if (segmentId) endSegment(segmentId, t);
        endSession();

        router.replace('/(tabs)');
    }, [remainingSec]);


    const handleNextQuestion = useCallback(() => {
        const now = Date.now();
        const duration = now - lapStartAt;

        // 1. 이미 검토 모드인 경우 -> 종료 확인
        if (isReviewMode) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert("시험 종료", "모든 과정을 마치고 종료하시겠습니까?", [
                { text: "취소", style: "cancel" },
                {
                    text: "종료",
                    onPress: () => {
                        const t = Date.now();
                        if (segmentId) endSegment(segmentId, t);
                        endSession();

                        // 🔥 홈으로 이동 (뒤로 가기 스택 제거)
                        router.replace('/(tabs)');

                    }

                }
            ]);
            return;
        }

        if (!sessionId || !segmentId) return;

        // 2. 문항 기록 저장
        addQuestionRecord({
            sessionId,
            segmentId,
            subjectId: currentSubjectId,
            durationMs: duration,
            startedAt: lapStartAt,
            endedAt: now,
            source: 'tap',
        });

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // 3. 마지막 문제였는지 확인
        if (answeredCount + 1 >= totalQuestions) {
            // End solving segment and enter review segment
            endSegment(segmentId, now);
            const reviewSegId = startSegment({ sessionId, subjectId: '__review__', kind: 'review', startedAt: now });
            setSegmentId(reviewSegId);
            setIsReviewMode(true); // 검토 모드 진입
            setLapStartAt(now); // 검토 타이머 시작
            setLapElapsed(0);
        } else {
            setAnsweredCount(prev => prev + 1);
            setLapStartAt(now);
            setLapElapsed(0);
        }
    }, [lapStartAt, answeredCount, currentSubjectId, totalQuestions, isReviewMode, sessionId, segmentId, addQuestionRecord, endSegment, startSegment, endSession, router]);

    const formatTime = (ms: number) => {
        const s = Math.floor(ms / 1000);
        const m = Math.floor(s / 60);
        const dec = Math.floor((ms % 1000) / 10);
        return `${m}:${(s % 60).toString().padStart(2, '0')}.${dec.toString().padStart(2, '0')}`;
    };

    const formatSec = (s: number) => {
        const m = Math.floor(s / 60);
        return `${m}:${(s % 60).toString().padStart(2, '0')}`;
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                {/* 왼쪽: 남은 시간 */}
                <View style={styles.headerSide}>
                    <Text style={styles.label}>남은 시간</Text>
                    <Text style={[styles.examTimer, remainingSec < 300 && { color: '#FF6B6B' }]}>
                        {formatSec(remainingSec)}
                    </Text>
                </View>

                {/* 가운데: 과목명 */}
                <View style={styles.headerCenter}>
                    <Text style={styles.headerSubject}>
                        {isReviewMode
                            ? "검토"
                            : activeSubjects.find(s => s.id === currentSubjectId)?.name}
                    </Text>
                </View>

                {/* 오른쪽: 진행도 */}
                <View style={styles.headerSideRight}>
                    <Text style={styles.label}>진행도</Text>
                    <Text style={styles.progressText}>
                        {isReviewMode ? "완료" : `${answeredCount + 1} / ${totalQuestions}`}
                    </Text>
                </View>
            </View>




            {/* 메인 터치 영역 */}
            <Pressable
                style={({ pressed }) => [
                    styles.touchArea,
                    pressed && { backgroundColor: isReviewMode ? '#FFF4F4' : COLORS.primaryLight },
                    isReviewMode && { borderColor: COLORS.primary, borderStyle: 'solid' }
                ]}
                onPress={handleNextQuestion}
            >
                <View style={styles.qInfo}>

                    <Text style={[styles.qNumber, isReviewMode && { color: COLORS.primary }]}>
                        {isReviewMode ? "검토 시간" : `${answeredCount + 1}번`}
                    </Text>
                </View>

                <Text style={styles.lapTime}>{formatTime(lapElapsed)}</Text>

                <View style={styles.tapHint}>
                    <Ionicons
                        name={isReviewMode ? "checkmark-done-circle" : "finger-print"}
                        size={24}
                        color={COLORS.primary}
                    />
                    <Text style={styles.tapHintText}>
                        {isReviewMode ? "터치하면 시험을 최종 종료합니다" : "화면을 터치하면 다음 문항으로 넘어갑니다"}
                    </Text>
                </View>
            </Pressable>

            <TouchableOpacity
                onPress={() => {
                    const t = Date.now();
                    if (segmentId) endSegment(segmentId, t);
                    endSession();
                    router.replace('/(tabs)');
                }}
                style={styles.exitBtn}
            >
                <Text style={styles.exitBtnText}>시험 중단하기</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 20,
    },

    headerSide: {
        width: 90,
    },

    headerSideRight: {
        width: 90,
        alignItems: 'flex-end',
    },

    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerSubject: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.text,
        letterSpacing: -0.3,
    },


    container: { flex: 1, backgroundColor: COLORS.bg },
    label: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginBottom: 4 },
    examTimer: { fontSize: 28, fontWeight: '900', color: COLORS.text, fontVariant: ['tabular-nums'] },
    progressText: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
    tabBar: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 20 },
    tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    activeTab: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    tabText: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
    activeTabText: { color: COLORS.white },

    touchArea: {
        flex: 1,
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 32,
        backgroundColor: COLORS.surface,
        borderWidth: 2,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    qInfo: { alignItems: 'center', marginBottom: 20 },
    qSubjectName: { fontSize: 18, fontWeight: '600', color: COLORS.textMuted },
    qNumber: { fontSize: 44, fontWeight: '900', color: COLORS.text },
    lapTime: { fontSize: 64, fontWeight: '900', color: COLORS.primary, fontVariant: ['tabular-nums'], marginVertical: 20 },
    tapHint: { alignItems: 'center', gap: 8, opacity: 0.7 },
    tapHintText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted, textAlign: 'center' },

    exitBtn: { alignSelf: 'center', marginBottom: 20, padding: 10 },
    exitBtnText: { color: COLORS.textMuted, fontWeight: '600', textDecorationLine: 'underline' }
});
