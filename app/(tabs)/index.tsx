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
    cardShadow: "rgba(0, 0, 0, 0.04)",
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

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");

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

    const startEditing = (category: Category) => {
        setEditingId(category.id);
        setEditingName(category.name);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const saveEdit = () => {
        if (!editingId || !editingName.trim()) {
            setEditingId(null);
            return;
        }
        const updated = categories.map(c =>
            c.id === editingId ? { ...c, name: editingName.trim() } : c
        );
        setCategories(updated);
        saveCategories(updated);
        setEditingId(null);
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
            <View style={styles.fixedHeader}>
                <Text style={styles.brand}>PaceTime</Text>
                <TouchableOpacity
                    style={styles.categoryTriggerSmall}
                    onPress={() => setIsMenuOpen(true)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.categoryTriggerTextSmall}>{selectedCategory.name}</Text>
                    <Ionicons name="chevron-down" size={14} color={COLORS.primary} />
                </TouchableOpacity>
            </View>
            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Welcome & Large Category Select */}
                <View style={styles.welcomeSection}>
                    <Text style={styles.welcomeTitle}>어떤 과목을{"\n"}준비하시나요?</Text>
                    <TouchableOpacity
                        style={styles.mainCategoryCard}
                        onPress={() => setIsMenuOpen(true)}
                        activeOpacity={0.8}
                    >
                        <View style={styles.mainCategoryIcon}>
                            <Ionicons name="book" size={20} color={COLORS.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.mainCategoryLabel}>현재 선택된 과목</Text>
                            <Text style={styles.mainCategoryText}>{selectedCategory.name}</Text>
                        </View>
                        <View style={styles.mainCategoryChevron}>
                            <Ionicons name="swap-vertical" size={16} color={COLORS.textMuted} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Category Menu Modal */}
                <Modal visible={isMenuOpen} transparent animationType="slide">
                    <Pressable style={styles.menuOverlay} onPress={() => {
                        setIsMenuOpen(false);
                        setIsAdding(false);
                        setEditingId(null);
                    }}>
                        <View style={styles.sheetContainer}>
                            <View style={[styles.sheetContent, { paddingBottom: insets.bottom + 20 }]}>
                                <View style={styles.sheetHeader}>
                                    <View style={styles.sheetHandle} />
                                    <View style={styles.sheetTitleRow}>
                                        <Text style={styles.sheetTitle}>과목 관리</Text>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setIsAdding(true);
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            }}
                                            style={styles.sheetHeaderAddBtn}
                                        >
                                            <Ionicons name="add" size={20} color={COLORS.primary} />
                                            <Text style={styles.sheetHeaderAddText}>추가</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {isAdding && (
                                    <View style={styles.addCategoryInline}>
                                        <TextInput
                                            style={styles.addInput}
                                            placeholder="새 과목 이름 입력"
                                            placeholderTextColor={COLORS.textMuted}
                                            value={newCategoryName}
                                            onChangeText={setNewCategoryName}
                                            autoFocus
                                            onSubmitEditing={addCategory}
                                        />
                                        <TouchableOpacity style={styles.addConfirmSmall} onPress={addCategory}>
                                            <Text style={styles.addConfirmSmallText}>저장</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => setIsAdding(false)} style={styles.addCancelSmall}>
                                            <Ionicons name="close" size={20} color={COLORS.textMuted} />
                                        </TouchableOpacity>
                                    </View>
                                )}

                                <FlatList
                                    data={categories}
                                    keyExtractor={(item) => item.id}
                                    keyboardShouldPersistTaps="handled"
                                    showsVerticalScrollIndicator={false}
                                    style={{ maxHeight: dropdownMaxHeight }}
                                    renderItem={({ item }) => {
                                        const isActive = item.id === selectedId;
                                        const isEditing = editingId === item.id;

                                        return (
                                            <View style={styles.categoryItemWrapper}>
                                                {isEditing ? (
                                                    <View style={styles.editingContainer}>
                                                        <TextInput
                                                            style={styles.editingInput}
                                                            value={editingName}
                                                            onChangeText={setEditingName}
                                                            autoFocus
                                                            onSubmitEditing={saveEdit}
                                                        />
                                                        <TouchableOpacity style={styles.editConfirmBtn} onPress={saveEdit}>
                                                            <Ionicons name="checkmark" size={20} color={COLORS.white} />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity onPress={() => setEditingId(null)} style={styles.editCancelBtn}>
                                                            <Ionicons name="close" size={20} color={COLORS.textMuted} />
                                                        </TouchableOpacity>
                                                    </View>
                                                ) : (
                                                    <View style={styles.categoryItemContent}>
                                                        <TouchableOpacity
                                                            style={[styles.categoryBtn, isActive && styles.activeCategoryBtn]}
                                                            onPress={() => {
                                                                setSelectedId(item.id);
                                                                setIsMenuOpen(false);
                                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                            }}
                                                        >
                                                            <View style={styles.categoryInfo}>
                                                                <Text style={[styles.categoryText, isActive && styles.activeCategoryText]}>
                                                                    {item.name}
                                                                </Text>
                                                                {item.isDefault && <View style={styles.defaultBadge}><Text style={styles.defaultBadgeText}>기본</Text></View>}
                                                            </View>
                                                            {isActive && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
                                                        </TouchableOpacity>

                                                        <View style={styles.categoryActions}>
                                                            <TouchableOpacity
                                                                style={styles.actionIconButton}
                                                                onPress={() => startEditing(item)}
                                                            >
                                                                <Ionicons name="pencil-outline" size={18} color={COLORS.textMuted} />
                                                            </TouchableOpacity>
                                                            {!item.isDefault && (
                                                                <TouchableOpacity
                                                                    style={styles.actionIconButton}
                                                                    onPress={() => deleteCategory(item.id)}
                                                                >
                                                                    <Ionicons name="trash-outline" size={18} color={COLORS.accent} />
                                                                </TouchableOpacity>
                                                            )}
                                                        </View>
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    }}
                                />
                            </View>
                        </View>
                    </Pressable>
                </Modal>

                {/* Title Input */}
                <View style={styles.setupCard}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="create-outline" size={16} color={COLORS.primary} />
                        <Text style={styles.cardLabel}>시험 제목</Text>
                    </View>
                    <TextInput
                        style={styles.titleInput}
                        placeholder={`예: 2026년 ${selectedCategory.name} 자학`}
                        placeholderTextColor={COLORS.textMuted}
                        value={title}
                        onChangeText={setTitle}
                    />
                </View>

                {/* Question Count Setting */}
                <View style={styles.setupCard}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="list" size={16} color={COLORS.primary} />
                        <Text style={styles.cardLabel}>문항 수</Text>
                    </View>

                    <View style={styles.stepperContainer}>
                        <TouchableOpacity
                            style={styles.stepperButton}
                            onPress={() => adjustValue(setTotalQuestions, totalQuestions, -1)}
                        >
                            <Ionicons name="remove" size={24} color={COLORS.text} />
                        </TouchableOpacity>

                        <View style={styles.valueContainer}>
                            <TextInput
                                style={styles.valueInput}
                                keyboardType="number-pad"
                                value={totalQuestions}
                                onChangeText={setTotalQuestions}
                                selectTextOnFocus
                            />
                            <Text style={styles.unitText}>문항</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.stepperButton}
                            onPress={() => adjustValue(setTotalQuestions, totalQuestions, 1)}
                        >
                            <Ionicons name="add" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.chipRow}>
                        {["20", "25", "40"].map((val) => (
                            <TouchableOpacity
                                key={val}
                                style={[styles.chip, totalQuestions === val && styles.activeChip]}
                                onPress={() => {
                                    setTotalQuestions(val);
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }}
                            >
                                <Text style={[styles.chipText, totalQuestions === val && styles.activeChipText]}>
                                    {val}문항
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Target Time Setting */}
                <View style={styles.setupCard}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                        <Text style={styles.cardLabel}>목표 시간</Text>
                    </View>

                    <View style={styles.stepperContainer}>
                        <TouchableOpacity
                            style={styles.stepperButton}
                            onPress={() => adjustValue(setTargetMinutes, targetMinutes, -5)}
                        >
                            <Ionicons name="remove" size={24} color={COLORS.text} />
                        </TouchableOpacity>

                        <View style={styles.valueContainer}>
                            <TextInput
                                style={styles.valueInput}
                                keyboardType="number-pad"
                                value={targetMinutes}
                                onChangeText={setTargetMinutes}
                                selectTextOnFocus
                            />
                            <Text style={styles.unitText}>분</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.stepperButton}
                            onPress={() => adjustValue(setTargetMinutes, targetMinutes, 5)}
                        >
                            <Ionicons name="add" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.chipRow}>
                        {["60", "70", "90"].map((val) => (
                            <TouchableOpacity
                                key={val}
                                style={[styles.chip, targetMinutes === val && styles.activeChip]}
                                onPress={() => {
                                    setTargetMinutes(val);
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }}
                            >
                                <Text style={[styles.chipText, targetMinutes === val && styles.activeChipText]}>
                                    {val}분
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Pace Hint */}
                {expectedPace && (
                    <View style={styles.paceBanner}>
                        <View style={styles.paceIconBg}>
                            <Ionicons name="flash" size={14} color={COLORS.white} />
                        </View>
                        <Text style={styles.paceText}>
                            예상 페이스: <Text style={styles.paceValue}>{expectedPace}</Text>
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
                            <View style={styles.runningProgressContainer}>
                                <View style={[styles.runningProgressBar, { width: `${(currentQuestion / parseInt(totalQuestions)) * 100}%` }]} />
                            </View>

                            <View style={styles.runningQBadge}>
                                <Text style={styles.runningQText}>{currentQuestion}</Text>
                                <Text style={styles.runningQTotal}>/ {totalQuestions}문항</Text>
                            </View>

                            <View style={styles.runningTimerSection}>
                                <View style={styles.lapTimerBox}>
                                    <View style={styles.runningStatusDot} />
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
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 10 }}>
                            <View style={[styles.summaryBox, { backgroundColor: COLORS.primaryLight }]}>
                                <Ionicons name="time" size={18} color={COLORS.primary} style={styles.summaryIcon} />
                                <Text style={styles.summaryBoxLabel}>총 소요 시간</Text>
                                <Text style={styles.summaryBoxVal}>{formatTime(totalSeconds)}</Text>
                            </View>
                            <View style={[styles.summaryBox, { backgroundColor: '#ECFDF5' }]}>
                                <Ionicons name="flash" size={18} color={COLORS.success} style={styles.summaryIcon} />
                                <Text style={styles.summaryBoxLabel}>평균 페이스</Text>
                                <Text style={styles.summaryBoxVal}>
                                    {laps.length > 0 ? formatTime(Math.floor(totalSeconds / laps.length)) : "0초"}
                                </Text>
                            </View>
                            {analysis && (
                                <View style={[styles.summaryBox, { backgroundColor: '#FDF2F8' }]}>
                                    <Ionicons name="checkmark-circle" size={18} color="#BE185D" style={styles.summaryIcon} />
                                    <Text style={styles.summaryBoxLabel}>목표 시간 내</Text>
                                    <Text style={styles.summaryBoxVal}>{analysis.efficientLaps}개 문항</Text>
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
    fixedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 16,
        backgroundColor: COLORS.bg,
    },
    brand: {
        fontSize: 26,
        fontWeight: '900',
        color: COLORS.text,
        letterSpacing: -1.2,
    },
    categoryTriggerSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    categoryTriggerTextSmall: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.primary,
        marginRight: 4,
    },
    welcomeSection: {
        marginBottom: 32,
    },
    welcomeTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: COLORS.text,
        lineHeight: 34,
        letterSpacing: -0.5,
        marginBottom: 20,
    },
    mainCategoryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
    },
    mainCategoryIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    mainCategoryLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textMuted,
        marginBottom: 2,
    },
    mainCategoryText: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
    },
    mainCategoryChevron: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },

    menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheetContainer: { backgroundColor: 'transparent' },
    sheetContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 12 },
    sheetHeader: { alignItems: 'center', marginBottom: 20 },
    sheetHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, marginBottom: 12 },
    sheetTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
    sheetTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
    sheetHeaderAddBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    sheetHeaderAddText: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginLeft: 2 },

    addCategoryInline: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryLight, padding: 12, borderRadius: 20, marginBottom: 16 },
    addInput: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.text, paddingHorizontal: 12 },
    addConfirmSmall: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    addConfirmSmallText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
    addCancelSmall: { marginLeft: 8 },

    categoryItemWrapper: { marginBottom: 10 },
    categoryItemContent: { flexDirection: 'row', alignItems: 'center' },
    categoryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderRadius: 24, backgroundColor: COLORS.bg },
    activeCategoryBtn: { backgroundColor: COLORS.primaryLight, borderWidth: 1.5, borderColor: COLORS.primary },
    categoryInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    categoryText: { fontSize: 16, fontWeight: '700', color: COLORS.text },
    activeCategoryText: { color: COLORS.primary, fontWeight: '800' },
    defaultBadge: { backgroundColor: COLORS.border, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
    defaultBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },

    categoryActions: { flexDirection: 'row', marginLeft: 8 },
    actionIconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg, marginLeft: 4 },

    editingContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: COLORS.primaryLight, borderRadius: 24 },
    editingInput: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.text, paddingHorizontal: 12 },
    editConfirmBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
    editCancelBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

    // Setup Phase Cards
    setupCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 32,
        padding: 24,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.textMuted,
        marginLeft: 6,
        letterSpacing: -0.2,
    },
    titleInput: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.text,
        paddingVertical: 4,
    },
    stepperContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    stepperButton: {
        width: 56,
        height: 56,
        borderRadius: 20,
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    valueContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    valueInput: {
        fontSize: 48,
        fontWeight: '900',
        color: COLORS.text,
        textAlign: 'center',
        minWidth: 90,
        letterSpacing: -1.5,
    },
    unitText: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textMuted,
        marginLeft: 4,
    },
    chipRow: {
        flexDirection: 'row',
        gap: 10,
    },
    chip: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 16,
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    activeChip: {
        backgroundColor: COLORS.primaryLight,
        borderColor: COLORS.primary,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    activeChipText: {
        color: COLORS.primary,
        fontWeight: '800',
    },
    paceBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: "#F1F5F9",
        padding: 18,
        borderRadius: 24,
        marginBottom: 32,
    },
    paceIconBg: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    paceText: {
        fontSize: 15,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    paceValue: {
        color: COLORS.text,
        fontWeight: '900',
    },

    primaryActionBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 22,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    primaryActionText: { color: COLORS.white, fontSize: 18, fontWeight: "900" },

    // Running View (Refined Light Mode)
    runningOverlay: { flex: 1, backgroundColor: '#F1F5F9' },
    runningTouchArea: { flex: 1 },
    runningHeaderCompact: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 20 },
    runningTitleGroup: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    runningTitleLabel: { color: COLORS.primary, fontWeight: '800', fontSize: 12, marginRight: 12, backgroundColor: COLORS.primaryLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    runningMainTitle: { flex: 1, color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
    runningCloseBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, borderRadius: 20 },

    runningCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    runningProgressContainer: { width: '100%', height: 6, backgroundColor: COLORS.border, borderRadius: 3, marginBottom: 40, overflow: 'hidden' },
    runningProgressBar: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
    runningQBadge: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 20 },
    runningQText: { fontSize: 124, fontWeight: '900', color: COLORS.text, letterSpacing: -6 },
    runningQTotal: { fontSize: 24, fontWeight: '700', color: COLORS.textMuted, marginLeft: 8 },

    runningTimerSection: { alignItems: 'center', width: '100%' },
    lapTimerBox: { alignItems: 'center', marginBottom: 32, backgroundColor: COLORS.surface, paddingHorizontal: 32, paddingVertical: 20, borderRadius: 32, shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6 },
    runningStatusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary, marginBottom: 12 },
    lapTimerLabel: { fontSize: 15, color: COLORS.textMuted, fontWeight: '700', marginBottom: 8 },
    lapTimerValue: { fontSize: 52, fontWeight: '900', color: COLORS.primary, fontVariant: ['tabular-nums'], letterSpacing: -1 },

    mainTimerBox: { alignItems: 'center' },
    mainTimerValue: { fontSize: 64, fontWeight: '900', color: COLORS.text, fontVariant: ['tabular-nums'], opacity: 0.9, letterSpacing: -1 },
    mainTimerLabel: { fontSize: 14, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2, marginTop: 8 },

    runningFooterCompact: { alignItems: 'center', paddingBottom: 60 },
    tapIndicator: { alignItems: 'center' },
    runningTapHint: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600', marginTop: 12 },

    // Result View
    resultOverlay: { flex: 1, backgroundColor: COLORS.bg },
    resultTop: { padding: 24, paddingTop: 40 },
    resultTitleMain: { fontSize: 32, fontWeight: '900', color: COLORS.text },
    resultSubtitleMain: { fontSize: 16, color: COLORS.textMuted, marginTop: 4 },
    summaryScrollBox: { marginBottom: 32 },
    summaryBox: { width: 160, height: 120, borderRadius: 28, padding: 20, marginRight: 16, justifyContent: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
    summaryIcon: { marginBottom: 12 },
    summaryBoxLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '700', marginBottom: 6 },
    summaryBoxVal: { fontSize: 19, color: COLORS.text, fontWeight: '800' },
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
