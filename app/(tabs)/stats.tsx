import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    BackHandler,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import SessionDetail from '../../components/SessionDetail';
import { deleteSession, ExamSession, getSessions } from '../../lib/storage';
import { COLORS } from '../../lib/theme';

export default function StatsScreen() {
    const [sessions, setSessions] = useState<ExamSession[]>([]);
    const [selectedSession, setSelectedSession] = useState<ExamSession | null>(null);
    const [weekOffset, setWeekOffset] = useState(0);
    const insets = useSafeAreaInsets();

    // 안드로이드 뒤로가기 버튼 대응
    useEffect(() => {
        const backAction = () => {
            if (selectedSession) {
                setSelectedSession(null);
                return true;
            }
            return false;
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, [selectedSession]);

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

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}분 ${s}초`;
    };

    const formatDate = (dateString: string) => {
        const d = new Date(dateString);
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    };

    // 주간 통계 로직
    const weeklyStats = useMemo(() => {
        const stats = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

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

    const canGoBack = useMemo(() => {
        if (sessions.length === 0) return false;
        const oldestSessionDate = new Date(sessions[sessions.length - 1].date);
        oldestSessionDate.setHours(0, 0, 0, 0);
        return oldestSessionDate < weeklyStats[0].date;
    }, [sessions, weeklyStats]);

    // 그룹화된 리스트 (필터 없이 전체 세션 사용)
    const groupedData = useMemo(() => {
        return sessions.reduce((acc: any, session) => {
            const date = formatDate(session.date);
            if (!acc[date]) acc[date] = [];
            acc[date].push(session);
            return acc;
        }, {});
    }, [sessions]);

    const sections = Object.keys(groupedData).sort((a, b) => b.localeCompare(a));

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
                <StatusBar barStyle="dark-content" />
                <AppHeader />

                <ScrollView
                    style={styles.list}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
                >
                    {/* 주간 학습 흐름 섹션 */}
                    <View style={styles.weeklyContainer}>
                        <View style={styles.weeklyHeader}>
                            <Text style={styles.sectionTitle}>
                                {weekOffset === 0 ? '이번 주 학습 흐름' : `${weekOffset}주 전 학습 흐름`}
                            </Text>
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

                        <View style={styles.weeklyWidget}>
                            <View style={styles.weeklyDaysRow}>
                                {weeklyStats.map((day, index) => {
                                    const maxTime = Math.max(...weeklyStats.map(d => d.totalTime), 60 * 60); // min 1hr for scale
                                    const barHeight = day.hasData ? Math.max((day.totalTime / maxTime) * 100, 12) : 0;
                                    const isToday = index === weeklyStats.length - 1 && weekOffset === 0;

                                    return (
                                        <View key={index} style={styles.dayColumn}>
                                            <View style={styles.barContainer}>
                                                {day.hasData ? (
                                                    <LinearGradient
                                                        colors={isToday ? ['#818CF8', '#6366F1'] : ['#C7D2FE', '#818CF8']}
                                                        style={[styles.activeBar, { height: `${barHeight}%` }]}
                                                    />
                                                ) : (
                                                    <View style={styles.emptyDot} />
                                                )}
                                                {isToday && <View style={styles.todayPointer} />}
                                            </View>
                                            <Text style={[styles.dayLabel, day.hasData && styles.dayLabelActive, isToday && { color: COLORS.primary, fontWeight: '900' }]}>{day.dayLabel}</Text>
                                            <Text style={styles.dayDateTiny}>{day.dateLabel.split('.')[1]}</Text>
                                        </View>
                                    );
                                })}
                            </View>

                            <LinearGradient
                                colors={['#F8FAFC', '#F1F5F9']}
                                style={styles.weeklySummaryFooter}
                            >
                                <View style={styles.summaryItem}>
                                    <View style={styles.summaryHeaderRow}>
                                        <Ionicons name="flash" size={12} color={COLORS.primary} />
                                        <Text style={styles.summaryLabel}>WEEKLY INSIGHT</Text>
                                    </View>
                                    <View style={styles.summaryRow}>
                                        <View style={styles.summaryGroup}>
                                            <Text style={styles.summaryValue}>
                                                {Math.floor(weeklyStats.reduce((sum, d) => sum + d.totalTime, 0) / 60)}
                                            </Text>
                                            <Text style={styles.summaryUnit}>분</Text>
                                        </View>
                                        <View style={styles.summarySpace} />
                                        <View style={styles.summaryGroup}>
                                            <Text style={styles.summaryValue}>
                                                {weeklyStats.reduce((sum, d) => sum + d.totalQuestions, 0)}
                                            </Text>
                                            <Text style={styles.summaryUnit}>문항</Text>
                                        </View>
                                    </View>
                                </View>
                            </LinearGradient>
                        </View>
                    </View>

                    {/* 리스트 헤더 타이틀 추가로 더 심플하게 구분 */}
                    <View style={styles.listHeader}>
                        <Text style={styles.listHeaderText}>모든 학습 기록</Text>
                    </View>

                    {sections.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="document-text-outline" size={64} color={COLORS.border} />
                            <Text style={styles.emptyText}>아직 기록된 시험이 없습니다.</Text>
                        </View>
                    ) : (
                        sections.map(date => (
                            <View key={date} style={styles.section}>
                                <Text style={styles.sectionDate}>{date}</Text>
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
                                            <View style={styles.cardHeaderRow}>
                                                <View style={styles.categoryBadge}>
                                                    <Text style={styles.categoryText}>{session.categoryName}</Text>
                                                </View>
                                                <Text style={styles.cardTitle}>{session.title}</Text>
                                            </View>
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
                                            <Ionicons name="trash-outline" size={18} color={COLORS.border} />
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ))
                    )}
                </ScrollView>
            </SafeAreaView>

            {/* 상세 보기 화면 (모달 대신 조건부 렌더링) */}
            {selectedSession && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.bg, zIndex: 100 }]}>
                    <ScrollView
                        style={{ flex: 1 }}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={[styles.modalScroll, {
                            paddingBottom: 100 + insets.bottom,
                            paddingTop: insets.top + 20,
                            paddingHorizontal: 24
                        }]}
                    >
                        <SessionDetail
                            session={selectedSession}
                            showDate={true}
                            onBack={() => setSelectedSession(null)}
                        />
                    </ScrollView>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    list: { flex: 1, paddingHorizontal: 24 },
    listHeader: { marginBottom: 16, marginTop: 8 },
    listHeaderText: { fontSize: 18, fontWeight: '800', color: COLORS.text },

    section: { marginBottom: 24 },
    sectionDate: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted, marginBottom: 12 },

    sessionCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
    cardInfo: { flex: 1 },
    cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 },
    categoryBadge: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    categoryText: { color: COLORS.primary, fontSize: 10, fontWeight: '800' },
    cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },

    statsRow: { flexDirection: 'row' },
    stat: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
    statValue: { fontSize: 12, color: COLORS.textMuted, marginLeft: 4, fontWeight: '600' },

    deleteBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
    emptyText: { marginTop: 16, fontSize: 16, color: COLORS.textMuted, fontWeight: '500' },

    // Weekly Flow
    weeklyContainer: { marginTop: 20, marginBottom: 32 },
    weeklyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
    weekNav: { flexDirection: 'row', gap: 6 },
    navBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
    navBtnDisabled: { opacity: 0.2 },

    // Weekly Widget
    weeklyWidget: { backgroundColor: COLORS.surface, borderRadius: 28, padding: 4, borderWidth: 1, borderColor: 'rgba(226, 232, 240, 0.6)', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 4 },
    weeklyDaysRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 110, paddingHorizontal: 16, marginBottom: 8, marginTop: 12 },
    dayColumn: { alignItems: 'center', flex: 1 },
    barContainer: { height: 70, width: '100%', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 12 },
    activeBar: { width: 14, borderRadius: 7, minHeight: 6 },
    emptyDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#EDF2F7' },
    todayPointer: { position: 'absolute', bottom: -10, width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary },
    dayLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, marginBottom: 1 },
    dayLabelActive: { color: '#475569' },
    dayDateTiny: { fontSize: 10, color: COLORS.textMuted, opacity: 0.5, fontWeight: '600' },

    weeklySummaryFooter: { padding: 20, borderRadius: 24, marginTop: 4 },
    summaryItem: {},
    summaryHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
    summaryLabel: { fontSize: 10, fontWeight: '900', color: COLORS.primary, letterSpacing: 1 },
    summaryRow: { flexDirection: 'row', alignItems: 'center' },
    summaryGroup: { flexDirection: 'row', alignItems: 'baseline' },
    summaryValue: { fontSize: 24, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5 },
    summaryUnit: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, marginLeft: 2 },
    summarySpace: { width: 24 },

    // Modal / Screen
    modalFull: { flex: 1, backgroundColor: COLORS.bg },
    modalScroll: { paddingTop: 0 },
});