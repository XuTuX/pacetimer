import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    AppState,
    Pressable,
    StyleSheet,
    Text,
    View,
    type AppStateStatus
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Database } from "../../../../../lib/db-types";
import {
    INTERRUPTION_CONFIG,
    formatInterruptionDuration
} from "../../../../../lib/interruptionHandler";
import { useAppStore } from "../../../../../lib/store";
import { useSupabase } from "../../../../../lib/supabase";
import { formatSupabaseError } from "../../../../../lib/supabaseError";
import { COLORS } from "../../../../../lib/theme";

type RoomExamRow = Database["public"]["Tables"]["room_exams"]["Row"];
type AttemptRow = Database["public"]["Tables"]["attempts"]["Row"];
type AttemptRecordRow = Database["public"]["Tables"]["attempt_records"]["Row"];

function formatTime(ms: number) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const dec = Math.floor((ms % 1000) / 10);
    return `${m}:${(s % 60).toString().padStart(2, '0')}.${dec.toString().padStart(2, '0')}`;
}

function formatSec(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function ExamRunScreen() {
    useKeepAwake();
    const supabase = useSupabase();
    const router = useRouter();
    const { isLoaded, userId } = useAuth();
    const { id, examId } = useLocalSearchParams<{ id: string; examId: string }>();

    const { pauseStopwatch, startSession, endSession, startSegment, endSegment, addQuestionRecord } = useAppStore();

    const roomId = Array.isArray(id) ? id[0] : id;
    const currentExamId = Array.isArray(examId) ? examId[0] : examId;

    const [loading, setLoading] = useState(true);
    const [exam, setExam] = useState<RoomExamRow | null>(null);
    const [attemptId, setAttemptId] = useState<string | null>(null);
    const [startedAtTime, setStartedAtTime] = useState<number | null>(null);

    // Local Store Session State
    const [localSessionId, setLocalSessionId] = useState<string | null>(null);
    const [localSegmentId, setLocalSegmentId] = useState<string | null>(null);

    // Timer State
    const [now, setNow] = useState(Date.now());
    const [questionIndex, setQuestionIndex] = useState(1);
    const [lastLapTime, setLastLapTime] = useState<number>(Date.now());
    const [isCompleted, setIsCompleted] = useState(false);

    // Interruption Handler State
    const [interruptionCount, setInterruptionCount] = useState(0);
    const [totalInterruptionMs, setTotalInterruptionMs] = useState(0);
    const [showInterruptionWarning, setShowInterruptionWarning] = useState<string | null>(null);
    const interruptionStartRef = useRef<number | null>(null);
    const appState = useRef(AppState.currentState);

    const navigation = useNavigation();

    // 1. Timer Tick
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 16);
        return () => clearInterval(interval);
    }, []);

    // 1.1 Prevent accidental navigation
    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            if (isCompleted || loading) return; // Allow if finished or still loading initial state

            e.preventDefault();
            Alert.alert(
                '시험 중단 불가',
                '스터디 모의고사는 중간에 나갈 수 없으며, 나갈 경우 응시 기회를 잃게 됩니다. 정말 나가시겠습니까?',
                [
                    { text: '계속 풀기', style: 'cancel', onPress: () => { } },
                    {
                        text: '나가기(응시 기회 상실)',
                        style: 'destructive',
                        onPress: () => navigation.dispatch(e.data.action),
                    },
                ]
            );
        });
        return unsubscribe;
    }, [navigation, isCompleted, loading]);

    // 1.2 Interruption Handler - App State Monitoring
    useEffect(() => {
        if (loading || isCompleted || !attemptId) return;

        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            const now = Date.now();

            if (nextAppState === 'background' || nextAppState === 'inactive') {
                // User is leaving the app - start tracking
                if (interruptionStartRef.current === null) {
                    interruptionStartRef.current = now;
                }
            } else if (nextAppState === 'active' && appState.current !== 'active') {
                // User is returning to the app
                if (interruptionStartRef.current !== null) {
                    const duration = now - interruptionStartRef.current;
                    interruptionStartRef.current = null;

                    // Update cumulative stats
                    setInterruptionCount(prev => prev + 1);
                    setTotalInterruptionMs(prev => prev + duration);

                    // Handle based on duration
                    if (duration > INTERRUPTION_CONFIG.MEDIUM_THRESHOLD) {
                        // Long interruption (>60s) - force end exam
                        handleForceEndDueToInterruption(duration);
                    } else if (duration >= INTERRUPTION_CONFIG.SHORT_THRESHOLD) {
                        // Medium interruption (10-60s) - show warning
                        setShowInterruptionWarning(
                            `${formatInterruptionDuration(duration)} 동안 이탈했습니다.`
                        );
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        // Auto-hide warning after 3 seconds
                        setTimeout(() => setShowInterruptionWarning(null), 3000);
                    }
                    // Short interruption (<10s) - silently continue
                }
            }

            appState.current = nextAppState;
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription.remove();
    }, [loading, isCompleted, attemptId]);

    // Force end exam due to long interruption
    const handleForceEndDueToInterruption = async (durationMs: number) => {
        if (!attemptId || !startedAtTime) return;

        try {
            const endedAt = new Date();
            const totalDurationMs = endedAt.getTime() - startedAtTime;

            await supabase.from("attempts").update({
                ended_at: endedAt.toISOString(),
                duration_ms: totalDurationMs,
            }).eq("id", attemptId);

            // End local session
            if (localSegmentId) endSegment(localSegmentId, endedAt.getTime());
            endSession();

            Alert.alert(
                "시험 종료",
                `${formatInterruptionDuration(durationMs)} 동안 이탈하여 시험이 자동 종료되었습니다.`,
                [{
                    text: "확인",
                    onPress: () => router.replace({
                        pathname: `/room/[id]/exam/[examId]/summary`,
                        params: { id: roomId, examId: currentExamId }
                    })
                }]
            );
        } catch (e) {
            Alert.alert("오류", "시험 종료 처리 중 문제가 발생했습니다.");
        }
    };

    // 2. Initialize Attempt
    useEffect(() => {
        if (!roomId || !currentExamId || !isLoaded) return;
        if (!userId) {
            Alert.alert("로그인이 필요합니다", "시험을 시작하려면 로그인해 주세요.");
            router.back();
            return;
        }

        let cancelled = false;

        const hydrateExistingAttempt = async (
            attempt: Pick<AttemptRow, "id" | "started_at">,
            totalQuestions: number
        ) => {
            const startedAtMs = attempt.started_at ? new Date(attempt.started_at).getTime() : Date.now();
            let records: AttemptRecordRow[] = [];
            const { data: recordData, error: recordError } = await supabase
                .from("attempt_records")
                .select("*")
                .eq("attempt_id", attempt.id)
                .order("question_no", { ascending: true });

            if (!recordError && recordData) {
                records = recordData;
            }

            const completedCount = records.length;
            const elapsedFromRecords = records.reduce((sum, record) => sum + record.duration_ms, 0);
            const nextIndex = Math.min(completedCount + 1, totalQuestions);

            if (cancelled) return;
            setAttemptId(attempt.id);
            setStartedAtTime(startedAtMs);
            setQuestionIndex(nextIndex);
            setIsCompleted(completedCount >= totalQuestions);
            setLastLapTime(startedAtMs + elapsedFromRecords);
        };

        const init = async () => {
            setLoading(true);
            try {
                // Fetch Exam
                const { data: eData, error: eError } = await supabase
                    .from("room_exams")
                    .select("*")
                    .eq("id", currentExamId)
                    .single();
                if (eError) throw eError;
                if (cancelled) return;
                setExam(eData);

                const { data: existingAttempt, error: existingError } = await supabase
                    .from("attempts")
                    .select("id, started_at, ended_at")
                    .eq("room_id", roomId)
                    .eq("exam_id", currentExamId)
                    .eq("user_id", userId)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();
                if (existingError) throw existingError;

                if (existingAttempt) {
                    Alert.alert(
                        "응시 불가",
                        "스터디 모의고사는 1회만 응시 가능합니다. 이미 응시했거나 중간에 퇴장한 기록이 있어 입장이 제한됩니다.",
                        [
                            {
                                text: "확인",
                                onPress: () => router.replace({
                                    pathname: `/room/${roomId}/analysis` as any,
                                    params: { initialExamId: currentExamId }
                                })
                            }
                        ]
                    );
                    return;
                }

                // Create Attempt
                const startTime = new Date();
                const { data: aData, error: aError } = await supabase
                    .from("attempts")
                    .insert({
                        exam_id: currentExamId,
                        room_id: roomId,
                        user_id: userId,
                        started_at: startTime.toISOString(),
                    })
                    .select("id, started_at")
                    .single();

                if (aError) {
                    if ((aError as { code?: string })?.code === "23505") {
                        const { data: retryAttempt, error: retryError } = await supabase
                            .from("attempts")
                            .select("id, started_at, ended_at")
                            .eq("room_id", roomId)
                            .eq("exam_id", currentExamId)
                            .eq("user_id", userId)
                            .order("created_at", { ascending: false })
                            .limit(1)
                            .maybeSingle();
                        if (retryError) throw retryError;
                        if (retryAttempt?.ended_at) {
                            router.replace({
                                pathname: `/room/${roomId}/analysis` as any,
                                params: { initialExamId: currentExamId }
                            });
                            return;
                        }
                        if (retryAttempt) {
                            await hydrateExistingAttempt(retryAttempt, eData.total_questions);
                            return;
                        }
                    }
                    throw aError;
                }

                if (cancelled) return;
                const startedAtMs = aData.started_at ? new Date(aData.started_at).getTime() : startTime.getTime();
                setAttemptId(aData.id);
                setStartedAtTime(startedAtMs);
                setLastLapTime(startedAtMs);
                setQuestionIndex(1);
                setIsCompleted(false);

                // --- Synergy with Local Study Time ---
                pauseStopwatch();
                const lSessId = startSession('mock-exam', {
                    title: `[스터디] ${eData.title}`,
                    mockExam: {
                        subjectIds: ['__room_exam__'],
                        timeLimitSec: eData.total_minutes * 60,
                        targetQuestions: eData.total_questions,
                    }
                });
                setLocalSessionId(lSessId);
                const lSegId = startSegment({
                    sessionId: lSessId,
                    subjectId: '__room_exam__',
                    kind: 'solve',
                    startedAt: startedAtMs
                });
                setLocalSegmentId(lSegId);
                // -------------------------------------

            } catch (err: any) {
                Alert.alert("오류", formatSupabaseError(err));
                router.back();
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        init();
        return () => {
            cancelled = true;
            // Best effort ending if they leave
            // Note: In a real app, we might want to be more careful about duplicate ends
        };
    }, [roomId, currentExamId, isLoaded, userId, supabase, router, pauseStopwatch, startSession, startSegment]);

    const handleNext = useCallback(async () => {
        if (!attemptId || !exam) return;
        const nowMs = Date.now();

        // 1. If already finished, don't do anything here (or show finish alert)
        if (isCompleted) {
            handleFinish();
            return;
        }

        const duration = nowMs - lastLapTime;
        if (duration < 2000) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // 2. Insert record for current question
        try {
            const { error: rError } = await supabase.from("attempt_records").insert({
                attempt_id: attemptId,
                question_no: questionIndex,
                duration_ms: duration,
            });
            if (rError) {
                if (__DEV__) {
                    console.warn("attempt_record 저장 실패:", rError.message);
                }
            }
        } catch (rErr) {
            if (__DEV__) {
                console.warn("attempt_record 저장 중 오류:", rErr);
            }
        }

        // 3. Local Store sync
        if (localSessionId && localSegmentId) {
            addQuestionRecord({
                sessionId: localSessionId,
                segmentId: localSegmentId,
                subjectId: '__room_exam__',
                durationMs: duration,
                startedAt: lastLapTime,
                endedAt: nowMs,
                source: 'tap'
            });
        }

        // 4. Last question?
        if (questionIndex >= exam.total_questions) {
            setIsCompleted(true);
            setLastLapTime(nowMs);

            // Local store: switch to review segment
            if (localSessionId && localSegmentId) {
                endSegment(localSegmentId, nowMs);
                const reviewSegId = startSegment({
                    sessionId: localSessionId,
                    subjectId: '__review__',
                    kind: 'review',
                    startedAt: nowMs
                });
                setLocalSegmentId(reviewSegId);
            }
        } else {
            setQuestionIndex(q => q + 1);
            setLastLapTime(nowMs);
        }
    }, [attemptId, exam, questionIndex, lastLapTime, isCompleted, supabase, localSessionId, localSegmentId, addQuestionRecord, endSegment, startSegment]);


    const handleFinish = async () => {
        if (!attemptId || !startedAtTime) return;

        Alert.alert("시험 종료", "모든 과정을 마치고 종료하시겠습니까?", [
            { text: "취소", style: "cancel" },
            {
                text: "종료",
                style: "destructive",
                onPress: async () => {
                    setLoading(true);
                    try {
                        const endedAt = new Date();
                        const durationMs = endedAt.getTime() - startedAtTime;

                        await supabase.from("attempts").update({
                            ended_at: endedAt.toISOString(),
                            duration_ms: durationMs,
                        }).eq("id", attemptId);

                        // --- Synergy with Local Study Time ---
                        if (localSegmentId) endSegment(localSegmentId, endedAt.getTime());
                        endSession();
                        // -------------------------------------

                        router.replace({
                            pathname: `/room/[id]/exam/[examId]/summary`,
                            params: { id: roomId, examId: currentExamId }
                        });
                    } catch (e) {
                        Alert.alert("오류", "결과 저장에 실패했습니다.");
                        setLoading(false);
                    }
                }
            }
        ]);
    };

    if (loading || !exam) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </SafeAreaView>
        );
    }

    const totalElapsedMs = startedAtTime ? now - startedAtTime : 0;
    const lapElapsedMs = now - lastLapTime;
    const remainingSec = Math.max(0, (exam.total_minutes * 60) - Math.floor(totalElapsedMs / 1000));

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.label}>남은 시간</Text>
                    <Text style={[styles.examTimer, remainingSec < 300 && { color: COLORS.accent }]}>
                        {formatSec(remainingSec)}
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.label}>진행도</Text>
                    <Text style={styles.progressText}>
                        {isCompleted ? "검토" : `${questionIndex} / ${exam.total_questions}`}
                    </Text>
                </View>
            </View>

            {/* Title / Info */}
            <View style={styles.titleArea}>
                <Text style={styles.examTitle}>{exam.title.replace(/^(\[.*?\]\s*)+/, "")}</Text>
                <View style={[styles.badge, isCompleted ? styles.badgeComplete : styles.badgeProgress]}>
                    <Text style={[styles.badgeText, isCompleted ? styles.textComplete : styles.textProgress]}>
                        {isCompleted ? "제출하기" : "집중 모드"}
                    </Text>
                </View>
                <View style={styles.syncNotice}>
                    <Ionicons name="time-outline" size={12} color={COLORS.primary} />
                    <Text style={styles.syncNoticeText}>시험 시간이 학습 시간에 실시간으로 반영됩니다.</Text>
                </View>
                <View style={[styles.syncNotice, { marginTop: 2 }]}>
                    <Ionicons name="alert-circle-outline" size={12} color={COLORS.accent} />
                    <Text style={[styles.syncNoticeText, { color: COLORS.accent }]}>1회 한정 응시 가능하며, 퇴장 시 재입장이 불가합니다.</Text>
                </View>
            </View>

            {/* Main Touch area */}
            <Pressable
                style={({ pressed }) => [
                    styles.touchArea,
                    pressed && { backgroundColor: COLORS.surfaceVariant }, // subtle feedback
                    isCompleted && { borderColor: COLORS.primary, borderWidth: 2, borderStyle: 'solid' }
                ]}
                onPress={handleNext}
            >
                <View style={styles.qInfo}>
                    <Text style={styles.qHeader}>
                        {isCompleted ? "제출할까요?" : "문항"}
                    </Text>
                    <Text style={[styles.qNumber, isCompleted && { color: COLORS.primary }]}>
                        {isCompleted ? "완료" : `Q${questionIndex}`}
                    </Text>
                </View>

                {/* Only show lap time if not done? Or total time? */}
                {/* Keeping lap time is fine for pacing */}
                <Text style={styles.lapTime}>{formatTime(lapElapsedMs)}</Text>

                <View style={styles.tapHint}>
                    <Ionicons
                        name={isCompleted ? "checkmark-circle" : "finger-print-outline"}
                        size={32}
                        color={isCompleted ? COLORS.primary : COLORS.textMuted}
                    />
                    <Text style={styles.tapHintText}>
                        {isCompleted ? "눌러서 시험 종료" : "화면을 탭하면 다음 문항으로"}
                    </Text>
                </View>
            </Pressable>

            {/* Interruption Warning Banner */}
            {showInterruptionWarning && (
                <View style={styles.interruptionBanner}>
                    <Ionicons name="warning-outline" size={16} color={COLORS.white} />
                    <Text style={styles.interruptionText}>{showInterruptionWarning}</Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 20,
    },
    label: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, marginBottom: 4, letterSpacing: 1 },
    examTimer: { fontSize: 24, fontWeight: '800', color: COLORS.text, fontVariant: ['tabular-nums'] },
    progressText: { fontSize: 24, fontWeight: '800', color: COLORS.primary, fontVariant: ['tabular-nums'] },

    titleArea: {
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 20,
        gap: 8,
    },
    examTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        textAlign: 'center',
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeProgress: { backgroundColor: COLORS.surfaceVariant },
    badgeComplete: { backgroundColor: '#E0F2F1' }, // Light teal
    badgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
    textProgress: { color: COLORS.textMuted },
    textComplete: { color: COLORS.primary },

    touchArea: {
        flex: 1,
        marginHorizontal: 20,
        marginBottom: 30,
        borderRadius: 32,
        backgroundColor: COLORS.surface,
        // Removed dashed border for cleaner look, added shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        justifyContent: 'center',
        alignItems: 'center',
    },
    qInfo: { alignItems: 'center', marginBottom: 20 },
    qHeader: { fontSize: 16, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
    qNumber: { fontSize: 56, fontWeight: '900', color: COLORS.text, marginVertical: 8 },
    lapTime: { fontSize: 56, fontWeight: '300', color: COLORS.primary, fontVariant: ['tabular-nums'], marginBottom: 32 },
    tapHint: { alignItems: 'center', gap: 12, opacity: 0.8 },
    tapHintText: { fontSize: 14, fontWeight: '500', color: COLORS.textMuted },

    exitBtn: { alignSelf: 'center', marginBottom: 20, padding: 10 },
    exitBtnText: { color: COLORS.error, fontWeight: '600', fontSize: 13 },

    syncNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    syncNoticeText: {
        fontSize: 11,
        color: COLORS.primary,
        fontWeight: '600',
    },
    interruptionBanner: {
        position: 'absolute',
        top: 100,
        left: 20,
        right: 20,
        backgroundColor: COLORS.warning,
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    interruptionText: {
        flex: 1,
        color: COLORS.white,
        fontSize: 13,
        fontWeight: '600',
    },
});
