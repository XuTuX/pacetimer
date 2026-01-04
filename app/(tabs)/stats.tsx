import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
                                        </>
                                    ) : (
                                        <View style={styles.dayEmpty}><View style={styles.dayDash} /></View>
                                    )}
                                </View>
                            ))}
                        </ScrollView>
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
    weeklyScroll: { flexGrow: 0 },
    weeklyScrollContent: { paddingRight: 24 },
    dayCard: { width: 68, height: 100, backgroundColor: COLORS.surface, borderRadius: 16, marginRight: 8, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, opacity: 0.5 },
    dayCardActive: { opacity: 1, borderColor: COLORS.primary },
    dayLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
    dayLabelActive: { color: COLORS.primary },
    dayDate: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginBottom: 4 },
    dayCardTextActive: { color: COLORS.text },
    dayDivider: { width: 16, height: 1.5, backgroundColor: COLORS.border, marginVertical: 6 },
    dayStat: { flexDirection: 'row', alignItems: 'baseline' },
    dayStatValue: { fontSize: 13, fontWeight: '800', color: COLORS.text },
    dayStatUnit: { fontSize: 9, color: COLORS.textMuted, marginLeft: 1 },
    dayEmpty: { flex: 1, justifyContent: 'center' },
    dayDash: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.border },

    // Modal / Screen
    modalFull: { flex: 1, backgroundColor: COLORS.bg },
    modalScroll: { paddingTop: 0 },
});