import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Database } from "../../../../../../lib/db-types";
import { useSupabase } from "../../../../../../lib/supabase";
import { formatSupabaseError } from "../../../../../../lib/supabaseError";
import { COLORS } from "../../../../../../lib/theme";

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

    const roomId = Array.isArray(id) ? id[0] : id;
    const currentExamId = Array.isArray(examId) ? examId[0] : examId;

    const [loading, setLoading] = useState(true);
    const [exam, setExam] = useState<RoomExamRow | null>(null);
    const [attemptId, setAttemptId] = useState<string | null>(null);
    const [startedAtTime, setStartedAtTime] = useState<number | null>(null);

    // Timer State
    const [now, setNow] = useState(Date.now());
    const [questionIndex, setQuestionIndex] = useState(1);
    const [lastLapTime, setLastLapTime] = useState<number>(Date.now());
    const [isCompleted, setIsCompleted] = useState(false);

    // 1. Timer Tick
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 16);
        return () => clearInterval(interval);
    }, []);

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
                .select("id, question_no, duration_ms")
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

                if (existingAttempt?.ended_at) {
                    Alert.alert(
                        "이미 완료한 시험",
                        "이 시험은 이미 완료했습니다. 분석 화면으로 이동합니다.",
                        [
                            {
                                text: "확인",
                                onPress: () => router.replace(`/(tabs)/rooms/${roomId}/exam/${currentExamId}`)
                            }
                        ]
                    );
                    return;
                }

                if (existingAttempt) {
                    await hydrateExistingAttempt(existingAttempt, eData.total_questions);
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
                            router.replace(`/(tabs)/rooms/${roomId}/exam/${currentExamId}`);
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

            } catch (err: any) {
                Alert.alert("Error", formatSupabaseError(err));
                router.back();
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        init();
        return () => {
            cancelled = true;
        };
    }, [roomId, currentExamId, isLoaded, userId, supabase, router]);

    const handleNext = useCallback(async () => {
        if (!attemptId || !exam) return;
        const nowMs = Date.now();

        // 1. If already finished, don't do anything here (or show finish alert)
        if (isCompleted) {
            handleFinish();
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // 2. Insert record for current question
        const duration = nowMs - lastLapTime;
        try {
            const { error: rError } = await supabase.from("attempt_records").insert({
                attempt_id: attemptId,
                question_no: questionIndex,
                duration_ms: duration,
            });
            if (rError) {
                console.warn("Failed to insert attempt_record:", rError.message);
            }
        } catch (rErr) {
            console.warn("Error inserting attempt_record:", rErr);
        }

        // 3. Last question?
        if (questionIndex >= exam.total_questions) {
            setIsCompleted(true);
            setLastLapTime(nowMs);
        } else {
            setQuestionIndex(q => q + 1);
            setLastLapTime(nowMs);
        }
    }, [attemptId, exam, questionIndex, lastLapTime, isCompleted, supabase]);

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

                        router.replace(`/(tabs)/rooms/${roomId}/exam/${currentExamId}`);
                    } catch (e) {
                        Alert.alert("Error", "Failed to save result.");
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
                    <Text style={styles.label}>TIME REMAINING</Text>
                    <Text style={[styles.examTimer, remainingSec < 300 && { color: COLORS.accent }]}>
                        {formatSec(remainingSec)}
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.label}>PROGRESS</Text>
                    <Text style={styles.progressText}>
                        {isCompleted ? "Review" : `${questionIndex} / ${exam.total_questions}`}
                    </Text>
                </View>
            </View>

            {/* Title / Info */}
            <View style={styles.titleArea}>
                <Text style={styles.examTitle}>{exam.title}</Text>
                <View style={[styles.badge, isCompleted ? styles.badgeComplete : styles.badgeProgress]}>
                    <Text style={[styles.badgeText, isCompleted ? styles.textComplete : styles.textProgress]}>
                        {isCompleted ? "Submit Now" : "Focus Mode"}
                    </Text>
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
                        {isCompleted ? "Ready to Submit?" : `Question`}
                    </Text>
                    <Text style={[styles.qNumber, isCompleted && { color: COLORS.primary }]}>
                        {isCompleted ? "DONE" : `Q${questionIndex}`}
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
                        {isCompleted ? "Tap to finish exam" : "Tap anywhere for next question"}
                    </Text>
                </View>
            </Pressable>

            <TouchableOpacity onPress={() => router.back()} style={styles.exitBtn}>
                <Text style={styles.exitBtnText}>Quit Exam</Text>
            </TouchableOpacity>
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
    exitBtnText: { color: COLORS.error, fontWeight: '600', fontSize: 13 }
});
