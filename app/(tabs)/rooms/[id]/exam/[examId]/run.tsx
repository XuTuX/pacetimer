import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import PagerView from "react-native-pager-view";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Database } from "../../../../../../lib/db-types";
import { useSupabase } from "../../../../../../lib/supabase";
import { formatSupabaseError } from "../../../../../../lib/supabaseError";
import { COLORS } from "../../../../../../lib/theme";

type RoomExamRow = Database["public"]["Tables"]["room_exams"]["Row"];

function formatTime(ms: number) {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
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

    // Lap State
    const [lastLapTime, setLastLapTime] = useState<number>(Date.now());

    // Pager
    const pagerRef = useRef<PagerView>(null);
    const [currentPage, setCurrentPage] = useState(0);

    // 1. Timer Tick
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 200);
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
                        user_id: (await supabase.auth.getUser()).data.user?.id!,
                        started_at: startTime.toISOString(),
                        // Schema: attempts (id, exam_id, user_id...).
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

    const handleLap = async () => {
        if (!attemptId) return;

        const timestampAt = new Date();
        const elapsedSinceLast = Math.floor((timestampAt.getTime() - lastLapTime) / 1000);

        // Optimistic update
        const currentIndex = questionIndex;
        setQuestionIndex(q => q + 1);
        setLastLapTime(timestampAt.getTime());

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            await supabase.from("exam_attempt_records").insert({
                attempt_id: attemptId,
                question_index: currentIndex,
                elapsed_seconds: elapsedSinceLast,
                timestamp_at: timestampAt.toISOString(),
            });
        } catch (e) {
            console.error(e);
        }
    };

    const handleFinish = async () => {
        if (!attemptId || !startedAtTime) return;

        Alert.alert("Finish Exam?", "Are you sure you want to finish this attempt?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Finish",
                style: "destructive",
                onPress: async () => {
                    setLoading(true);
                    try {
                        const endedAt = new Date();
                        const totalSeconds = Math.floor((endedAt.getTime() - startedAtTime) / 1000);

                        await supabase.from("attempts").update({
                            ended_at: endedAt.toISOString(),
                            total_solved: questionIndex - 1,
                            total_elapsed_seconds: totalSeconds,
                            is_completed: true
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

    // Elapsed Total
    const totalElapsed = startedAtTime ? now - startedAtTime : 0;
    // Elapsed Lap
    const lapElapsed = now - lastLapTime;

    return (
        <SafeAreaView style={styles.container}>
            <PagerView
                style={styles.pager}
                initialPage={0}
                onPageSelected={e => setCurrentPage(e.nativeEvent.position)}
                ref={pagerRef}
            >
                {/* Page 1: Overview Timer */}
                <View key="0" style={styles.page}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{exam.title}</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <View style={styles.centerContent}>
                        <Text style={styles.subLabel}>Total Elapsed Time</Text>
                        <Text style={styles.mainTimer}>{formatTime(totalElapsed)}</Text>

                        <View style={styles.statRow}>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>Question</Text>
                                <Text style={styles.statValue}>{questionIndex} / {exam.total_questions}</Text>
                            </View>
                        </View>

                        <Text style={styles.hint}>Swipe left to track questions</Text>
                    </View>

                    <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
                        <Text style={styles.finishBtnText}>Finish Exam</Text>
                    </TouchableOpacity>
                </View>

                {/* Page 2: Question Check */}
                <View key="1" style={styles.page}>
                    <View style={styles.trackerContent}>
                        <View style={styles.topBar}>
                            <Text style={styles.topBarTimer}>{formatTime(totalElapsed)}</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.lapButton}
                            activeOpacity={0.8}
                            onPress={handleLap}
                        >
                            <Text style={styles.qNum}>Question {questionIndex}</Text>
                            <Text style={styles.lapTimer}>{formatTime(lapElapsed)}</Text>
                            <Text style={styles.lapHint}>Tap to Mark Done</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
                            <Text style={styles.finishBtnText}>Finish Exam</Text>
                        </TouchableOpacity>
                    </View>
                </View>

            </PagerView>

            {/* Dots */}
            <View style={styles.dots}>
                <View style={[styles.dot, currentPage === 0 && styles.activeDot]} />
                <View style={[styles.dot, currentPage === 1 && styles.activeDot]} />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    pager: { flex: 1 },
    page: { flex: 1, padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textMuted },
    closeBtn: { padding: 8, backgroundColor: COLORS.white, borderRadius: 20 },

    centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 },
    subLabel: { fontSize: 13, fontWeight: '700', color: COLORS.primary, letterSpacing: 1 },
    mainTimer: { fontSize: 72, fontWeight: '900', color: COLORS.text, fontVariant: ['tabular-nums'] },

    statRow: { flexDirection: 'row', gap: 20, marginTop: 20 },
    statBox: { alignItems: 'center', padding: 16, backgroundColor: COLORS.white, borderRadius: 16, minWidth: 120 },
    statLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
    statValue: { fontSize: 24, fontWeight: '800', color: COLORS.text },

    hint: { marginTop: 40, color: COLORS.textMuted, fontSize: 12 },

    finishBtn: { backgroundColor: COLORS.white, paddingVertical: 16, borderRadius: 16, borderWidth: 1, borderColor: COLORS.error, alignItems: 'center' },
    finishBtnText: { color: COLORS.error, fontWeight: '800', fontSize: 15 },

    // Page 2
    trackerContent: { flex: 1, paddingTop: 20, gap: 20 },
    topBar: { alignItems: 'center', padding: 10, backgroundColor: COLORS.white, borderRadius: 12 },
    topBarTimer: { fontSize: 20, fontWeight: '800', color: COLORS.text },

    lapButton: { flex: 1, backgroundColor: COLORS.white, borderRadius: 30, alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: COLORS.border },
    qNum: { fontSize: 24, fontWeight: '800', color: COLORS.text },
    lapTimer: { fontSize: 80, fontWeight: '900', color: COLORS.primary, fontVariant: ['tabular-nums'] },
    lapHint: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },

    dots: { position: 'absolute', bottom: 50, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 8 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
    activeDot: { backgroundColor: COLORS.primary, width: 24 }
});
