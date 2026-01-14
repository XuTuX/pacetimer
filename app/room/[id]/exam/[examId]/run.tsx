import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    AppState,
    Pressable,
    StyleSheet,
    Text,
    View,
    type AppStateStatus,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Database } from "../../../../../lib/db-types";
import {
    INTERRUPTION_CONFIG,
    formatInterruptionDuration,
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
    return `${m}:${(s % 60).toString().padStart(2, "0")}.${dec
        .toString()
        .padStart(2, "0")}`;
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
    const navigation = useNavigation();

    const { isLoaded, userId } = useAuth();
    const { id, examId } = useLocalSearchParams<{ id: string; examId: string }>();

    const { pauseStopwatch, startSession, endSession, startSegment, endSegment, addQuestionRecord } =
        useAppStore();

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
    const [showInterruptionWarning, setShowInterruptionWarning] = useState<string | null>(null);
    const interruptionStartRef = useRef<number | null>(null);
    const appState = useRef(AppState.currentState);

    // Guard to prevent double-finishing (timeout/interruption/manual)
    const finishingRef = useRef(false);

    // --- 제목 파싱: [과목] 제목 또는 과목 • 제목 ---
    const { displaySubject, displayTitle } = useMemo(() => {
        const rawTitle = exam?.title ?? "";

        // 1) 먼저 [과목] 형식 체크
        const bracketMatch = rawTitle.match(/^\s*\[(.*?)\]\s*/);
        if (bracketMatch) {
            const subjectFromBracket = bracketMatch[1].trim();
            const titleAfterBracket = rawTitle.replace(/^\s*\[.*?\]\s*/, "").trim();
            return {
                displaySubject: subjectFromBracket || "모의고사",
                displayTitle: titleAfterBracket || "스터디 모의고사",
            };
        }

        // 2) "과목 • 제목" 형식 체크 (• 또는 · 구분자)
        const bulletMatch = rawTitle.match(/^(.+?)\s*[•·]\s*(.+)$/);
        if (bulletMatch) {
            return {
                displaySubject: bulletMatch[1].trim() || "모의고사",
                displayTitle: bulletMatch[2].trim() || "스터디 모의고사",
            };
        }

        // 3) 형식이 없으면 전체를 제목으로 사용
        return {
            displaySubject: "모의고사",
            displayTitle: rawTitle || "스터디 모의고사",
        };
    }, [exam?.title]);

    // 1) Timer Tick
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 16);
        return () => clearInterval(interval);
    }, []);

    // 1.1 Prevent accidental navigation
    useEffect(() => {
        const unsubscribe = navigation.addListener("beforeRemove", (e) => {
            if (isCompleted || loading) return; // finished or initial loading: allow
            e.preventDefault();
            Alert.alert(
                "시험 중단 불가",
                "스터디 모의고사는 중간에 나갈 수 없으며, 나갈 경우 응시 기회를 잃게 됩니다. 정말 나가시겠습니까?",
                [
                    { text: "계속 풀기", style: "cancel" },
                    {
                        text: "나가기(응시 기회 상실)",
                        style: "destructive",
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
            const nowMs = Date.now();

            if (nextAppState === "background" || nextAppState === "inactive") {
                if (interruptionStartRef.current === null) {
                    interruptionStartRef.current = nowMs;
                }
            } else if (nextAppState === "active" && appState.current !== "active") {
                if (interruptionStartRef.current !== null) {
                    const duration = nowMs - interruptionStartRef.current;
                    interruptionStartRef.current = null;

                    if (duration > INTERRUPTION_CONFIG.MEDIUM_THRESHOLD) {
                        handleForceEndDueToInterruption(duration);
                    } else if (duration >= INTERRUPTION_CONFIG.SHORT_THRESHOLD) {
                        setShowInterruptionWarning(`${formatInterruptionDuration(duration)} 동안 이탈했습니다.`);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        setTimeout(() => setShowInterruptionWarning(null), 3000);
                    }
                }
            }

            appState.current = nextAppState;
        };

        const subscription = AppState.addEventListener("change", handleAppStateChange);
        return () => subscription.remove();
    }, [loading, isCompleted, attemptId]);

    const finalizeLocalSession = useCallback(
        (endedAtMs: number) => {
            if (localSegmentId) endSegment(localSegmentId, endedAtMs);
            endSession();
        },
        [localSegmentId, endSegment, endSession]
    );

    // (A) Force end: long interruption
    const handleForceEndDueToInterruption = async (durationMs: number) => {
        if (!attemptId || !startedAtTime || !exam) return;
        if (finishingRef.current) return;
        finishingRef.current = true;

        try {
            const endedAt = new Date();
            const totalDurationMs = endedAt.getTime() - startedAtTime;

            // 아직 시작하지 않은 문제들을 duration_ms: 0으로 기록 (시간 부족/중단으로 못 푼 문제)
            const unsolvedQuestions: { attempt_id: string; question_no: number; duration_ms: number }[] = [];
            for (let q = questionIndex; q <= exam.total_questions; q++) {
                unsolvedQuestions.push({
                    attempt_id: attemptId,
                    question_no: q,
                    duration_ms: 0, // 중단으로 못 푼 문제 표시
                });
            }

            if (unsolvedQuestions.length > 0) {
                try {
                    await supabase.from("attempt_records").insert(unsolvedQuestions);
                    if (__DEV__) console.log(`중단으로 인해 ${unsolvedQuestions.length}개 문제를 못 풀었음으로 기록`);
                } catch (err) {
                    if (__DEV__) console.warn("미완료 문제 기록 실패:", err);
                }
            }

            await supabase
                .from("attempts")
                .update({
                    ended_at: endedAt.toISOString(),
                    duration_ms: totalDurationMs,
                })
                .eq("id", attemptId);

            finalizeLocalSession(endedAt.getTime());

            const skippedCount = unsolvedQuestions.length;
            const message = skippedCount > 0
                ? `${formatInterruptionDuration(durationMs)} 동안 이탈하여 시험이 자동 종료되었습니다.\n${skippedCount}개 문제를 풀지 못했습니다.`
                : `${formatInterruptionDuration(durationMs)} 동안 이탈하여 시험이 자동 종료되었습니다.`;

            Alert.alert(
                "시험 종료",
                message,
                [
                    {
                        text: "확인",
                        onPress: () =>
                            router.replace({
                                pathname: `/room/[id]/exam/[examId]/summary`,
                                params: { id: roomId, examId: currentExamId },
                            }),
                    },
                ]
            );
        } catch (e) {
            finishingRef.current = false;
            Alert.alert("오류", "시험 종료 처리 중 문제가 발생했습니다.");
        }
    };

    // (B) Force end: time over
    const handleForceEndDueToTimeout = useCallback(async () => {
        if (!attemptId || !startedAtTime || !exam) return;
        if (finishingRef.current) return;
        finishingRef.current = true;

        try {
            const endedAt = new Date();
            const durationMs = endedAt.getTime() - startedAtTime;

            // 현재 풀고 있던 문제의 경과 시간 저장 (시간 초과로 인해 중단)
            const currentLapDuration = endedAt.getTime() - lastLapTime;
            if (!isCompleted && currentLapDuration > 0) {
                try {
                    await supabase.from("attempt_records").insert({
                        attempt_id: attemptId,
                        question_no: questionIndex,
                        duration_ms: currentLapDuration,
                    });
                } catch (err) {
                    if (__DEV__) console.warn("현재 문제 저장 실패:", err);
                }
            }

            // Local Store Sync: Current Question
            if (localSessionId && localSegmentId && !isCompleted && currentLapDuration > 0) {
                addQuestionRecord({
                    sessionId: localSessionId,
                    segmentId: localSegmentId,
                    subjectId: "__room_exam__",
                    durationMs: currentLapDuration,
                    startedAt: lastLapTime,
                    endedAt: endedAt.getTime(),
                    source: "finish",
                });
            }

            // 아직 시작하지 않은 문제들을 duration_ms: 0으로 기록 (시간 부족으로 못 푼 문제)
            const unsolvedQuestions: { attempt_id: string; question_no: number; duration_ms: number }[] = [];
            for (let q = questionIndex + 1; q <= exam.total_questions; q++) {
                unsolvedQuestions.push({
                    attempt_id: attemptId,
                    question_no: q,
                    duration_ms: 0, // 시간 부족으로 못 푼 문제 표시
                });
            }

            if (unsolvedQuestions.length > 0) {
                try {
                    await supabase.from("attempt_records").insert(unsolvedQuestions);
                    if (__DEV__) console.log(`시간 초과: ${unsolvedQuestions.length}개 문제를 못 풀었음으로 기록`);
                } catch (err) {
                    if (__DEV__) console.warn("미완료 문제 기록 실패:", err);
                }
            }

            // Local Store Sync: Remaining Questions
            if (localSessionId && localSegmentId) {
                for (let q = questionIndex + 1; q <= exam.total_questions; q++) {
                    addQuestionRecord({
                        sessionId: localSessionId,
                        segmentId: localSegmentId,
                        subjectId: "__room_exam__",
                        durationMs: 0,
                        startedAt: endedAt.getTime(),
                        endedAt: endedAt.getTime(),
                        source: "finish",
                    });
                }
            }

            await supabase
                .from("attempts")
                .update({
                    ended_at: endedAt.toISOString(),
                    duration_ms: durationMs,
                })
                .eq("id", attemptId);

            finalizeLocalSession(endedAt.getTime());

            const skippedCount = unsolvedQuestions.length;
            const message = skippedCount > 0
                ? `시험 시간이 종료되어 자동으로 제출되었습니다.\n${skippedCount}개 문제를 풀지 못했습니다.`
                : "시험 시간이 종료되어 자동으로 제출되었습니다.";

            Alert.alert("시간 종료", message, [
                {
                    text: "확인",
                    onPress: () =>
                        router.replace({
                            pathname: `/room/[id]/exam/[examId]/summary`,
                            params: { id: roomId, examId: currentExamId },
                        }),
                },
            ]);
        } catch (e) {
            finishingRef.current = false;
            Alert.alert("오류", "시간 종료 처리 중 문제가 발생했습니다.");
        }
    }, [attemptId, startedAtTime, exam, questionIndex, lastLapTime, isCompleted, supabase, finalizeLocalSession, router, roomId, currentExamId, localSessionId, localSegmentId, addQuestionRecord]);

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

            if (!recordError && recordData) records = recordData;

            const completedCount = records.length;
            const elapsedFromRecords = records.reduce((sum, r) => sum + r.duration_ms, 0);
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
                    .select("id, started_at, ended_at, duration_ms")
                    .eq("room_id", roomId)
                    .eq("exam_id", currentExamId)
                    .eq("user_id", userId)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (existingError) throw existingError;

                if (existingAttempt) {
                    if (existingAttempt.ended_at && existingAttempt.duration_ms && existingAttempt.duration_ms > 0) {
                        Alert.alert("응시 불가", "스터디 모의고사는 1회만 응시 가능합니다. 이미 응시를 완료한 기록이 있습니다.", [
                            {
                                text: "결과 보기",
                                onPress: () =>
                                    router.replace({
                                        pathname: `/room/${roomId}/analysis` as any,
                                        params: { initialExamId: currentExamId },
                                    }),
                            },
                        ]);
                        return;
                    }

                    const { data: recordsData, error: recordsError } = await supabase
                        .from("attempt_records")
                        .select("id")
                        .eq("attempt_id", existingAttempt.id)
                        .limit(1);

                    const hasRecords = !recordsError && recordsData && recordsData.length > 0;

                    if (!existingAttempt.ended_at && !hasRecords) {
                        await supabase.from("attempts").delete().eq("id", existingAttempt.id);
                    } else if (!existingAttempt.ended_at && hasRecords) {
                        await supabase.from("attempt_records").delete().eq("attempt_id", existingAttempt.id);
                        await supabase.from("attempts").delete().eq("id", existingAttempt.id);
                    } else if (existingAttempt.ended_at && (!existingAttempt.duration_ms || existingAttempt.duration_ms === 0)) {
                        await supabase.from("attempt_records").delete().eq("attempt_id", existingAttempt.id);
                        await supabase.from("attempts").delete().eq("id", existingAttempt.id);
                    }
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
                                params: { initialExamId: currentExamId },
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

                // Reset finish guard
                finishingRef.current = false;

                const startedAtMs = aData.started_at ? new Date(aData.started_at).getTime() : startTime.getTime();
                setAttemptId(aData.id);
                setStartedAtTime(startedAtMs);
                setLastLapTime(startedAtMs);
                setQuestionIndex(1);
                setIsCompleted(false);

                // Local store synergy
                pauseStopwatch();
                const lSessId = startSession("mock-exam", {
                    title: `[스터디] ${eData.title}`,
                    mockExam: {
                        subjectIds: ["__room_exam__"],
                        timeLimitSec: eData.total_minutes * 60,
                        targetQuestions: eData.total_questions,
                    },
                });
                setLocalSessionId(lSessId);

                const lSegId = startSegment({
                    sessionId: lSessId,
                    subjectId: "__room_exam__",
                    kind: "solve",
                    startedAt: startedAtMs,
                });
                setLocalSegmentId(lSegId);
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
        };
    }, [
        roomId,
        currentExamId,
        isLoaded,
        userId,
        supabase,
        router,
        pauseStopwatch,
        startSession,
        startSegment,
    ]);

    const handleFinish = useCallback(async () => {
        if (!attemptId || !startedAtTime) return;
        if (finishingRef.current) return;

        Alert.alert("시험 종료", "모든 과정을 마치고 종료하시겠습니까?", [
            { text: "취소", style: "cancel" },
            {
                text: "종료",
                style: "destructive",
                onPress: async () => {
                    finishingRef.current = true;
                    setLoading(true);
                    try {
                        const endedAt = new Date();
                        const durationMs = endedAt.getTime() - startedAtTime;

                        await supabase
                            .from("attempts")
                            .update({
                                ended_at: endedAt.toISOString(),
                                duration_ms: durationMs,
                            })
                            .eq("id", attemptId);

                        finalizeLocalSession(endedAt.getTime());

                        router.replace({
                            pathname: `/room/[id]/exam/[examId]/summary`,
                            params: { id: roomId, examId: currentExamId },
                        });
                    } catch (e) {
                        finishingRef.current = false;
                        Alert.alert("오류", "결과 저장에 실패했습니다.");
                        setLoading(false);
                    }
                },
            },
        ]);
    }, [attemptId, startedAtTime, supabase, finalizeLocalSession, router, roomId, currentExamId]);

    const handleNext = useCallback(async () => {
        if (!attemptId || !exam) return;
        const nowMs = Date.now();

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

        // Insert record for current question
        try {
            const { error: rError } = await supabase.from("attempt_records").insert({
                attempt_id: attemptId,
                question_no: questionIndex,
                duration_ms: duration,
            });
            if (rError && __DEV__) console.warn("attempt_record 저장 실패:", rError.message);
        } catch (rErr) {
            if (__DEV__) console.warn("attempt_record 저장 중 오류:", rErr);
        }

        // Local store sync
        if (localSessionId && localSegmentId) {
            addQuestionRecord({
                sessionId: localSessionId,
                segmentId: localSegmentId,
                subjectId: "__room_exam__",
                durationMs: duration,
                startedAt: lastLapTime,
                endedAt: nowMs,
                source: "tap",
            });
        }

        // Last question?
        if (questionIndex >= exam.total_questions) {
            setIsCompleted(true);
            setLastLapTime(nowMs);

            // Local store: switch to review segment
            if (localSessionId && localSegmentId) {
                endSegment(localSegmentId, nowMs);
                const reviewSegId = startSegment({
                    sessionId: localSessionId,
                    subjectId: "__review__",
                    kind: "review",
                    startedAt: nowMs,
                });
                setLocalSegmentId(reviewSegId);
            }
        } else {
            setQuestionIndex((q) => q + 1);
            setLastLapTime(nowMs);
        }
    }, [
        attemptId,
        exam,
        questionIndex,
        lastLapTime,
        isCompleted,
        supabase,
        localSessionId,
        localSegmentId,
        addQuestionRecord,
        endSegment,
        startSegment,
        handleFinish,
    ]);

    // ✅ 시간 종료 자동 제출 (기존 코드에는 없었음)
    const remainingSec = useMemo(() => {
        if (!exam || !startedAtTime) return 0;
        const totalElapsedMs = now - startedAtTime;
        return Math.max(0, exam.total_minutes * 60 - Math.floor(totalElapsedMs / 1000));
    }, [exam, startedAtTime, now]);

    useEffect(() => {
        if (loading) return;
        if (!exam || !attemptId || !startedAtTime) return;
        if (isCompleted) return;

        if (remainingSec <= 0) {
            handleForceEndDueToTimeout();
        }
    }, [loading, exam, attemptId, startedAtTime, isCompleted, remainingSec, handleForceEndDueToTimeout]);

    if (loading || !exam) {
        return (
            <SafeAreaView style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </SafeAreaView>
        );
    }

    const lapElapsedMs = now - lastLapTime;

    return (
        <SafeAreaView style={styles.container}>
            {/* Header (중앙 제거) */}
            <View style={styles.header}>
                <View style={styles.headerSide}>
                    <Text style={styles.label}>남은 시간</Text>
                    <Text style={[styles.examTimer, remainingSec < 300 && { color: COLORS.accent }]}>
                        {formatSec(remainingSec)}
                    </Text>
                </View>

                <View style={styles.headerSideRight}>
                    <Text style={styles.label}>진행도</Text>
                    <Text style={styles.progressText}>
                        {isCompleted ? "검토" : `${questionIndex} / ${exam.total_questions}`}
                    </Text>
                </View>
            </View>

            {/* Title / Info : pill=과목, 아래=제목 (점/구분자 없음) */}
            <View style={styles.titleArea}>
                <View style={styles.badge}>
                    <Text style={styles.badgeText} numberOfLines={1}>
                        {displaySubject}
                    </Text>
                </View>

                <Text style={styles.examTitle} numberOfLines={1}>
                    {displayTitle}
                </Text>
            </View>

            {/* Main Touch area */}
            <Pressable
                style={({ pressed }) => [
                    styles.touchArea,
                    pressed && { backgroundColor: COLORS.surfaceVariant },
                    isCompleted && { borderColor: COLORS.primary, borderWidth: 2, borderStyle: "solid" },
                ]}
                onPress={handleNext}
            >
                <View style={styles.qInfo}>
                    <Text style={styles.qHeader}>{isCompleted ? "제출할까요?" : "문항"}</Text>
                    <Text style={[styles.qNumber, isCompleted && { color: COLORS.primary }]}>
                        {isCompleted ? "완료" : `${questionIndex}번`}
                    </Text>
                </View>

                <Text style={styles.lapTime}>{formatTime(lapElapsedMs)}</Text>

                <View style={styles.tapHint}>
                    <Ionicons
                        name={isCompleted ? "checkmark-circle" : "finger-print-outline"}
                        size={32}
                        color={isCompleted ? COLORS.primary : COLORS.textMuted}
                    />
                    <Text style={styles.tapHintText}>{isCompleted ? "눌러서 시험 종료" : "화면을 탭하면 다음 문항으로"}</Text>
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

    // Loading centered
    loadingContainer: {
        justifyContent: "center",
        alignItems: "center",
    },

    // Header (left/right only)
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 24,
        paddingVertical: 20,
    },
    headerSide: {
        minWidth: 120,
    },
    headerSideRight: {
        minWidth: 120,
        alignItems: "flex-end",
    },

    label: {
        fontSize: 11,
        fontWeight: "700",
        color: COLORS.textMuted,
        marginBottom: 4,
        letterSpacing: 1,
    },
    examTimer: {
        fontSize: 28,
        fontWeight: "900",
        color: COLORS.text,
        fontVariant: ["tabular-nums"],
    },
    progressText: {
        fontSize: 22,
        fontWeight: "800",
        color: COLORS.primary,
        fontVariant: ["tabular-nums"],
    },

    // Title Area: pill(subject) + title
    titleArea: {
        alignItems: "center",
        paddingHorizontal: 24,
        marginBottom: 14,
        gap: 10,
    },
    badge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: COLORS.surfaceVariant,
    },
    badgeText: {
        fontSize: 14,
        fontWeight: "800",
        color: COLORS.textMuted,
        letterSpacing: -0.2,
    },
    examTitle: {
        fontSize: 20,
        fontWeight: "900",
        color: COLORS.text,
        textAlign: "center",
        letterSpacing: -0.3,
    },

    // Touch Area
    touchArea: {
        flex: 1,
        marginHorizontal: 20,
        marginBottom: 30,
        borderRadius: 32,
        backgroundColor: COLORS.surface,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        justifyContent: "center",
        alignItems: "center",
    },
    qInfo: { alignItems: "center", marginBottom: 20 },
    qHeader: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.textMuted,
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    qNumber: { fontSize: 56, fontWeight: "900", color: COLORS.text, marginVertical: 8 },
    lapTime: {
        fontSize: 56,
        fontWeight: "300",
        color: COLORS.primary,
        fontVariant: ["tabular-nums"],
        marginBottom: 32,
    },
    tapHint: { alignItems: "center", gap: 12, opacity: 0.8 },
    tapHintText: { fontSize: 14, fontWeight: "500", color: COLORS.textMuted },

    interruptionBanner: {
        position: "absolute",
        top: 100,
        left: 20,
        right: 20,
        backgroundColor: COLORS.warning,
        borderRadius: 12,
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    interruptionText: {
        flex: 1,
        color: COLORS.white,
        fontSize: 13,
        fontWeight: "600",
    },
});
