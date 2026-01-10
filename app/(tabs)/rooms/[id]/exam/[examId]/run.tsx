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
        if (!roomId || !currentExamId) return;

        const init = async () => {
            try {
                // Fetch Exam
                const { data: eData, error: eError } = await supabase
                    .from("room_exams")
                    .select("*")
                    .eq("id", currentExamId)
                    .single();
                if (eError) throw eError;
                setExam(eData);

                // Create Attempt
                const startTime = new Date();
                const { data: aData, error: aError } = await supabase
                    .from("attempts")
                    .insert({
                        exam_id: currentExamId,
                        room_id: roomId ?? null,
                        user_id: (await supabase.auth.getUser()).data.user?.id!,
                        started_at: startTime.toISOString(),
                    })
                    .select("id")
                    .single();

                if (aError) throw aError;
                setAttemptId(aData.id);
                setStartedAtTime(startTime.getTime());
                setLastLapTime(startTime.getTime());

            } catch (err: any) {
                Alert.alert("Error", formatSupabaseError(err));
                router.back();
            } finally {
                setLoading(false);
            }
        };

        if (loading) init();
    }, [roomId, currentExamId]);

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
                    <Text style={styles.label}>남은 시간</Text>
                    <Text style={[styles.examTimer, remainingSec < 300 && { color: COLORS.accent }]}>
                        {formatSec(remainingSec)}
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.label}>진행도</Text>
                    <Text style={styles.progressText}>
                        {isCompleted ? "완료" : `${questionIndex} / ${exam.total_questions}`}
                    </Text>
                </View>
            </View>

            {/* Title / Info */}
            <View style={styles.titleArea}>
                <Text style={styles.examTitle}>{exam.title}</Text>
                <View style={[styles.badge, isCompleted ? styles.badgeComplete : styles.badgeProgress]}>
                    <Text style={[styles.badgeText, isCompleted ? styles.textComplete : styles.textProgress]}>
                        {isCompleted ? "검토 중" : "시험 진행 중"}
                    </Text>
                </View>
            </View>

            {/* Main Touch area */}
            <Pressable
                style={({ pressed }) => [
                    styles.touchArea,
                    pressed && { backgroundColor: COLORS.primaryLight },
                    isCompleted && { borderColor: COLORS.primary, borderStyle: 'solid' }
                ]}
                onPress={handleNext}
            >
                <View style={styles.qInfo}>
                    <Text style={styles.qHeader}>
                        {isCompleted ? "최종 확인" : `Question`}
                    </Text>
                    <Text style={[styles.qNumber, isCompleted && { color: COLORS.primary }]}>
                        {isCompleted ? "DONE" : `Q${questionIndex}`}
                    </Text>
                </View>

                <Text style={styles.lapTime}>{formatTime(lapElapsedMs)}</Text>

                <View style={styles.tapHint}>
                    <Ionicons
                        name={isCompleted ? "checkmark-done-circle" : "finger-print"}
                        size={24}
                        color={COLORS.primary}
                    />
                    <Text style={styles.tapHintText}>
                        {isCompleted ? "터치하면 시험을 최종 종료합니다" : "화면을 터치하면 다음 문항으로 넘어갑니다"}
                    </Text>
                </View>
            </Pressable>

            <TouchableOpacity onPress={() => router.back()} style={styles.exitBtn}>
                <Text style={styles.exitBtnText}>시험 중단하기</Text>
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
    label: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginBottom: 4, letterSpacing: 0.5 },
    examTimer: { fontSize: 28, fontWeight: '900', color: COLORS.text, fontVariant: ['tabular-nums'] },
    progressText: { fontSize: 20, fontWeight: '800', color: COLORS.primary },

    titleArea: {
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 20,
        gap: 8,
    },
    examTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textMuted,
        textAlign: 'center',
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeProgress: { backgroundColor: COLORS.primaryLight },
    badgeComplete: { backgroundColor: '#FFDCE0' }, // Light red/accent tint
    badgeText: { fontSize: 11, fontWeight: '800' },
    textProgress: { color: COLORS.primary },
    textComplete: { color: COLORS.accent },

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
    qHeader: { fontSize: 18, fontWeight: '600', color: COLORS.textMuted },
    qNumber: { fontSize: 48, fontWeight: '900', color: COLORS.text },
    lapTime: { fontSize: 64, fontWeight: '900', color: COLORS.primary, fontVariant: ['tabular-nums'], marginVertical: 20 },
    tapHint: { alignItems: 'center', gap: 8, opacity: 0.7, paddingHorizontal: 40 },
    tapHintText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted, textAlign: 'center' },

    exitBtn: { alignSelf: 'center', marginBottom: 20, padding: 10 },
    exitBtnText: { color: COLORS.textMuted, fontWeight: '600', textDecorationLine: 'underline' }
});
