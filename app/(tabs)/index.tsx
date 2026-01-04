import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Dimensions,
    FlatList,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Category, DEFAULT_CATEGORIES, ExamSession, LapRecord, getCategories, saveCategories, saveSession } from "../../lib/storage";

const { width, height } = Dimensions.get('window');

// --- Types ---
// Category type is now imported from storage.ts

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
    const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
    const [selectedId, setSelectedId] = useState<string>("lang");
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const insets = useSafeAreaInsets();
    const dropdownWidth = Math.min(210, width - 48);
    const dropdownMaxHeight = Math.max(260, height - insets.top - insets.bottom - 120);

    const selectedCategory = useMemo(() =>
        categories.find((c) => c.id === selectedId) || categories[0] || DEFAULT_CATEGORIES[0]
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

    const addCategory = () => {
        if (!newCategoryName.trim()) return;
        const newCat: Category = {
            id: Date.now().toString(),
            name: newCategoryName.trim(),
            isDefault: false
        };
        const updated = [...categories, newCat];
        setCategories(updated);
        saveCategories(updated);
        setNewCategoryName("");
        setIsAdding(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const deleteCategory = (id: string) => {
        const cat = categories.find(c => c.id === id);
        if (cat?.isDefault) return;

        Alert.alert("카테고리 삭제", `'${cat?.name}' 카테고리를 삭제할까요?`, [
            { text: "취소", style: "cancel" },
            {
                text: "삭제",
                style: "destructive",
                onPress: () => {
                    const updated = categories.filter(c => c.id !== id);
                    setCategories(updated);
                    saveCategories(updated);
                    if (selectedId === id) setSelectedId(updated[0]?.id || "lang");
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
            }
        ]);
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
        const load = async () => {
            const saved = await getCategories();
            setCategories(saved);
        };
        load();
    }, []);

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
            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <Text style={styles.headerSubtitle}>심플하게, 목표에 집중하세요</Text>
                    <Text style={styles.headerTitle}>PaceTime</Text>
                </View>

                {/* Category Trigger */}
                <TouchableOpacity
                    style={styles.trigger}
                    onPress={() => setIsMenuOpen(true)}
                    activeOpacity={0.6}
                >
                    <Text style={styles.triggerText}>{selectedCategory.name}</Text>
                    <View style={styles.iconCircle}>
                        <Ionicons name="chevron-down" size={14} color={COLORS.textMuted} />
                    </View>
                </TouchableOpacity>

                {/* Category Menu Modal */}
                <Modal visible={isMenuOpen} transparent animationType="fade">
                    <Pressable style={styles.menuOverlay} onPress={() => {
                        setIsMenuOpen(false);
                        setIsAdding(false);
                    }}>
                        <View style={[styles.menuContainer, { width: dropdownWidth, maxHeight: dropdownMaxHeight }]}>
                            <View style={styles.menuShadow}>
                                <View style={[styles.menu, { width: dropdownWidth, maxHeight: dropdownMaxHeight }]}>
                                    <FlatList
                                        data={categories}
                                        keyExtractor={(item) => item.id}
                                        keyboardShouldPersistTaps="handled"
                                        renderItem={({ item }) => {
                                            const isActive = item.id === selectedId;
                                            return (
                                                <View style={styles.menuItem}>
                                                    <TouchableOpacity
                                                        style={[styles.itemBtn, isActive && styles.activeItemBtn]}
                                                        onPress={() => {
                                                            setSelectedId(item.id);
                                                            setIsMenuOpen(false);
                                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        }}
                                                    >
                                                        <Text style={[styles.itemText, isActive && styles.activeItemText]}>
                                                            {item.name}
                                                        </Text>
                                                        {isActive && <View style={styles.activeDot} />}
                                                    </TouchableOpacity>

                                                    {!item.isDefault && (
                                                        <TouchableOpacity
                                                            style={styles.deleteArea}
                                                            onPress={() => deleteCategory(item.id)}
                                                        >
                                                            <Ionicons name="close" size={14} color="#E5E7EB" />
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            );
                                        }}
                                        ListFooterComponent={
                                            isAdding ? (
                                                <View style={styles.addCategoryInputBox}>
                                                    <TextInput
                                                        style={styles.addInput}
                                                        placeholder="새 카테고리"
                                                        value={newCategoryName}
                                                        onChangeText={setNewCategoryName}
                                                        autoFocus
                                                        onSubmitEditing={addCategory}
                                                    />
                                                    <TouchableOpacity onPress={addCategory}>
                                                        <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                                                    </TouchableOpacity>
                                                </View>
                                            ) : (
                                                <TouchableOpacity style={styles.addCategoryBtn} onPress={() => setIsAdding(true)}>
                                                    <Ionicons name="add" size={16} color={COLORS.textMuted} />
                                                    <Text style={styles.addCategoryBtnText}>새 카테고리 추가</Text>
                                                </TouchableOpacity>
                                            )
                                        }
                                    />
                                </View>
                            </View>
                        </View>
                    </Pressable>
                </Modal>

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
                <StatusBar barStyle="dark-content" />
                <TouchableOpacity style={styles.runningTouchArea} onPress={nextQuestion} activeOpacity={1}>
                    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
                        <View style={styles.runningHeaderCompact}>
                            <View style={styles.runningTitleGroup}>
                                <Text style={styles.runningTitleLabel}>{selectedCategory.name}</Text>
                                <Text style={styles.runningMainTitle} numberOfLines={1}>{displayTitle}</Text>
                            </View>
                            <TouchableOpacity style={styles.runningCloseBtn} onPress={stopExamManual}>
                                <Ionicons name="close" size={24} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.runningCenter}>
                            <View style={styles.runningQBadge}>
                                <Text style={styles.runningQText}>{currentQuestion}</Text>
                                <Text style={styles.runningQTotal}>/ {totalQuestions}문항</Text>
                            </View>

                            <View style={styles.runningTimerSection}>
                                <View style={styles.lapTimerBox}>
                                    <Text style={styles.lapTimerLabel}>이 문제에서</Text>
                                    <Text style={styles.lapTimerValue}>{formatDigital(currentLapSec)}</Text>
                                </View>

                                <View style={styles.mainTimerBox}>
                                    <Text style={styles.mainTimerValue}>{formatDigitalFull(remainingSec)}</Text>
                                    <Text style={styles.mainTimerLabel}>남은 시간</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.runningFooterCompact}>
                            <View style={styles.tapIndicator}>
                                <Ionicons name="finger-print" size={24} color={COLORS.primary} style={{ marginBottom: 8 }} />
                                <Text style={styles.runningTapHint}>화면을 터치하여 다음 문항으로</Text>
                            </View>
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
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
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

                <View style={[styles.resultActions, { paddingBottom: (Platform.OS === 'ios' ? 40 : 24) + insets.bottom }]}>
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
    header: { marginTop: 40, marginBottom: 24 },
    headerSubtitle: { fontSize: 14, color: COLORS.textMuted, fontWeight: "600", marginBottom: 4 },
    headerTitle: { fontSize: 32, fontWeight: "900", color: COLORS.text, letterSpacing: -1 },

    // Category Selector
    trigger: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", marginBottom: 32 },
    triggerText: { fontSize: 22, fontWeight: "800", color: COLORS.text, letterSpacing: -0.8 },
    iconCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#E2E8F0", marginLeft: 8, alignItems: "center", justifyContent: "center" },

    menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 24 },
    menuContainer: { position: 'absolute', top: 180, left: 24 },
    menuShadow: { shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 8 },
    menu: { width: 210, backgroundColor: COLORS.surface, borderRadius: 20, padding: 8, borderWidth: 1, borderColor: COLORS.border },
    menuItem: { flexDirection: "row", alignItems: "center" },
    itemBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14 },
    activeItemBtn: { backgroundColor: COLORS.primaryLight },
    itemText: { fontSize: 15, fontWeight: "600", color: COLORS.textMuted },
    activeItemText: { color: COLORS.primary, fontWeight: "700" },
    activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary },
    deleteArea: { padding: 10 },

    addCategoryBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, marginTop: 4, borderTopWidth: 1, borderTopColor: COLORS.border },
    addCategoryBtnText: { fontSize: 14, color: COLORS.textMuted, marginLeft: 8, fontWeight: '600' },
    addCategoryInputBox: { flexDirection: 'row', alignItems: 'center', padding: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
    addInput: { flex: 1, height: 40, fontSize: 14, color: COLORS.text, fontWeight: '600' },

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

    // Running View (Refined Light Mode)
    runningOverlay: { flex: 1, backgroundColor: '#F1F5F9' },
    runningTouchArea: { flex: 1 },
    runningHeaderCompact: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 20 },
    runningTitleGroup: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    runningTitleLabel: { color: COLORS.primary, fontWeight: '800', fontSize: 12, marginRight: 12, backgroundColor: COLORS.primaryLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    runningMainTitle: { flex: 1, color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
    runningCloseBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, borderRadius: 20 },

    runningCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    runningQBadge: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 32 },
    runningQText: { fontSize: 110, fontWeight: '900', color: COLORS.text, letterSpacing: -4 },
    runningQTotal: { fontSize: 20, fontWeight: '700', color: COLORS.textMuted, marginLeft: 8 },

    runningTimerSection: { alignItems: 'center', width: '100%' },
    lapTimerBox: { alignItems: 'center', marginBottom: 32, backgroundColor: COLORS.surface, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    lapTimerLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '700', marginBottom: 4 },
    lapTimerValue: { fontSize: 36, fontWeight: '800', color: COLORS.primary, fontVariant: ['tabular-nums'] },

    mainTimerBox: { alignItems: 'center' },
    mainTimerValue: { fontSize: 48, fontWeight: '800', color: COLORS.text, fontVariant: ['tabular-nums'], opacity: 0.8 },
    mainTimerLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },

    runningFooterCompact: { alignItems: 'center', paddingBottom: 60 },
    tapIndicator: { alignItems: 'center' },
    runningTapHint: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },

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
