import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import SessionDetail from '../../components/SessionDetail';
import { Category, DEFAULT_CATEGORIES, ExamSession, LapRecord, getCategories, saveSession } from "../../lib/storage";

// --- 이미지 테마와 동일한 컬러 ---
const THEME_GREEN = {
    point: '#00D094',      // 메인 민트 그린
    pointLight: '#E6F9F4', // 연한 배경
    textMain: '#1C1C1E',
    textMuted: '#8E8E93',
    bg: '#F8F9FA',
    border: '#F2F2F7',
};

const buildFallbackTitle = (categoryName: string) => {
    const now = new Date();
    return `${now.getMonth() + 1}월 ${now.getDate()}일 ${categoryName} 연습`;
};

export default function ExamScreen() {
    const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
    const [selectedId, setSelectedId] = useState<string>("lang");
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    // 상태 관리
    const [viewMode, setViewMode] = useState<"setup" | "running" | "result">("setup");
    const [title, setTitle] = useState("");
    const [totalQuestions, setTotalQuestions] = useState("40");
    const [targetMinutes, setTargetMinutes] = useState("90");

    const [currentQuestion, setCurrentQuestion] = useState(1);
    const [totalSeconds, setTotalSeconds] = useState(0);
    const [lastLapTime, setLastLapTime] = useState(0);
    const [laps, setLaps] = useState<LapRecord[]>([]);
    const [completedSession, setCompletedSession] = useState<ExamSession | null>(null);

    const insets = useSafeAreaInsets();
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastTickRef = useRef<number | null>(null);

    const selectedCategory = useMemo(() =>
        categories.find((c) => c.id === selectedId) || categories[0]
        , [categories, selectedId]);

    // --- 유틸리티 ---
    const toPositiveNumber = (value: string, fallback: number) => {
        const num = parseInt(value, 10);
        return (Number.isNaN(num) || num <= 0) ? fallback : num;
    };

    const expectedPace = useMemo(() => {
        const q = toPositiveNumber(totalQuestions, 0);
        const t = toPositiveNumber(targetMinutes, 0);
        if (q <= 0 || t <= 0) return null;
        const perQ = (t * 60) / q;
        const m = Math.floor(perQ / 60);
        const s = Math.round(perQ % 60);
        return m === 0 ? `${s}초` : `${m}분 ${s}초`;
    }, [totalQuestions, targetMinutes]);

    const adjustValue = (setter: React.Dispatch<React.SetStateAction<string>>, current: string, delta: number) => {
        const val = parseInt(current) || 0;
        const next = Math.max(1, val + delta);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setter(next.toString());
    };

    // --- 타이머 로직 ---
    const startTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        lastTickRef.current = Date.now();
        timerRef.current = setInterval(() => {
            setTotalSeconds(prev => prev + 1);
            lastTickRef.current = Date.now();
        }, 1000);
    };

    const stopTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
    };

    // --- 시험 실행 로직 ---
    const startExam = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setLaps([]);
        setCurrentQuestion(1);
        setTotalSeconds(0);
        setLastLapTime(0);
        setViewMode("running");
        startTimer();
    };

    const nextQuestion = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const qCount = toPositiveNumber(totalQuestions, 40);
        const lapDuration = totalSeconds - lastLapTime;
        const newLap = { questionNo: currentQuestion, duration: lapDuration };
        const updatedLaps = [...laps, newLap];

        setLaps(updatedLaps);
        setLastLapTime(totalSeconds);

        if (currentQuestion < qCount) {
            setCurrentQuestion(prev => prev + 1);
        } else {
            finishExam(updatedLaps);
        }
    };

    const finishExam = async (finalLaps: LapRecord[]) => {
        stopTimer();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const session: ExamSession = {
            id: Date.now().toString(),
            title: title.trim() || buildFallbackTitle(selectedCategory.name),
            categoryName: selectedCategory.name,
            categoryId: selectedCategory.id,
            date: new Date().toISOString(),
            totalQuestions: finalLaps.length,
            totalSeconds: totalSeconds,
            targetSeconds: toPositiveNumber(targetMinutes, 90) * 60,
            laps: finalLaps,
        };

        await saveSession(session);
        setCompletedSession(session);
        setViewMode("result");
    };

    // 초기 데이터 로드
    useEffect(() => {
        const init = async () => {
            const saved = await getCategories();
            setCategories(saved);
            const first = saved[0] || DEFAULT_CATEGORIES[0];
            setSelectedId(first.id);
            setTotalQuestions(first.defaultQuestions ?? "40");
            setTargetMinutes(first.defaultMinutes ?? "90");
        };
        init();
    }, []);

    // --- UI Render ---

    const renderSetup = () => (
        <SafeAreaView style={styles.setupScreen} edges={['top']}>
            <AppHeader />
            <ScrollView contentContainerStyle={styles.setupScroll} showsVerticalScrollIndicator={false}>

                {/* 1. 과목 선택 카드 */}
                <Text style={styles.setupLabel}>연습 과목</Text>
                <TouchableOpacity
                    style={styles.categoryCard}
                    onPress={() => setIsMenuOpen(true)}
                    activeOpacity={0.7}
                >
                    <View style={styles.categoryCardInfo}>
                        <View style={styles.dot} />
                        <Text style={styles.categoryNameText}>{selectedCategory.name}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={THEME_GREEN.textMuted} />
                </TouchableOpacity>

                {/* 2. 제목 입력 카드 */}
                <Text style={styles.setupLabel}>연습 제목</Text>
                <View style={styles.inputCard}>
                    <TextInput
                        style={styles.titleInput}
                        placeholder={buildFallbackTitle(selectedCategory.name)}
                        value={title}
                        onChangeText={setTitle}
                        placeholderTextColor={THEME_GREEN.textMuted}
                    />
                </View>

                {/* 3. 문항/시간 설정 그리드 */}
                <View style={styles.settingsGrid}>
                    <View style={styles.settingBox}>
                        <Text style={styles.settingLabel}>문항 수</Text>
                        <Text style={styles.settingValue}>{totalQuestions}<Text style={styles.settingUnit}>문항</Text></Text>
                        <View style={styles.stepperRow}>
                            <TouchableOpacity onPress={() => adjustValue(setTotalQuestions, totalQuestions, -1)} style={styles.stepBtn}>
                                <Ionicons name="remove" size={20} color={THEME_GREEN.textMain} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => adjustValue(setTotalQuestions, totalQuestions, 1)} style={styles.stepBtn}>
                                <Ionicons name="add" size={20} color={THEME_GREEN.textMain} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.settingBox}>
                        <Text style={styles.settingLabel}>목표 시간</Text>
                        <Text style={styles.settingValue}>{targetMinutes}<Text style={styles.settingUnit}>분</Text></Text>
                        <View style={styles.stepperRow}>
                            <TouchableOpacity onPress={() => adjustValue(setTargetMinutes, targetMinutes, -5)} style={styles.stepBtn}>
                                <Ionicons name="remove" size={20} color={THEME_GREEN.textMain} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => adjustValue(setTargetMinutes, targetMinutes, 5)} style={styles.stepBtn}>
                                <Ionicons name="add" size={20} color={THEME_GREEN.textMain} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {expectedPace && (
                    <View style={styles.paceInfo}>
                        <Ionicons name="speedometer-outline" size={16} color={THEME_GREEN.point} />
                        <Text style={styles.paceInfoText}>문항당 예상 페이스: <Text style={{ fontWeight: '800' }}>{expectedPace}</Text></Text>
                    </View>
                )}
            </ScrollView>

            <View style={[styles.setupFooter, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity style={styles.startBtn} onPress={startExam} activeOpacity={0.8}>
                    <Text style={styles.startBtnText}>집중 시작하기</Text>
                </TouchableOpacity>
            </View>

            {/* 과목 선택 모달 (심플 리스트) */}
            <Modal visible={isMenuOpen} transparent animationType="slide">
                <Pressable style={styles.modalOverlay} onPress={() => setIsMenuOpen(false)}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>과목 선택</Text>
                            <TouchableOpacity onPress={() => setIsMenuOpen(false)}>
                                <Ionicons name="close" size={24} color={THEME_GREEN.textMain} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={categories}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.modalItem}
                                    onPress={() => {
                                        setSelectedId(item.id);
                                        setTotalQuestions(item.defaultQuestions ?? "40");
                                        setTargetMinutes(item.defaultMinutes ?? "90");
                                        setIsMenuOpen(false);
                                    }}
                                >
                                    <Text style={[styles.modalItemText, selectedId === item.id && { color: THEME_GREEN.point }]}>{item.name}</Text>
                                    {selectedId === item.id && <Ionicons name="checkmark" size={20} color={THEME_GREEN.point} />}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );

    const renderRunning = () => {
        const curLapSec = totalSeconds - lastLapTime;
        const m = Math.floor(curLapSec / 60);
        const s = curLapSec % 60;
        const totalQ = toPositiveNumber(totalQuestions, 40);
        const progress = (currentQuestion / totalQ) * 100;

        return (
            <TouchableOpacity style={styles.runningContainer} activeOpacity={1} onPress={nextQuestion}>
                <SafeAreaView style={{ flex: 1 }}>
                    <View style={styles.runningHeader}>
                        <Text style={styles.runningSub}>{selectedCategory.name} 연습 중</Text>
                        <TouchableOpacity onPress={() => {
                            Alert.alert("연습 중단", "지금까지의 기록을 저장하고 종료할까요?", [
                                { text: "계속하기", style: 'cancel' },
                                { text: "종료", style: 'destructive', onPress: () => finishExam(laps) }
                            ]);
                        }}>
                            <Ionicons name="close-circle" size={32} color={THEME_GREEN.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.runningMain}>
                        <View style={styles.progressContainer}>
                            <View style={[styles.progressBar, { width: `${progress}%` }]} />
                        </View>

                        <Text style={styles.currentQ}>Q.{currentQuestion}</Text>

                        <View style={styles.timerWrapper}>
                            <Text style={styles.timerText}>
                                {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
                            </Text>
                            <Text style={styles.totalTimeInfo}>총 시간 {Math.floor(totalSeconds / 60)}분 {totalSeconds % 60}초</Text>
                        </View>
                    </View>

                    <Text style={styles.tapToNext}>화면을 터치하여 다음 문항</Text>
                </SafeAreaView>
            </TouchableOpacity>
        );
    };

    const renderResult = () => (
        <SafeAreaView style={styles.setupScreen}>
            <View style={styles.resultHeader}>
                <Text style={styles.resultTitle}>분석 결과</Text>
                <TouchableOpacity onPress={() => setViewMode("setup")}>
                    <Ionicons name="close" size={28} color={THEME_GREEN.textMain} />
                </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
                {completedSession && <SessionDetail session={completedSession} onBack={() => setViewMode("setup")} />}
            </ScrollView>
        </SafeAreaView>
    );

    return (
        <View style={{ flex: 1 }}>
            {viewMode === 'setup' && renderSetup()}
            {viewMode === 'running' && renderRunning()}
            {viewMode === 'result' && renderResult()}
        </View>
    );
}

const styles = StyleSheet.create({
    setupScreen: { flex: 1, backgroundColor: THEME_GREEN.bg },
    setupScroll: { paddingHorizontal: 24, paddingBottom: 120 },
    setupLabel: { fontSize: 13, fontWeight: '700', color: THEME_GREEN.textMuted, marginBottom: 12, marginTop: 24, marginLeft: 4 },

    // 카테고리 카드
    categoryCard: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: THEME_GREEN.border,
    },
    categoryCardInfo: { flexDirection: 'row', alignItems: 'center' },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: THEME_GREEN.point, marginRight: 10 },
    categoryNameText: { fontSize: 17, fontWeight: '700', color: THEME_GREEN.textMain },

    // 제목 입력 카드
    inputCard: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: THEME_GREEN.border,
    },
    titleInput: { fontSize: 16, fontWeight: '600', color: THEME_GREEN.textMain },

    // 설정 그리드
    settingsGrid: { flexDirection: 'row', gap: 16, marginTop: 8 },
    settingBox: {
        flex: 1,
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: THEME_GREEN.border,
    },
    settingLabel: { fontSize: 12, fontWeight: '700', color: THEME_GREEN.textMuted, marginBottom: 8 },
    settingValue: { fontSize: 24, fontWeight: '900', color: THEME_GREEN.textMain, marginBottom: 16 },
    settingUnit: { fontSize: 14, fontWeight: '600', color: THEME_GREEN.textMuted },
    stepperRow: { flexDirection: 'row', gap: 12 },
    stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: THEME_GREEN.bg, alignItems: 'center', justifyContent: 'center' },

    paceInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, gap: 6 },
    paceInfoText: { fontSize: 13, color: THEME_GREEN.textMuted },

    setupFooter: { paddingHorizontal: 24, backgroundColor: THEME_GREEN.bg },
    startBtn: { backgroundColor: THEME_GREEN.point, paddingVertical: 18, borderRadius: 24, alignItems: 'center', shadowColor: THEME_GREEN.point, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    startBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

    // Running View
    runningContainer: { flex: 1, backgroundColor: '#FFF' },
    runningHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24 },
    runningSub: { fontSize: 14, fontWeight: '600', color: THEME_GREEN.textMuted },
    runningMain: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
    progressContainer: { width: '100%', height: 6, backgroundColor: THEME_GREEN.border, borderRadius: 3, overflow: 'hidden', marginBottom: 60 },
    progressBar: { height: '100%', backgroundColor: THEME_GREEN.point },
    currentQ: { fontSize: 24, fontWeight: '800', color: THEME_GREEN.textMuted, marginBottom: 10 },
    timerWrapper: { alignItems: 'center' },
    timerText: { fontSize: 80, fontWeight: '900', color: THEME_GREEN.textMain, fontVariant: ['tabular-nums'], letterSpacing: -2 },
    totalTimeInfo: { fontSize: 14, fontWeight: '600', color: THEME_GREEN.textMuted, marginTop: 10 },
    tapToNext: { textAlign: 'center', marginBottom: 60, fontSize: 15, fontWeight: '600', color: THEME_GREEN.point },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '60%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 19, fontWeight: '800', color: THEME_GREEN.textMain },
    modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: THEME_GREEN.border },
    modalItemText: { fontSize: 16, fontWeight: '600', color: THEME_GREEN.textMain },

    // Result
    resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: THEME_GREEN.border },
    resultTitle: { fontSize: 20, fontWeight: '800' }
});