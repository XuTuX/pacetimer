import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { deleteSession, ExamSession, getSessions } from '../../lib/storage';

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
    white: "#FFFFFF",
};

export default function StatsScreen() {
    const [sessions, setSessions] = useState<ExamSession[]>([]);
    const [filterCategory, setFilterCategory] = useState<string | null>(null);
    const [selectedSession, setSelectedSession] = useState<ExamSession | null>(null);
    const [lapSortMode, setLapSortMode] = useState<"number" | "slowest" | "fastest">("number");
    const insets = useSafeAreaInsets();

    const loadSessions = useCallback(async () => {
        const data = await getSessions();
        setSessions(data);
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadSessions();
        }, [loadSessions])
    );

    const handleDelete = async (id: string) => {
        await deleteSession(id);
        loadSessions();
    };

    const categories = useMemo(() => {
        const cats = Array.from(new Set(sessions.map(s => s.categoryName)));
        return cats;
    }, [sessions]);

    const filteredSessions = filterCategory
        ? sessions.filter(s => s.categoryName === filterCategory)
        : sessions;

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}분 ${s}초`;
    };

    const formatDate = (dateString: string) => {
        const d = new Date(dateString);
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    };

    const groupedData = filteredSessions.reduce((acc: any, session) => {
        const date = formatDate(session.date);
        if (!acc[date]) acc[date] = [];
        acc[date].push(session);
        return acc;
    }, {});

    const sections = Object.keys(groupedData).sort((a, b) => b.localeCompare(a));

    const analysis = useMemo(() => {
        if (!selectedSession) return null;
        const laps = selectedSession.laps;
        const targetPaceSec = selectedSession.targetSeconds / selectedSession.totalQuestions;
        const efficientLaps = laps.filter(l => l.duration <= targetPaceSec).length;
        return { targetPaceSec, efficientLaps };
    }, [selectedSession]);

    const sortedLaps = useMemo(() => {
        if (!selectedSession) return [];
        const copy = [...selectedSession.laps];
        if (lapSortMode === 'slowest') return copy.sort((a, b) => b.duration - a.duration);
        if (lapSortMode === 'fastest') return copy.sort((a, b) => a.duration - b.duration);
        return copy.sort((a, b) => a.questionNo - b.questionNo);
    }, [selectedSession, lapSortMode]);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <Text style={styles.title}>기록 분석</Text>
                <Text style={styles.subtitle}>꾸준한 노력이 실력을 만듭니다.</Text>
            </View>

            <View style={styles.filterBarContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
                    <TouchableOpacity
                        style={[styles.filterChip, !filterCategory && styles.filterChipActive]}
                        onPress={() => setFilterCategory(null)}
                    >
                        <Text style={[styles.filterText, !filterCategory && styles.filterTextActive]}>전체</Text>
                    </TouchableOpacity>
                    {categories.map(cat => (
                        <TouchableOpacity
                            key={cat}
                            style={[styles.filterChip, filterCategory === cat && styles.filterChipActive]}
                            onPress={() => setFilterCategory(cat)}
                        >
                            <Text style={[styles.filterText, filterCategory === cat && styles.filterTextActive]}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView
                style={styles.list}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
            >
                {sections.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="document-text-outline" size={64} color={COLORS.border} />
                        <Text style={styles.emptyText}>아직 기록된 시험이 없습니다.</Text>
                    </View>
                ) : (
                    sections.map(date => (
                        <View key={date} style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionDate}>{date}</Text>
                            </View>
                            {groupedData[date].map((session: ExamSession) => (
                                <TouchableOpacity
                                    key={session.id}
                                    style={styles.sessionCard}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setSelectedSession(session);
                                    }}
                                >
                                    <View style={styles.cardInfo}>
                                        <View style={styles.categoryBadge}>
                                            <Text style={styles.categoryText}>{session.categoryName}</Text>
                                        </View>
                                        <Text style={styles.cardTitle}>{session.title}</Text>
                                        <View style={styles.statsRow}>
                                            <View style={styles.stat}>
                                                <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
                                                <Text style={styles.statValue}>{formatTime(session.totalSeconds)}</Text>
                                            </View>
                                            <View style={styles.stat}>
                                                <Ionicons name="list-outline" size={14} color={COLORS.textMuted} />
                                                <Text style={styles.statValue}>{session.totalQuestions}문항</Text>
                                            </View>
                                        </View>
                                    </View>
                                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(session.id)}>
                                        <Ionicons name="trash-outline" size={20} color={COLORS.accent} />
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            ))}
                        </View>
                    ))
                )}
            </ScrollView>

            <Modal visible={!!selectedSession} animationType="slide">
                {selectedSession && (
                    <View style={styles.modalFull}>
                        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
                            <View style={styles.modalHeaderCompact}>
                                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedSession(null)}>
                                    <Ionicons name="chevron-down" size={28} color={COLORS.text} />
                                </TouchableOpacity>
                                <Text style={styles.modalHeaderText} numberOfLines={1}>{selectedSession.title}</Text>
                                <View style={{ width: 40 }} />
                            </View>

                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={[styles.modalScroll, { paddingBottom: 40 + insets.bottom }]}
                            >
                                <View style={styles.modalHero}>
                                    <Text style={styles.modalHeroLabel}>{selectedSession.categoryName}</Text>
                                    <Text style={styles.modalHeroDate}>{formatDate(selectedSession.date)}</Text>
                                </View>

                                <View style={styles.summaryGrid}>
                                    <View style={[styles.summaryBox, { backgroundColor: COLORS.primaryLight }]}>
                                        <Text style={styles.summaryBoxLabel}>소요 시간</Text>
                                        <Text style={styles.summaryBoxVal}>{formatTime(selectedSession.totalSeconds)}</Text>
                                    </View>
                                    <View style={[styles.summaryBox, { backgroundColor: '#ECFDF5' }]}>
                                        <Text style={styles.summaryBoxLabel}>평균 페이스</Text>
                                        <Text style={styles.summaryBoxVal}>{formatTime(Math.floor(selectedSession.totalSeconds / selectedSession.totalQuestions))}</Text>
                                    </View>
                                    {analysis && (
                                        <View style={[styles.summaryBox, { backgroundColor: '#FDF2F8' }]}>
                                            <Text style={styles.summaryBoxLabel}>목표 내 달성</Text>
                                            <Text style={styles.summaryBoxVal}>{analysis.efficientLaps}문항</Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.lapSectionHeader}>
                                    <Text style={styles.lapSectionTitle}>문항별 상세 기록</Text>
                                    <View style={styles.sortToggleSmall}>
                                        <TouchableOpacity
                                            style={[styles.sortToggleItem, lapSortMode === 'number' && styles.sortToggleItemActive]}
                                            onPress={() => setLapSortMode('number')}
                                        >
                                            <Text style={[styles.sortToggleItemText, lapSortMode === 'number' && styles.sortToggleItemTextActive]}>번호순</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.sortToggleItem, lapSortMode === 'slowest' && styles.sortToggleItemActive]}
                                            onPress={() => setLapSortMode('slowest')}
                                        >
                                            <Text style={[styles.sortToggleItemText, lapSortMode === 'slowest' && styles.sortToggleItemTextActive]}>느린순</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {sortedLaps.map((lap) => {
                                    const isEfficient = analysis && lap.duration <= analysis.targetPaceSec;
                                    const isTimeSink = analysis && lap.duration > analysis.targetPaceSec * 1.5;
                                    return (
                                        <View key={lap.questionNo} style={styles.lapItemRow}>
                                            <View style={styles.lapItemNo}>
                                                <Text style={styles.lapItemNoText}>{lap.questionNo}</Text>
                                            </View>
                                            <Text style={styles.lapItemTime}>{formatTime(lap.duration)}</Text>
                                            {isTimeSink ? (
                                                <View style={[styles.lapStatusBadge, { backgroundColor: '#FFF1F2' }]}><Text style={[styles.lapStatusBadgeText, { color: COLORS.accent }]}>지체</Text></View>
                                            ) : isEfficient ? (
                                                <View style={[styles.lapStatusBadge, { backgroundColor: '#ECFDF5' }]}><Text style={[styles.lapStatusBadgeText, { color: COLORS.success }]}>안정</Text></View>
                                            ) : null}
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        </SafeAreaView>
                    </View>
                )}
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: { padding: 24, paddingBottom: 16 },
    title: { fontSize: 32, fontWeight: '900', color: COLORS.text },
    subtitle: { fontSize: 16, color: COLORS.textMuted, marginTop: 4, fontWeight: '500' },
    filterBarContainer: { height: 50, marginBottom: 16 },
    filterBar: { flex: 1 },
    filterContent: { paddingHorizontal: 24, paddingBottom: 8 },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, marginRight: 8, borderWidth: 1, borderColor: COLORS.border, height: 40, justifyContent: 'center' },
    filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    filterText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
    filterTextActive: { color: COLORS.white },
    list: { flex: 1, paddingHorizontal: 24 },
    section: { marginBottom: 24 },
    sectionHeader: { marginBottom: 12 },
    sectionDate: { fontSize: 16, fontWeight: '800', color: COLORS.textMuted },
    sessionCard: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: COLORS.border },
    cardInfo: { flex: 1 },
    categoryBadge: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 },
    categoryText: { color: COLORS.primary, fontSize: 11, fontWeight: '800' },
    cardTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
    statsRow: { flexDirection: 'row' },
    stat: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
    statValue: { fontSize: 12, color: COLORS.textMuted, marginLeft: 6, fontWeight: '600' },
    deleteBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
    emptyText: { marginTop: 16, fontSize: 16, color: COLORS.textMuted, fontWeight: '500' },

    // Modal
    modalFull: { flex: 1, backgroundColor: COLORS.bg },
    modalHeaderCompact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
    modalCloseBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    modalHeaderText: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: COLORS.text },
    modalScroll: { padding: 24 },
    modalHero: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalHeroLabel: { fontSize: 13, fontWeight: '800', color: COLORS.primary, backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    modalHeroDate: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 32 },
    summaryBox: { width: '48%', minWidth: 140, height: 90, borderRadius: 20, padding: 12, marginBottom: 12, justifyContent: 'center' },
    summaryBoxLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '700', marginBottom: 6 },
    summaryBoxVal: { fontSize: 15, color: COLORS.text, fontWeight: '800' },
    lapSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    lapSectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    sortToggleSmall: { flexDirection: 'row', backgroundColor: COLORS.border, padding: 3, borderRadius: 8 },
    sortToggleItem: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
    sortToggleItemActive: { backgroundColor: COLORS.surface },
    sortToggleItemText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
    sortToggleItemTextActive: { color: COLORS.text },
    lapItemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 20, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
    lapItemNo: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    lapItemNoText: { fontSize: 13, fontWeight: '800', color: COLORS.text },
    lapItemTime: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.text },
    lapStatusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    lapStatusBadgeText: { fontSize: 11, fontWeight: '800' },
});
