import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
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
import { Category, DEFAULT_CATEGORIES, getCategories, saveCategories } from "../../lib/storage";

const THEME_GREEN = {
    point: '#00D094',      // 메인 민트 그린
    pointLight: '#E6F9F4', // 연한 배경
    textMain: '#1C1C1E',
    textMuted: '#8E8E93',
    bg: '#F8F9FA',
    border: '#F2F2F7',
    accent: '#FF3B30', // ✅ 초과(경고) 색상
};

const buildFallbackTitle = (categoryName: string) => {
    const now = new Date();
    return `${now.getMonth() + 1}월 ${now.getDate()}일 ${categoryName} 연습`;
};

export default function ExamScreen() {
    const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
    const [selectedId, setSelectedId] = useState<string>("lang");
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // 과목 관리 모드 및 폼 상태
    const [menuMode, setMenuMode] = useState<"select" | "add" | "edit">("select");
    const [formName, setFormName] = useState("");
    const [targetCatId, setTargetCatId] = useState("");

    const [title, setTitle] = useState("");
    const [totalQuestions, setTotalQuestions] = useState("40");
    const [targetMinutes, setTargetMinutes] = useState("90");

    const insets = useSafeAreaInsets();

    const selectedCategory = useMemo(() =>
        categories.find((c) => c.id === selectedId) || categories[0]
        , [categories, selectedId]);

    // 초기 데이터 로드
    useEffect(() => {
        const init = async () => {
            const saved = await getCategories();
            setCategories(saved);
            const first = saved.find(c => c.id === selectedId) || saved[0];
            setSelectedId(first.id);
            setTotalQuestions(first.defaultQuestions ?? "40");
            setTargetMinutes(first.defaultMinutes ?? "90");
        };
        init();
    }, []);

    // --- 유틸리티 및 로직 ---
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

    const adjustTargetMinutes = (direction: 1 | -1) => {
        const current = toPositiveNumber(targetMinutes, 90);
        let next = current;

        if (direction > 0) {
            if (current < 10) {
                next = Math.min(10, current + 1);
            } else {
                next = current + 5;
            }
        } else {
            if (current <= 10) {
                next = current - 1;
            } else {
                next = Math.max(10, current - 5);
            }
        }

        next = Math.max(1, next);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTargetMinutes(next.toString());
    };

    // 과목 관리 로직
    const saveCategory = async () => {
        if (!formName.trim()) return;
        let updated: Category[];
        if (menuMode === "add") {
            const newCat = { id: Date.now().toString(), name: formName, defaultQuestions: "40", defaultMinutes: "90", isDefault: false };
            updated = [...categories, newCat];
        } else {
            updated = categories.map(c => c.id === targetCatId ? { ...c, name: formName } : c);
        }
        setCategories(updated);
        await saveCategories(updated);
        setMenuMode("select");
    };

    const handleDeleteCategory = (id: string) => {
        Alert.alert("과목 삭제", "이 과목을 리스트에서 삭제할까요?", [
            { text: "취소", style: "cancel" },
            {
                text: "삭제", style: "destructive", onPress: async () => {
                    const updated = categories.filter(c => c.id !== id);
                    setCategories(updated);
                    await saveCategories(updated);
                    if (selectedId === id) setSelectedId(updated[0].id);
                }
            }
        ]);
    };

    const startExam = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push({
            pathname: "/focus/exam",
            params: {
                categoryId: selectedCategory.id,
                categoryName: selectedCategory.name,
                totalQuestions,
                targetMinutes,
                title: title.trim(),
            },
        });
    };

    // --- Render Parts ---

    const renderSetup = () => (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <AppHeader />
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.label}>연습 과목</Text>
                <TouchableOpacity style={styles.card} onPress={() => { setMenuMode("select"); setIsMenuOpen(true); }}>
                    <View style={styles.row}>
                        <View style={styles.dot} />
                        <Text style={styles.cardText}>{selectedCategory.name}</Text>
                    </View>
                    <Ionicons name="settings-outline" size={18} color={THEME_GREEN.textMuted} />
                </TouchableOpacity>

                <Text style={styles.label}>연습 제목</Text>
                <View style={styles.card}>
                    <TextInput style={styles.input} placeholder={buildFallbackTitle(selectedCategory.name)} value={title} onChangeText={setTitle} placeholderTextColor={THEME_GREEN.textMuted} />
                </View>

                <View style={styles.grid}>
                    <View style={styles.halfCard}>
                        <Text style={styles.smallLabel}>문항 수</Text>
                        <Text style={styles.value}>{totalQuestions}<Text style={styles.unit}>문항</Text></Text>
                        <View style={styles.stepper}>
                            <TouchableOpacity onPress={() => adjustValue(setTotalQuestions, totalQuestions, -1)} style={styles.stepBtn}><Ionicons name="remove" size={18} /></TouchableOpacity>
                            <TouchableOpacity onPress={() => adjustValue(setTotalQuestions, totalQuestions, 1)} style={styles.stepBtn}><Ionicons name="add" size={18} /></TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.halfCard}>
                        <Text style={styles.smallLabel}>목표 시간</Text>
                        <Text style={styles.value}>{targetMinutes}<Text style={styles.unit}>분</Text></Text>
                        <View style={styles.stepper}>
                            <TouchableOpacity onPress={() => adjustTargetMinutes(-1)} style={styles.stepBtn}><Ionicons name="remove" size={18} /></TouchableOpacity>
                            <TouchableOpacity onPress={() => adjustTargetMinutes(1)} style={styles.stepBtn}><Ionicons name="add" size={18} /></TouchableOpacity>
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
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity style={styles.mainBtn} onPress={startExam}><Text style={styles.mainBtnText}>집중 시작하기</Text></TouchableOpacity>
            </View>

            {/* 과목 관리 모달 (바깥쪽 터치 종료 지원) */}
            <Modal visible={isMenuOpen} transparent animationType="fade">
                <Pressable style={styles.overlay} onPress={() => { setIsMenuOpen(false); setMenuMode("select"); }}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', justifyContent: 'flex-end' }}>
                        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                            <View style={styles.sheetHeader}>
                                <Text style={styles.sheetTitle}>{menuMode === "select" ? "과목 선택" : menuMode === "add" ? "과목 추가" : "과목 수정"}</Text>
                                {menuMode === "select" && <TouchableOpacity onPress={() => { setFormName(""); setMenuMode("add"); }}><Ionicons name="add" size={28} color={THEME_GREEN.textMain} /></TouchableOpacity>}
                            </View>

                            {menuMode === "select" ? (
                                <FlatList
                                    data={categories}
                                    keyExtractor={item => item.id}
                                    showsVerticalScrollIndicator={false}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={styles.listItem}
                                            onPress={() => {
                                                setSelectedId(item.id);
                                                setTotalQuestions(item.defaultQuestions ?? "40");
                                                setTargetMinutes(item.defaultMinutes ?? "90");
                                                setIsMenuOpen(false);
                                            }}
                                        >
                                            <View style={styles.row}>
                                                <View style={[styles.dot, { backgroundColor: selectedId === item.id ? THEME_GREEN.point : THEME_GREEN.border }]} />
                                                <Text style={[styles.listText, selectedId === item.id && { color: THEME_GREEN.point }]}>{item.name}</Text>
                                            </View>
                                            <View style={styles.row}>
                                                <TouchableOpacity style={styles.miniBtn} onPress={() => { setFormName(item.name); setTargetCatId(item.id); setMenuMode("edit"); }}><Ionicons name="pencil-outline" size={16} color={THEME_GREEN.textMuted} /></TouchableOpacity>
                                                {!item.isDefault && <TouchableOpacity style={styles.miniBtn} onPress={() => handleDeleteCategory(item.id)}><Ionicons name="trash-outline" size={16} color="#FF5252" /></TouchableOpacity>}
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                    contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                                />
                            ) : (
                                <View style={{ gap: 20, paddingBottom: insets.bottom + 20 }}>
                                    <View style={[styles.card, { backgroundColor: THEME_GREEN.bg }]}>
                                        <TextInput style={styles.input} placeholder="과목 이름 입력" value={formName} onChangeText={setFormName} autoFocus />
                                    </View>
                                    <View style={styles.formActions}>
                                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setMenuMode("select")}><Text style={styles.cancelText}>취소</Text></TouchableOpacity>
                                        <TouchableOpacity style={styles.saveBtn} onPress={saveCategory}><Text style={styles.saveText}>저장</Text></TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </Pressable>
                    </KeyboardAvoidingView>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );

    return renderSetup();
}

const styles = StyleSheet.create({
    screen: { flex: 1 },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
    label: { fontSize: 13, fontWeight: '700', color: THEME_GREEN.textMuted, marginTop: 24, marginBottom: 12, marginLeft: 4 },
    card: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: THEME_GREEN.border },
    row: { flexDirection: 'row', alignItems: 'center' },
    dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: THEME_GREEN.point, marginRight: 10 },
    cardText: { fontSize: 17, fontWeight: '700', color: THEME_GREEN.textMain },
    input: { fontSize: 16, fontWeight: '600', color: THEME_GREEN.textMain, flex: 1 },
    grid: { flexDirection: 'row', gap: 16, marginTop: 12 },
    halfCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 24, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: THEME_GREEN.border },
    smallLabel: { fontSize: 11, fontWeight: '700', color: THEME_GREEN.textMuted, marginBottom: 8 },
    value: { fontSize: 22, fontWeight: '900', color: THEME_GREEN.textMain, marginBottom: 12 },
    unit: { fontSize: 13, color: THEME_GREEN.textMuted },
    stepper: { flexDirection: 'row', gap: 10 },
    stepBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: THEME_GREEN.bg, alignItems: 'center', justifyContent: 'center' },
    paceInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, gap: 6 },
    paceInfoText: { fontSize: 13, color: THEME_GREEN.textMuted },
    footer: { paddingHorizontal: 24 },
    mainBtn: { backgroundColor: THEME_GREEN.point, paddingVertical: 18, borderRadius: 24, alignItems: 'center' },
    mainBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 32 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    sheetTitle: { fontSize: 19, fontWeight: '800' },
    listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: THEME_GREEN.border },
    listText: { fontSize: 16, fontWeight: '700', color: THEME_GREEN.textMain },
    miniBtn: { padding: 8, marginLeft: 8 },

    formActions: { flexDirection: 'row', gap: 12 },
    cancelBtn: { flex: 1, padding: 16, alignItems: 'center', borderRadius: 16, backgroundColor: THEME_GREEN.bg },
    cancelText: { fontWeight: '700', color: THEME_GREEN.textMuted },
    saveBtn: { flex: 2, padding: 16, alignItems: 'center', borderRadius: 16, backgroundColor: THEME_GREEN.point },
    saveText: { fontWeight: '800', color: '#FFF' },
});
