import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import SessionDetail from '../../components/SessionDetail';
import { ExamSession, LapRecord, saveSession } from "../../lib/storage";

const THEME_GREEN = {
    point: '#00D094',
    pointLight: '#E6F9F4',
    textMain: '#1C1C1E',
    textMuted: '#8E8E93',
    bg: '#F8F9FA',
    border: '#F2F2F7',
    accent: '#FF3B30',
};

const buildFallbackTitle = (categoryName: string) => {
    const now = new Date();
    return `${now.getMonth() + 1}월 ${now.getDate()}일 ${categoryName} 연습`;
};

const toPositiveNumber = (value: string | undefined, fallback: number) => {
    const num = parseInt(value ?? "", 10);
    return (Number.isNaN(num) || num <= 0) ? fallback : num;
};

export default function FocusExamScreen() {
    const { categoryId, categoryName, totalQuestions, targetMinutes, title } = useLocalSearchParams<{
        categoryId?: string;
        categoryName?: string;
        totalQuestions?: string;
        targetMinutes?: string;
        title?: string;
    }>();
    const navigation = useNavigation();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const displayCategoryName = (typeof categoryName === "string" && categoryName.trim()) || "연습";
    const totalQuestionsValue = useMemo(() => toPositiveNumber(typeof totalQuestions === "string" ? totalQuestions : undefined, 40), [totalQuestions]);
    const targetMinutesValue = useMemo(() => toPositiveNumber(typeof targetMinutes === "string" ? targetMinutes : undefined, 90), [targetMinutes]);
    const customTitle = typeof title === "string" ? title.trim() : "";

    const [currentQuestion, setCurrentQuestion] = useState(1);
    const [totalSeconds, setTotalSeconds] = useState(0);
    const [lastLapTime, setLastLapTime] = useState(0);
    const [laps, setLaps] = useState<LapRecord[]>([]);
    const [viewMode, setViewMode] = useState<"running" | "result">("running");
    const [completedSession, setCompletedSession] = useState<ExamSession | null>(null);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
    }, []);

    const startTimer = useCallback(() => {
        stopTimer();
        timerRef.current = setInterval(() => setTotalSeconds(prev => prev + 1), 1000);
    }, [stopTimer]);

    const resetExamState = useCallback(() => {
        stopTimer();
        setTotalSeconds(0);
        setLastLapTime(0);
        setCurrentQuestion(1);
        setLaps([]);
        setViewMode("running");
        setCompletedSession(null);
    }, [stopTimer]);

    useEffect(() => {
        resetExamState();
        startTimer();
    }, [resetExamState, startTimer]);

    useEffect(() => () => stopTimer(), [stopTimer]);

    useEffect(() => {
        const tag = 'exam-timer';
        if (viewMode === 'running') {
            activateKeepAwakeAsync(tag).catch(() => { });
        } else {
            deactivateKeepAwake(tag).catch(() => { });
        }
        return () => { deactivateKeepAwake(tag).catch(() => { }); };
    }, [viewMode]);

    const finishExam = useCallback(async (finalLaps: LapRecord[]) => {
        stopTimer();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const session: ExamSession = {
            id: Date.now().toString(),
            title: customTitle || buildFallbackTitle(displayCategoryName),
            categoryName: displayCategoryName,
            categoryId: typeof categoryId === "string" ? categoryId : "",
            date: new Date().toISOString(),
            totalQuestions: finalLaps.length,
            totalSeconds: totalSeconds,
            targetSeconds: targetMinutesValue * 60,
            laps: finalLaps,
        };
        await saveSession(session);
        setCompletedSession(session);
        setViewMode("result");
    }, [categoryId, customTitle, displayCategoryName, stopTimer, targetMinutesValue, totalSeconds]);

    const nextQuestion = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const lapDuration = totalSeconds - lastLapTime;
        const updatedLaps = [...laps, { questionNo: currentQuestion, duration: lapDuration }];
        setLaps(updatedLaps);
        setLastLapTime(totalSeconds);

        if (currentQuestion < totalQuestionsValue) {
            setCurrentQuestion(prev => prev + 1);
        } else {
            finishExam(updatedLaps);
        }
    }, [currentQuestion, finishExam, lastLapTime, laps, totalQuestionsValue, totalSeconds]);

    useEffect(() => {
        if (viewMode !== 'running') return;
        const preventLeave = navigation.addListener('beforeRemove', (e) => {
            e.preventDefault();
            Alert.alert("집중 모드", "타이머 종료 후 이동할 수 있어요.", [
                { text: "계속 진행", style: "cancel" },
                { text: "저장하고 종료", style: 'destructive', onPress: () => finishExam(laps) }
            ]);
        });
        return preventLeave;
    }, [finishExam, laps, navigation, viewMode]);

    const formatClock = (sec: number) => {
        const safe = Math.max(0, sec);
        const m = Math.floor(safe / 60);
        const s = safe % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const renderRunning = () => {
        const curLapSec = totalSeconds - lastLapTime;
        const remainingSeconds = (targetMinutesValue * 60) - totalSeconds;
        const isOverTarget = remainingSeconds <= 0;
        const remainingAbs = Math.abs(remainingSeconds);
        const progress = Math.min(100, (currentQuestion / totalQuestionsValue) * 100);

        return (
            <TouchableOpacity style={styles.runningScreen} activeOpacity={1} onPress={nextQuestion}>
                <SafeAreaView style={{ flex: 1 }}>
                    <View style={styles.runHeader}>
                        <Text style={styles.runSub}>{displayCategoryName}</Text>
                        <TouchableOpacity onPress={() => Alert.alert("종료", "지금까지의 기록을 저장할까요?", [{ text: "취소" }, { text: "저장 및 종료", style: 'destructive', onPress: () => finishExam(laps) }])}>
                            <Ionicons name="close-circle" size={32} color={THEME_GREEN.textMuted} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.runMain}>
                        <View style={styles.progress}><View style={[styles.bar, { width: `${progress}%` }]} /></View>
                        <Text style={styles.runQ}>Q.{currentQuestion}</Text>
                        <Text style={styles.runTime}>{formatClock(curLapSec)}</Text>
                        <View style={styles.timerBlock}>
                            <Text style={styles.timerLabel}>타이머</Text>
                            <Text style={[styles.timerValue, isOverTarget && { color: THEME_GREEN.accent }]}>
                                {formatClock(remainingAbs)}
                            </Text>
                            <Text style={styles.timerHint}>{isOverTarget ? "초과됨" : "남음"}</Text>
                        </View>
                    </View>
                    <Text style={styles.runTap}>터치하여 다음 문항</Text>
                </SafeAreaView>
            </TouchableOpacity>
        );
    };

    const renderResult = () => (
        <SafeAreaView style={styles.resultScreen}>
            <View style={[styles.resHeader, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={THEME_GREEN.textMain} />
                </TouchableOpacity>
                <Text style={styles.resTitle}>분석 리포트</Text>
                <View style={{ width: 32 }} />
            </View>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.resultContent, { paddingBottom: insets.bottom + 24 }]}
            >
                {completedSession && <SessionDetail session={completedSession} />}
            </ScrollView>
        </SafeAreaView>
    );

    return viewMode === 'running' ? renderRunning() : renderResult();
}

const styles = StyleSheet.create({
    runningScreen: { flex: 1, backgroundColor: '#FFF' },
    runHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24 },
    runSub: { fontSize: 14, fontWeight: '700', color: THEME_GREEN.textMuted },
    runMain: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
    progress: { width: '100%', height: 6, backgroundColor: THEME_GREEN.border, borderRadius: 3, overflow: 'hidden', marginBottom: 60 },
    bar: { height: '100%', backgroundColor: THEME_GREEN.point },
    runQ: { fontSize: 24, fontWeight: '800', color: THEME_GREEN.textMuted, marginBottom: 8 },
    runTime: { fontSize: 80, fontWeight: '900', fontVariant: ['tabular-nums'], letterSpacing: -2 },
    timerBlock: { alignItems: 'center', marginTop: 12 },
    timerLabel: { fontSize: 13, color: THEME_GREEN.textMuted, fontWeight: '700', marginBottom: 4 },
    timerValue: { fontSize: 32, fontWeight: '800', color: THEME_GREEN.textMain, fontVariant: ['tabular-nums'] },
    timerHint: { fontSize: 13, color: THEME_GREEN.textMuted, fontWeight: '700', marginTop: 4 },
    runTap: { textAlign: 'center', marginBottom: 60, fontSize: 15, fontWeight: '800', color: THEME_GREEN.point },

    resultScreen: { flex: 1, backgroundColor: '#FFF' },
    resHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: THEME_GREEN.border },
    backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    resTitle: { fontSize: 20, fontWeight: '800', color: THEME_GREEN.textMain },
    resultContent: { paddingHorizontal: 24, paddingTop: 16 },
});
