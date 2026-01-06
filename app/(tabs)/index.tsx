import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    AppState,
    AppStateStatus,
    Dimensions,
    FlatList,
    KeyboardAvoidingView,
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
import AppHeader from '../../components/AppHeader';
import SessionDetail from '../../components/SessionDetail';
import { Category, DEFAULT_CATEGORIES, ExamSession, LapRecord, getCategories, saveCategories, saveSession } from "../../lib/storage";
import { COLORS } from '../../lib/theme';

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

export default function ExamScreen() {
    // --- Setup State ---
    const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
    const [selectedId, setSelectedId] = useState<string>("lang");
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newCategoryQ, setNewCategoryQ] = useState("40");
    const [newCategoryT, setNewCategoryT] = useState("90");
    const insets = useSafeAreaInsets();
    const titleInputRef = useRef<TextInput>(null);

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
    const [completedSession, setCompletedSession] = useState<ExamSession | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");
    const [editingQ, setEditingQ] = useState("");
    const [editingT, setEditingT] = useState("");

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const appState = useRef<AppStateStatus>(AppState.currentState);
    const lastTickRef = useRef<number | null>(null);

    // --- Logic ---
    const toPositiveNumber = (value: string, fallback: number) => {
        const num = parseInt(value, 10);
        if (Number.isNaN(num) || num <= 0) return fallback;
        return num;
    };

    const expectedPace = useMemo(() => {
        const q = toPositiveNumber(totalQuestions, 0);
        const t = toPositiveNumber(targetMinutes, 0);
        if (q <= 0 || t <= 0) return null;

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

    const clearTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const startTimer = () => {
        clearTimer();
        lastTickRef.current = Date.now();
        timerRef.current = setInterval(() => {
            setTotalSeconds((prev) => {
                lastTickRef.current = Date.now();
                return prev + 1;
            });
        }, 1000);
    };

    const startExam = () => {
        const qCount = toPositiveNumber(totalQuestions, 0);
        const targetMins = toPositiveNumber(targetMinutes, 0);
        if (qCount <= 0 || targetMins <= 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("알림", "올바른 문항 수와 목표 시간을 입력해주세요.");
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        setLaps([]);
        setCurrentQuestion(1);
        setTotalSeconds(0);
        setLastLapTime(0);
        setCompletedSession(null);
        setViewMode("running");

        startTimer();
    };

    const nextQuestion = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const qCount = toPositiveNumber(totalQuestions, 0);
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
        const safeQ = toPositiveNumber(newCategoryQ, 40).toString();
        const safeT = toPositiveNumber(newCategoryT, 90).toString();
        const newCat: Category = {
            id: Date.now().toString(),
            name: newCategoryName.trim(),
            defaultQuestions: safeQ,
            defaultMinutes: safeT,
            isDefault: false
        };
        const updated = [...categories, newCat];
        setCategories(updated);
        saveCategories(updated);
        setNewCategoryName("");
        setNewCategoryQ("40");
        setNewCategoryT("90");
        setIsAdding(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const startEditing = (category: Category) => {
        setEditingId(category.id);
        setEditingName(category.name);
        setEditingQ(category.defaultQuestions || "40");
        setEditingT(category.defaultMinutes || "90");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const saveEdit = () => {
        if (!editingId || !editingName.trim()) {
            setEditingId(null);
            return;
        }
        const safeQ = toPositiveNumber(editingQ || "0", 40).toString();
        const safeT = toPositiveNumber(editingT || "0", 90).toString();
        const updated = categories.map(c =>
            c.id === editingId ? { ...c, name: editingName.trim(), defaultQuestions: safeQ, defaultMinutes: safeT } : c
        );
        setCategories(updated);
        saveCategories(updated);
        setEditingId(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const deleteCategory = (id: string) => {
        const cat = categories.find(c => c.id === id);
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
        clearTimer();
        const finalTitle = title.trim() || buildFallbackTitle(selectedCategory.name);
        const safeTargetSeconds = toPositiveNumber(targetMinutes, 0) * 60;
        const session: ExamSession = {
            id: Date.now().toString(),
            title: finalTitle,
            categoryName: selectedCategory.name,
            categoryId: selectedCategory.id,
            date: new Date().toISOString(),
            totalQuestions: finalLaps.length,
            totalSeconds: totalSeconds,
            targetSeconds: safeTargetSeconds,
            laps: finalLaps,
        };
        await saveSession(session);
        setCompletedSession(session);
        setLaps(finalLaps);
        setViewMode("result");
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
            const initial = saved.find((c) => c.id === selectedId) || saved[0] || DEFAULT_CATEGORIES[0];
            setSelectedId(initial.id);
            setTotalQuestions(toPositiveNumber(initial.defaultQuestions || "40", 40).toString());
            setTargetMinutes(toPositiveNumber(initial.defaultMinutes || "90", 90).toString());
        };
        load();
    }, []);

    useEffect(() => {
        if (viewMode !== 'running') {
            clearTimer();
        }
    }, [viewMode]);

    useEffect(() => {
        return () => {
            clearTimer();
        };
    }, []);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextState) => {
            const wasInBackground = appState.current === 'background' || appState.current === 'inactive';
            const goingInactive = nextState === 'background' || nextState === 'inactive';

            if (wasInBackground && nextState === 'active') {
                if (viewMode === 'running' && lastTickRef.current) {
                    const delta = Math.floor((Date.now() - lastTickRef.current) / 1000);
                    if (delta > 0) {
                        setTotalSeconds((prev) => prev + delta);
                        setLastLapTime((prev) => prev + delta);
                    }
                    startTimer();
                }
            } else if (goingInactive) {
                lastTickRef.current = Date.now();
                clearTimer();
            }
            appState.current = nextState;
        });

        return () => subscription.remove();
    }, [viewMode]);

    // --- Views ---

    const renderSetup = () => (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <StatusBar barStyle="dark-content" />
            <AppHeader />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <View style={[styles.mainContainer, { paddingBottom: Math.max(20, insets.bottom) }]}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
                    >
                        <Text style={styles.sectionLabel}>기본 정보</Text>

                        <View style={styles.flatCard}>
                            <Text style={styles.cardLabel}>연습 과목</Text>
                            <TouchableOpacity
                                style={styles.inputRow}
                                onPress={() => setIsMenuOpen(true)}
                                activeOpacity={0.6}
                            >
                                <Text style={styles.mainValue}>{selectedCategory.name}</Text>
                                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.flatCard}>
                            <Text style={styles.cardLabel}>시험 제목</Text>
                            <TextInput
                                ref={titleInputRef}
                                style={styles.textInputMain}
                                placeholder={`${selectedCategory.name} 연습`}
                                placeholderTextColor={COLORS.textMuted}
                                value={title}
                                onChangeText={setTitle}
                                returnKeyType="done"
                            />
                        </View>

                        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>상세 설정</Text>

                        <View style={styles.flatCard}>
                            <View style={styles.stepperRow}>
                                <View>
                                    <Text style={styles.cardLabel}>문항 수</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                        <TextInput
                                            style={styles.stepperValue}
                                            keyboardType="number-pad"
                                            value={totalQuestions}
                                            onChangeText={setTotalQuestions}
                                            selectTextOnFocus
                                            editable={false} // Use edit mode in menu for defaults, or just buttons here?
                                        // Actually let's keep it editable but simpler
                                        />
                                        <Text style={styles.unitText}>문항</Text>
                                    </View>
                                </View>
                                <View style={styles.stepperControls}>
                                    <TouchableOpacity onPress={() => adjustValue(setTotalQuestions, totalQuestions, -1)} style={styles.stepperBtn}>
                                        <Ionicons name="remove" size={20} color={COLORS.text} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => adjustValue(setTotalQuestions, totalQuestions, 1)} style={styles.stepperBtn}>
                                        <Ionicons name="add" size={20} color={COLORS.text} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        <View style={styles.flatCard}>
                            <View style={styles.stepperRow}>
                                <View>
                                    <Text style={styles.cardLabel}>목표 시간</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                        <TextInput
                                            style={styles.stepperValue}
                                            keyboardType="number-pad"
                                            value={targetMinutes}
                                            onChangeText={setTargetMinutes}
                                            selectTextOnFocus
                                            editable={false}
                                        />
                                        <Text style={styles.unitText}>분</Text>
                                    </View>
                                </View>
                                <View style={styles.stepperControls}>
                                    <TouchableOpacity onPress={() => adjustValue(setTargetMinutes, targetMinutes, -5)} style={styles.stepperBtn}>
                                        <Ionicons name="remove" size={20} color={COLORS.text} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => adjustValue(setTargetMinutes, targetMinutes, 5)} style={styles.stepperBtn}>
                                        <Ionicons name="add" size={20} color={COLORS.text} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {expectedPace && (
                            <View style={styles.paceContainer}>
                                <Text style={styles.paceLabel}>예상 페이스</Text>
                                <Text style={styles.paceValue}>{expectedPace} / 문항</Text>
                            </View>
                        )}
                    </ScrollView>

                    <View style={[styles.bottomAction, { bottom: Math.max(20, insets.bottom + 12) }]}>
                        <TouchableOpacity style={styles.primaryActionBtn} onPress={startExam} activeOpacity={0.8}>
                            <Text style={styles.primaryActionText}>기록 시작하기</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* Category Menu Modal */}
            <Modal visible={isMenuOpen} transparent animationType="fade">
                <Pressable style={styles.menuOverlay} onPress={() => { setIsMenuOpen(false); setIsAdding(false); setEditingId(null); }}>
                    <View style={styles.sheetContainer}>
                        <View style={[styles.sheetContent, { paddingBottom: insets.bottom + 24 }]}>
                            <View style={styles.sheetHeader}>
                                <Text style={styles.sheetTitle}>과목 관리</Text>
                                {!isAdding && !editingId && (
                                    <TouchableOpacity onPress={() => setIsAdding(true)}>
                                        <Ionicons name="add-circle" size={28} color={COLORS.primary} />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {(isAdding || editingId) && (
                                <View style={styles.categoryForm}>
                                    <View style={styles.formRow}>
                                        <Text style={styles.formLabel}>과목명</Text>
                                        <TextInput
                                            style={styles.formInput}
                                            value={isAdding ? newCategoryName : editingName}
                                            onChangeText={isAdding ? setNewCategoryName : setEditingName}
                                            placeholder="예: 언어논리"
                                            autoFocus
                                        />
                                    </View>
                                    <View style={styles.formGrid}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.formLabel}>문항수</Text>
                                            <TextInput
                                                style={styles.formInput}
                                                value={isAdding ? newCategoryQ : editingQ}
                                                onChangeText={isAdding ? setNewCategoryQ : setEditingQ}
                                                keyboardType="number-pad"
                                            />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={styles.formLabel}>시간(분)</Text>
                                            <TextInput
                                                style={styles.formInput}
                                                value={isAdding ? newCategoryT : editingT}
                                                onChangeText={isAdding ? setNewCategoryT : setEditingT}
                                                keyboardType="number-pad"
                                            />
                                        </View>
                                    </View>
                                    <View style={styles.formActions}>
                                        <TouchableOpacity onPress={() => { setIsAdding(false); setEditingId(null); }} style={styles.formCancelBtn}>
                                            <Text style={styles.formBtnTextMuted}>취소</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={isAdding ? addCategory : saveEdit} style={styles.formSaveBtn}>
                                            <Text style={styles.formBtnTextWhite}>저장</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {!isAdding && !editingId && (
                                <FlatList
                                    data={categories}
                                    keyExtractor={(item) => item.id}
                                    renderItem={({ item }) => {
                                        const isActive = item.id === selectedId;
                                        return (
                                            <TouchableOpacity
                                                style={[styles.categorySimpleItem, isActive && styles.categorySimpleItemActive]}
                                                onPress={() => {
                                                    setSelectedId(item.id);
                                                    setTotalQuestions(toPositiveNumber(item.defaultQuestions || "40", 40).toString());
                                                    setTargetMinutes(toPositiveNumber(item.defaultMinutes || "90", 90).toString());
                                                    setIsMenuOpen(false);
                                                }}
                                            >
                                                <View>
                                                    <Text style={[styles.categoryName, isActive && styles.categoryNameActive]}>{item.name}</Text>
                                                    <Text style={styles.categoryMeta}>{item.defaultQuestions || "40"}문항 / {item.defaultMinutes || "90"}분</Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                                    <TouchableOpacity onPress={() => startEditing(item)} style={{ padding: 4 }}>
                                                        <Ionicons name="create-outline" size={20} color={COLORS.textMuted} />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity onPress={() => deleteCategory(item.id)} style={{ padding: 4 }}>
                                                        <Ionicons name="trash-outline" size={20} color={COLORS.accent} />
                                                    </TouchableOpacity>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    }}
                                />
                            )}
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );

    const renderRunning = () => {
        const displayTitle = title.trim() || buildFallbackTitle(selectedCategory.name);
        const targetSec = toPositiveNumber(targetMinutes, 0) * 60;
        const remainingSec = Math.max(0, targetSec - totalSeconds);
        const currentLapSec = totalSeconds - lastLapTime;
        const totalQCount = Math.max(1, toPositiveNumber(totalQuestions, 1));
        const progress = Math.min((currentQuestion / totalQCount) * 100, 100);

        return (
            <View style={styles.runningOverlay}>
                <StatusBar barStyle="dark-content" />
                <TouchableOpacity style={styles.runningTouchArea} onPress={nextQuestion} activeOpacity={1}>
                    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
                        <View style={styles.runningHeader}>
                            <Text style={styles.runningTitleLabel}>{selectedCategory.name}</Text>
                            <TouchableOpacity onPress={stopExamManual} style={styles.closeIcon}>
                                <Ionicons name="close" size={24} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.runningCenter}>
                            <View style={styles.runningProgressBg}>
                                <View style={[styles.runningProgressBar, { width: `${progress}%` }]} />
                            </View>
                            <Text style={styles.runningQText}>Q{currentQuestion}</Text>

                            <View style={styles.timerDisplay}>
                                <Text style={styles.lapTimerBig}>{formatDigital(currentLapSec)}</Text>
                                <Text style={styles.totalTimerSmall}>남은 시간 {formatDigitalFull(remainingSec)}</Text>
                            </View>
                        </View>

                        <Text style={styles.tapHint}>터치하여 다음 문제</Text>
                    </SafeAreaView>
                </TouchableOpacity>
            </View>
        );
    };

    const renderResult = () => (
        <View style={styles.resultOverlay}>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
                <View style={styles.resultHeader}>
                    <Text style={styles.resultTitle}>기록 완료</Text>
                    <Text style={styles.resultDate}>{completedSession ? new Date(completedSession.date).toLocaleDateString() : ""}</Text>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 140 + insets.bottom }}
                >
                    {completedSession ? (
                        <SessionDetail session={completedSession} showDate={false} />
                    ) : (
                        <View style={styles.emptyResult}>
                            <Text style={styles.emptyResultText}>기록 정보를 불러오지 못했어요.</Text>
                        </View>
                    )}
                </ScrollView>

                <View style={[styles.bottomFixed, { paddingBottom: 24 + insets.bottom }]}>
                    <TouchableOpacity style={styles.primaryActionBtn} onPress={() => setViewMode("setup")}>
                        <Text style={styles.primaryActionText}>메인으로</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );

    return (
        <View style={{ flex: 1 }}>
            {renderSetup()}
            <Modal visible={viewMode === 'running'} animationType="fade">
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
    mainContainer: {
        flex: 1,
        paddingHorizontal: 24,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textMuted,
        marginBottom: 10,
        marginTop: 20,
        marginLeft: 2,
    },
    flatCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        padding: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textMuted,
        marginBottom: 4,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    mainValue: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    textInputMain: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        padding: 0,
    },
    stepperRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    stepperValue: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.text,
        marginRight: 4,
    },
    unitText: {
        fontSize: 14,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    stepperControls: {
        flexDirection: 'row',
        gap: 12,
    },
    stepperBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    paceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        opacity: 0.8,
    },
    paceLabel: { fontSize: 13, color: COLORS.textMuted, marginRight: 6 },
    paceValue: { fontSize: 13, color: COLORS.point, fontWeight: '700' },

    bottomAction: {
        position: 'absolute',
        bottom: 20,
        left: 24,
        right: 24,
    },
    primaryActionBtn: {
        backgroundColor: COLORS.point,
        paddingVertical: 18,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
    },
    primaryActionText: { color: COLORS.white, fontSize: 16, fontWeight: "900" },

    // Menu / Modal
    menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheetContainer: { backgroundColor: COLORS.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '80%' },
    sheetContent: { padding: 24 },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    sheetTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },

    categorySimpleItem: {
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    categorySimpleItemActive: { opacity: 1 },
    categoryName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
    categoryNameActive: { color: COLORS.primary },
    categoryMeta: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },

    // Form
    categoryForm: { backgroundColor: COLORS.bg, borderRadius: 16, padding: 16, marginBottom: 16 },
    formRow: { marginBottom: 12 },
    formGrid: { flexDirection: 'row', marginBottom: 16 },
    formLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '700', marginBottom: 6 },
    formInput: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, fontSize: 15, fontWeight: '600' },
    formActions: { flexDirection: 'row', gap: 10 },
    formCancelBtn: { flex: 1, padding: 14, alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
    formSaveBtn: { flex: 2, padding: 14, alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: 16 },
    formBtnTextMuted: { fontWeight: '700', color: COLORS.text },
    formBtnTextWhite: { fontWeight: '800', color: COLORS.white },

    // Running
    runningOverlay: { flex: 1, backgroundColor: COLORS.bg },
    runningTouchArea: { flex: 1 },
    runningHeader: { flexDirection: 'row', padding: 24, justifyContent: 'space-between', alignItems: 'flex-start' },
    runningTitleLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted },
    closeIcon: { padding: 8, backgroundColor: COLORS.surface, borderRadius: 20 },
    runningCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    runningProgressBg: { width: '100%', height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden', marginBottom: 32 },
    runningProgressBar: { height: '100%', backgroundColor: COLORS.point },
    runningQText: { fontSize: 56, fontWeight: '900', color: COLORS.text, marginBottom: 8 },
    timerDisplay: { alignItems: 'center' },
    lapTimerBig: { fontSize: 72, fontWeight: '900', color: COLORS.point, fontVariant: ['tabular-nums'], letterSpacing: -2 },
    totalTimerSmall: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted, marginTop: 12 },
    tapHint: { textAlign: 'center', paddingBottom: 60, color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },

    // Result
    resultOverlay: { flex: 1, backgroundColor: COLORS.bg },
    resultHeader: { padding: 24, paddingBottom: 12 },
    resultTitle: { fontSize: 28, fontWeight: '900', color: COLORS.text },
    resultDate: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
    emptyResult: { backgroundColor: COLORS.surface, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
    emptyResultText: { color: COLORS.textMuted, fontWeight: '700' },
    bottomFixed: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, backgroundColor: COLORS.bg },
});
