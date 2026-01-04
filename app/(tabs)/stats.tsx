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
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import SessionDetail from '../../components/SessionDetail';
import { deleteSession, ExamSession, getSessions } from '../../lib/storage';
import { COLORS } from '../../lib/theme';

export default function StatsScreen() {
    const [sessions, setSessions] = useState<ExamSession[]>([]);
    const [filterCategory, setFilterCategory] = useState<string | null>(null);
    const [selectedSession, setSelectedSession] = useState<ExamSession | null>(null);
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

    const [weekOffset, setWeekOffset] = useState(0);

    // Calucate weekly stats
    const weeklyStats = useMemo(() => {
        const stats = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Shift date based on weekOffset (each offset is 7 days)
        const baseDate = new Date(today);
        baseDate.setDate(today.getDate() - (weekOffset * 7));

        for (let i = 6; i >= 0; i--) {
            const d = new Date(baseDate);
            d.setDate(baseDate.getDate() - i);

            const daysSessions = sessions.filter(s => {
                const sDate = new Date(s.date);
                return sDate.getDate() === d.getDate() &&
                    sDate.getMonth() === d.getMonth() &&
                    sDate.getFullYear() === d.getFullYear();
            });

            const totalTime = daysSessions.reduce((sum, s) => sum + s.totalSeconds, 0);
            const totalQuestions = daysSessions.reduce((sum, s) => sum + s.totalQuestions, 0);
            const subjects = Array.from(new Set(daysSessions.map(s => s.categoryName)));

            stats.push({
                date: d,
                dayLabel: ['일', '월', '화', '수', '목', '금', '토'][d.getDay()],
                dateLabel: `${d.getMonth() + 1}.${d.getDate()}`,
                totalTime,
                totalQuestions,
                subjects,
                hasData: daysSessions.length > 0
            });
        }
        return stats;
    }, [sessions, weekOffset]);

    // Check if there are older sessions to determine if we can go back further
    const canGoBack = useMemo(() => {
        if (sessions.length === 0) return false;
        const oldestSessionDate = new Date(sessions[sessions.length - 1].date);
        oldestSessionDate.setHours(0, 0, 0, 0);

        const currentWeekOldestDate = weeklyStats[0].date;
        return oldestSessionDate < currentWeekOldestDate;
    }, [sessions, weeklyStats]);

    // Group for list view (existing logic)
    const groupedData = useMemo(() => {
        return filteredSessions.reduce((acc: any, session) => {
            const date = formatDate(session.date);
            if (!acc[date]) acc[date] = [];
            acc[date].push(session);
            return acc;
        }, {});
    }, [filteredSessions]);

    const sections = Object.keys(groupedData).sort((a, b) => b.localeCompare(a));

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" />
            <AppHeader />

            <ScrollView
                style={styles.list}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
            >
                <View style={styles.weeklyContainer}>
                    <View style={styles.weeklyHeader}>
                        <Text style={styles.sectionTitle}>{weekOffset === 0 ? '이번 주 학습 흐름' : `${weekOffset}주 전 학습 흐름`}</Text>
                        <View style={styles.weekNav}>
                            <TouchableOpacity
                                style={[styles.navBtn, !canGoBack && styles.navBtnDisabled]}
                                onPress={() => canGoBack && setWeekOffset(v => v + 1)}
                                disabled={!canGoBack}
                            >
                                <Ionicons name="chevron-back" size={20} color={canGoBack ? COLORS.text : COLORS.border} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.navBtn, weekOffset === 0 && styles.navBtnDisabled]}
                                onPress={() => weekOffset > 0 && setWeekOffset(v => v - 1)}
                                disabled={weekOffset === 0}
                            >
                                <Ionicons name="chevron-forward" size={20} color={weekOffset > 0 ? COLORS.text : COLORS.border} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weeklyScroll} contentContainerStyle={styles.weeklyScrollContent}>
                        {weeklyStats.map((day, index) => (
                            <View key={index} style={[styles.dayCard, day.hasData && styles.dayCardActive]}>
                                <Text style={[styles.dayLabel, day.hasData && styles.dayLabelActive]}>{day.dayLabel}</Text>
                                <Text style={[styles.dayDate, day.hasData && styles.dayCardTextActive]}>{day.dateLabel}</Text>
                                <View style={styles.dayDivider} />
                                {day.hasData ? (
                                    <>
                                        <View style={styles.dayStat}>
                                            <Text style={styles.dayStatValue}>{Math.round(day.totalTime / 60)}</Text>
                                            <Text style={styles.dayStatUnit}>분</Text>
                                        </View>
                                        <View style={styles.dayStat}>
                                            <Text style={styles.dayStatValue}>{day.totalQuestions}</Text>
                                            <Text style={styles.dayStatUnit}>문항</Text>
                                        </View>
                                        <View style={styles.daySubjects}>
                                            {day.subjects.slice(0, 2).map((sub, i) => (
                                                <View key={i} style={styles.daySubjectDot} />
                                            ))}
                                            {day.subjects.length > 2 && <View style={styles.daySubjectDot} />}
                                        </View>
                                    </>
                                ) : (
                                    <View style={styles.dayEmpty}>
                                        <View style={styles.dayDash} />
                                    </View>
                                )}
                            </View>
                        ))}
                    </ScrollView>
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
                    <SafeAreaProvider>
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
                                    style={{ flex: 1 }}
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={[styles.modalScroll, { paddingBottom: 100 + insets.bottom }]}
                                >
                                    <SessionDetail session={selectedSession} />
                                </ScrollView>
                            </SafeAreaView>
                        </View>
                    </SafeAreaProvider>
                )}
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    filterBarContainer: { height: 50, marginBottom: 16, marginTop: 8 },
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
    modalHeaderCompact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
    modalCloseBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    modalHeaderText: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: COLORS.text },
    modalScroll: { padding: 16 },

    // Weekly Flow
    weeklyContainer: { marginTop: 24, marginBottom: 24 },
    weeklyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 0 },
    weekNav: { flexDirection: 'row', gap: 8 },
    navBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
    navBtnDisabled: { opacity: 0.3 },
    weeklyScroll: { flexGrow: 0 },
    weeklyScrollContent: { paddingRight: 24 },
    dayCard: { width: 72, height: 110, backgroundColor: COLORS.surface, borderRadius: 16, marginRight: 8, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, opacity: 0.6 },
    dayCardActive: { opacity: 1, borderColor: COLORS.primary, backgroundColor: COLORS.surface }, // highlight active? maybe just opacity is enough or border. User said "clean". keeping it simple.
    dayLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, marginBottom: 2 },
    dayLabelActive: { color: COLORS.primary },
    dayDate: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
    dayCardTextActive: { color: COLORS.text },
    dayDivider: { width: 20, height: 2, backgroundColor: COLORS.border, marginVertical: 8, borderRadius: 1 },
    dayStat: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 2 },
    dayStatValue: { fontSize: 14, fontWeight: '800', color: COLORS.text },
    dayStatUnit: { fontSize: 10, color: COLORS.textMuted, marginLeft: 1 },
    daySubjects: { flexDirection: 'row', marginTop: 6, gap: 4 },
    daySubjectDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
    dayEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    dayDash: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.border },
});
