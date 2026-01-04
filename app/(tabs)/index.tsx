import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Dimensions,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ExamSession, LapRecord, saveSession } from "../../lib/storage";

const { width } = Dimensions.get('window');

// --- Types ---
type Category = {
    id: string;
    name: string;
};

const buildFallbackTitle = (categoryName: string) => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}.${m}.${d} ${categoryName}`;
};

// --- Colors ---
const COLORS = {
    bg: "#F8FAFC",
    surface: "#FFFFFF",
    text: "#0F172A",
    textMuted: "#64748B",
    primary: "#6366F1",
    primaryLight: "#EEF2FF",
    border: "#E2E8F0",
    accent: "#F43F5E",
    success: "#10B981",
    darkBg: "#0F172A",
    white: "#FFFFFF",
};

export default function ExamScreen() {
    // --- Setup State ---
    const [categories] = useState<Category[]>([
        { id: "lang", name: "언어논리" },
        { id: "data", name: "자료해석" },
        { id: "situ", name: "상황판단" },
        { id: "const", name: "헌법" },
    ]);
    const [selectedId, setSelectedId] = useState<string>("lang");

    const selectedCategory = useMemo(() =>
        categories.find((c) => c.id === selectedId) || categories[0]
        , [categories, selectedId]);

    const [viewMode, setViewMode] = useState<"setup" | "running" | "result">("setup");
    const [title, setTitle] = useState("");
    const [totalQuestions, setTotalQuestions] = useState("40");
    const [targetMinutes, setTargetMinutes] = useState("90");

    const [currentQuestion, setCurrentQuestion] = useState(1);
    const [totalSeconds, setTotalSeconds] = useState(0);
    const [lastLapTime, setLastLapTime] = useState(0);
    const [laps, setLaps] = useState<LapRecord[]>([]);

    const [lapSortMode, setLapSortMode] = useState<"number" | "slowest" | "fastest">("number");
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // --- Logic ---
    const expectedPace = useMemo(() => {
        const q = parseInt(totalQuestions);
        const t = parseInt(targetMinutes);
        if (isNaN(q) || isNaN(t) || q <= 0 || t <= 0) return null;

        const totalSec = t * 60;
        const perQ = totalSec / q;
        const m = Math.floor(perQ / 60);
        const s = Math.round(perQ % 60);

        if (m === 0) return `${s}초`;
        return `${m}분 ${s}초`;
    }, [totalQuestions, targetMinutes]);

    const adjustValue = (setter: React.Dispatch<React.SetStateAction<string>>, current: string, delta: number) => {
        const val = parseInt(current) || 0;
        const next = Math.max(1, val + delta);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setter(next.toString());
    };

    const startExam = () => {
        const qCount = parseInt(totalQuestions);
        if (isNaN(qCount) || qCount <= 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("알림", "올바른 문항 수를 입력해주세요.");
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        setLaps([]);
        setCurrentQuestion(1);
        setTotalSeconds(0);
        setLastLapTime(0);
        setViewMode("running");

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTotalSeconds((prev) => prev + 1);
        }, 1000);
    };

    const nextQuestion = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const qCount = parseInt(totalQuestions);
        const lapDuration = totalSeconds - lastLapTime;
        const newLap: LapRecord = { questionNo: currentQuestion, duration: lapDuration };

        const updatedLaps = [...laps, newLap];
        setLaps(updatedLaps);
        setLastLapTime(totalSeconds);

        if (currentQuestion < qCount) {
            setCurrentQuestion((prev) => prev + 1);
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            exitAndSave(updatedLaps);
        }
    };

    const stopExamManual = () => {
        Alert.alert(
            "시험 종료",
            "집중 기록을 중단하고 지금까지의 결과를 저장할까요?",
            [
                { text: "계속하기", style: "cancel" },
                {
                    text: "종료 및 저장",
                    style: "destructive",
                    onPress: () => {
                        const lapDuration = totalSeconds - lastLapTime;
                        const newLap: LapRecord = { questionNo: currentQuestion, duration: lapDuration };
                        exitAndSave([...laps, newLap]);
                    }
                }
            ]
        );
    };

    const exitAndSave = async (finalLaps: LapRecord[]) => {
        if (timerRef.current) clearInterval(timerRef.current);
        const finalTitle = title.trim() || buildFallbackTitle(selectedCategory.name);
        const session: ExamSession = {
            id: Date.now().toString(),
            title: finalTitle,
            categoryName: selectedCategory.name,
            categoryId: selectedCategory.id,
            date: new Date().toISOString(),
            totalQuestions: finalLaps.length,
            totalSeconds: totalSeconds,
            targetSeconds: parseInt(targetMinutes) * 60,
            laps: finalLaps,
        };
        await saveSession(session);
        setViewMode("result");
    };

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}분 ${s}초`;
    };

    const formatDigital = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const formatDigitalFull = (sec: number) => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const analysis = useMemo(() => {
        if (!laps.length) return null;
        const avg = Math.floor(totalSeconds / laps.length);
        const fastest = laps.reduce((best, lap) => lap.duration < best.duration ? lap : best, laps[0]);
        const slowest = laps.reduce((worst, lap) => lap.duration > worst.duration ? lap : worst, laps[0]);
        const targetPaceSec = (parseInt(targetMinutes) * 60) / parseInt(totalQuestions);
        const efficientLaps = laps.filter(l => l.duration <= targetPaceSec).length;
        return { avg, fastest, slowest, efficientLaps, targetPaceSec };
    }, [laps, totalSeconds, targetMinutes, totalQuestions]);

    const sortedLaps = useMemo(() => {
        const copy = [...laps];
        if (lapSortMode === 'slowest') return copy.sort((a, b) => b.duration - a.duration);
        if (lapSortMode === 'fastest') return copy.sort((a, b) => a.duration - b.duration);
        return copy.sort((a, b) => a.questionNo - b.questionNo);
    }, [laps, lapSortMode]);

    // --- Views ---

    const renderSetup = () => (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <StatusBar barStyle="dark-content" />
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.headerSubtitle}>심플하게, 목표에 집중하세요</Text>
                    <Text style={styles.headerTitle}>PaceTime</Text>
                </View>

                {/* Simplified Category Selector (Tabs style) */}
                <View style={styles.categoryTabRow}>
                    {categories.map((cat) => (
                        <TouchableOpacity
                            key={cat.id}
                            style={[styles.categoryTab, selectedId === cat.id && styles.categoryTabActive]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setSelectedId(cat.id);
                            }}
                        >
                            <Text style={[styles.categoryTabText, selectedId === cat.id && styles.categoryTabTextActive]}>
                                {cat.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Title Input */}
                <View style={styles.simpleCard}>
                    <Text style={styles.simpleLabel}>시험 제목</Text>
                    <TextInput
                        style={styles.simpleTitleInput}
                        placeholder={`예: 2026년 ${selectedCategory.name} 자학`}
                        placeholderTextColor={COLORS.textMuted}
                        value={title}
                        onChangeText={setTitle}
                    />
                </View>

                {/* Settings Grid */}
                <View style={styles.settingsGrid}>
                    <View style={styles.simpleSettingCard}>
                        <Text style={styles.simpleLabel}>문항 수</Text>
                        <View style={styles.simpleValueRow}>
                            <TextInput
                                style={styles.simpleMainInput}
                                keyboardType="number-pad"
                                value={totalQuestions}
                                onChangeText={setTotalQuestions}
                                selectTextOnFocus
                            />
                            <Text style={styles.simpleUnit}>문항</Text>
                        </View>
                        <View style={styles.simpleStepRow}>
                            <TouchableOpacity style={styles.simpleBtn} onPress={() => adjustValue(setTotalQuestions, totalQuestions, -1)}>
                                <Ionicons name="remove" size={18} color={COLORS.text} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.simpleBtn} onPress={() => adjustValue(setTotalQuestions, totalQuestions, 1)}>
                                <Ionicons name="add" size={18} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.simpleSettingCard}>
                        <Text style={styles.simpleLabel}>목표 시간</Text>
                        <View style={styles.simpleValueRow}>
                            <TextInput
                                style={styles.simpleMainInput}
                                keyboardType="number-pad"
                                value={targetMinutes}
                                onChangeText={setTargetMinutes}
                                selectTextOnFocus
                            />
                            <Text style={styles.simpleUnit}>분</Text>
                        </View>
                        <View style={styles.simpleStepRow}>
                            <TouchableOpacity style={styles.simpleBtn} onPress={() => adjustValue(setTargetMinutes, targetMinutes, -5)}>
                                <Ionicons name="remove" size={18} color={COLORS.text} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.simpleBtn} onPress={() => adjustValue(setTargetMinutes, targetMinutes, 5)}>
                                <Ionicons name="add" size={18} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Pace Hint (Simplified) */}
                {expectedPace && (
                    <View style={styles.simpleBanner}>
                        <Ionicons name="flash" size={16} color={COLORS.primary} />
                        <Text style={styles.simpleBannerText}>
                            예상 페이스: <Text style={{ fontWeight: '800' }}>{expectedPace}</Text>
                        </Text>
                    </View>
                )}

                <TouchableOpacity style={styles.primaryActionBtn} onPress={startExam} activeOpacity={0.8}>
                    <Text style={styles.primaryActionText}>집중 기록 시작</Text>
                </TouchableOpacity>
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );

    const renderRunning = () => {
        const displayTitle = title.trim() || buildFallbackTitle(selectedCategory.name);
        const targetSec = parseInt(targetMinutes) * 60;
        const remainingSec = Math.max(0, targetSec - totalSeconds);
        const currentLapSec = totalSeconds - lastLapTime;

        return (
            <View style={styles.runningOverlay}>
                <StatusBar barStyle="light-content" />
                <TouchableOpacity style={styles.runningTouchArea} onPress={nextQuestion} activeOpacity={1}>
                    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
                        <View style={styles.runningHeaderCompact}>
                            <Text style={styles.runningTitleLabel}>{selectedCategory.name}</Text>
                            <Text style={styles.runningMainTitle} numberOfLines={1}>{displayTitle}</Text>
                            <TouchableOpacity style={styles.runningCloseBtn} onPress={stopExamManual}>
                                <Ionicons name="close" size={24} color={COLORS.white} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.runningCenter}>
                            <View style={styles.runningQBadge}>
                                <Text style={styles.runningQText}>{currentQuestion}</Text>
                                <Text style={styles.runningQTotal}>/ {totalQuestions}</Text>
                            </View>

                            <View style={styles.runningTimerSection}>
                                <View style={styles.lapTimerBox}>
                                    <Text style={styles.lapTimerLabel}>현재 문항</Text>
                                    <Text style={styles.lapTimerValue}>{formatDigital(currentLapSec)}</Text>
                                </View>

                                <View style={styles.mainTimerBox}>
                                    <Text style={styles.mainTimerValue}>{formatDigitalFull(remainingSec)}</Text>
                                    <Text style={styles.mainTimerLabel}>남은 시간</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.runningFooterCompact}>
                            <Ionicons name="finger-print" size={28} color={COLORS.primary} style={{ marginBottom: 12 }} />
                            <Text style={styles.runningTapHint}>화면을 터치해서 다음 문제로</Text>
                        </View>
                    </SafeAreaView>
                </TouchableOpacity>
            </View>
        );
    };

    const renderResult = () => (
        <View style={styles.resultOverlay}>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
                <StatusBar barStyle="dark-content" />
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                    <View style={styles.resultTop}>
                        <Text style={styles.resultTitleMain}>기록 완료</Text>
                        <Text style={styles.resultSubtitleMain}>오늘도 수고하셨습니다.</Text>
                    </View>

                    <View style={styles.summaryScrollBox}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
                            <View style={[styles.summaryBox, { backgroundColor: COLORS.primaryLight }]}>
                                <Text style={styles.summaryBoxLabel}>총 시간</Text>
                                <Text style={styles.summaryBoxVal}>{formatTime(totalSeconds)}</Text>
                            </View>
                            <View style={[styles.summaryBox, { backgroundColor: '#ECFDF5' }]}>
                                <Text style={styles.summaryBoxLabel}>평균 페이스</Text>
                                <Text style={styles.summaryBoxVal}>
                                    {laps.length > 0 ? formatTime(Math.floor(totalSeconds / laps.length)) : "0초"}
                                </Text>
                            </View>
                            {analysis && (
                                <View style={[styles.summaryBox, { backgroundColor: '#FDF2F8' }]}>
                                    <Text style={styles.summaryBoxLabel}>목표 내</Text>
                                    <Text style={styles.summaryBoxVal}>{analysis.efficientLaps}문항</Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>

                    <View style={styles.resultSection}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionTitle}>문항별 상세</Text>
                            <View style={styles.sortToggle}>
                                <TouchableOpacity
                                    style={[styles.sortToggleBtn, lapSortMode === 'number' && styles.sortToggleBtnActive]}
                                    onPress={() => setLapSortMode('number')}
                                >
                                    <Text style={[styles.sortToggleText, lapSortMode === 'number' && styles.sortToggleTextActive]}>번호순</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.sortToggleBtn, lapSortMode === 'slowest' && styles.sortToggleBtnActive]}
                                    onPress={() => setLapSortMode('slowest')}
                                >
                                    <Text style={[styles.sortToggleText, lapSortMode === 'slowest' && styles.sortToggleTextActive]}>느린순</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.lapGrid}>
                            {sortedLaps.map((lap) => {
                                const isEfficient = analysis && lap.duration <= analysis.targetPaceSec;
                                const isTimeSink = analysis && lap.duration > analysis.targetPaceSec * 1.5;
                                return (
                                    <View key={lap.questionNo} style={styles.lapListItem}>
                                        <View style={styles.lapCircle}>
                                            <Text style={styles.lapNum}>{lap.questionNo}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.lapDuration}>{formatTime(lap.duration)}</Text>
                                        </View>
                                        {isTimeSink ? (
                                            <View style={[styles.lapStatus, { backgroundColor: '#FFF1F2' }]}><Text style={[styles.lapStatusText, { color: COLORS.accent }]}>지체</Text></View>
                                        ) : isEfficient ? (
                                            <View style={[styles.lapStatus, { backgroundColor: '#ECFDF5' }]}><Text style={[styles.lapStatusText, { color: COLORS.success }]}>안정</Text></View>
                                        ) : null}
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                </ScrollView>

                <View style={styles.resultActions}>
                    <TouchableOpacity
                        style={styles.doneBtn}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setViewMode("setup");
                        }}
                    >
                        <Text style={styles.doneBtnText}>메인으로</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );

    return (
        <View style={{ flex: 1 }}>
            {renderSetup()}
            <Modal visible={viewMode === 'running'} animationType="slide">
                <SafeAreaProvider>
                    {renderRunning()}
                </SafeAreaProvider>
            </Modal>
            <Modal visible={viewMode === 'result'} animationType="slide">
                <SafeAreaProvider>
                    {renderResult()}
                </SafeAreaProvider>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.bg },
    scrollContent: { padding: 24 },
    header: { marginTop: 40, marginBottom: 32 },
    headerSubtitle: { fontSize: 14, color: COLORS.textMuted, fontWeight: "600", marginBottom: 4 },
    headerTitle: { fontSize: 32, fontWeight: "900", color: COLORS.text, letterSpacing: -1 },

    // Category Tabs
    categoryTabRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, backgroundColor: '#EDF0F5', padding: 4, borderRadius: 16 },
    categoryTab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
    categoryTabActive: { backgroundColor: COLORS.surface, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    categoryTabText: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
    categoryTabTextActive: { color: COLORS.primary },

    // Simple Card
    simpleCard: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
    simpleLabel: { fontSize: 12, fontWeight: '800', color: COLORS.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
    simpleTitleInput: { fontSize: 18, fontWeight: '700', color: COLORS.text, paddingVertical: 8 },

    // Settings Grid
    settingsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    simpleSettingCard: { flex: 0.48, backgroundColor: COLORS.surface, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: COLORS.border },
    simpleValueRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginBottom: 16 },
    simpleMainInput: { fontSize: 28, fontWeight: '800', color: COLORS.text, textAlign: 'right', minWidth: 40 },
    simpleUnit: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted, marginLeft: 4 },
    simpleStepRow: { flexDirection: 'row', justifyContent: 'space-between' },
    simpleBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },

    // Banner
    simpleBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryLight, padding: 16, borderRadius: 20, marginBottom: 32 },
    simpleBannerText: { fontSize: 14, color: COLORS.text, marginLeft: 8 },

    primaryActionBtn: { backgroundColor: COLORS.primary, paddingVertical: 20, borderRadius: 24, alignItems: "center", justifyContent: "center", shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 },
    primaryActionText: { color: COLORS.white, fontSize: 17, fontWeight: "800" },

    // Running View
    runningOverlay: { flex: 1, backgroundColor: COLORS.darkBg },
    runningTouchArea: { flex: 1 },
    runningHeaderCompact: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 20 },
    runningTitleLabel: { color: COLORS.primary, fontWeight: '800', fontSize: 12, marginRight: 12, backgroundColor: 'rgba(99, 102, 241, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    runningMainTitle: { flex: 1, color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600' },
    runningCloseBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    runningCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    runningQBadge: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 40 },
    runningQText: { fontSize: 100, fontWeight: '900', color: COLORS.white, letterSpacing: -2 },
    runningQTotal: { fontSize: 24, fontWeight: '600', color: 'rgba(255,255,255,0.3)', marginLeft: 8 },
    runningTimerSection: { alignItems: 'center' },
    lapTimerBox: { alignItems: 'center', marginBottom: 40, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
    lapTimerLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '700', marginBottom: 4 },
    lapTimerValue: { fontSize: 32, fontWeight: '800', color: COLORS.primary, fontVariant: ['tabular-nums'] },
    mainTimerBox: { alignItems: 'center' },
    mainTimerValue: { fontSize: 44, fontWeight: '800', color: COLORS.white, fontVariant: ['tabular-nums'] },
    mainTimerLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
    runningFooterCompact: { alignItems: 'center', paddingBottom: 40 },
    runningTapHint: { fontSize: 13, color: 'rgba(255,255,255,0.3)', fontWeight: '500' },

    // Result View
    resultOverlay: { flex: 1, backgroundColor: COLORS.bg },
    resultTop: { padding: 24, paddingTop: 40 },
    resultTitleMain: { fontSize: 32, fontWeight: '900', color: COLORS.text },
    resultSubtitleMain: { fontSize: 16, color: COLORS.textMuted, marginTop: 4 },
    summaryScrollBox: { marginBottom: 32 },
    summaryBox: { width: 140, height: 100, borderRadius: 24, padding: 16, marginRight: 12, justifyContent: 'center' },
    summaryBoxLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '700', marginBottom: 8 },
    summaryBoxVal: { fontSize: 17, color: COLORS.text, fontWeight: '800' },
    resultSection: { paddingHorizontal: 24 },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    sortToggle: { flexDirection: 'row', backgroundColor: COLORS.border, padding: 3, borderRadius: 8 },
    sortToggleBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
    sortToggleBtnActive: { backgroundColor: COLORS.surface },
    sortToggleText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
    sortToggleTextActive: { color: COLORS.text },
    lapGrid: { marginBottom: 40 },
    lapListItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
    lapCircle: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    lapNum: { fontSize: 14, fontWeight: '800', color: COLORS.text },
    lapDuration: { fontSize: 15, fontWeight: '700', color: COLORS.text },
    lapStatus: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    lapStatusText: { fontSize: 11, fontWeight: '800' },
    resultActions: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
    doneBtn: { backgroundColor: COLORS.text, paddingVertical: 20, borderRadius: 20, alignItems: 'center' },
    doneBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
});
