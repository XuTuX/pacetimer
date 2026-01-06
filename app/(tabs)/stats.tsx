import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
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
import MonthlyStreakHeatmap from '../../components/MonthlyStreakHeatmap';
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

    const confirmDelete = (id: string) => {
        Alert.alert("기록 삭제", "이 시험 기록을 삭제할까요? 삭제 후 복구할 수 없습니다.", [
            { text: "취소", style: "cancel" },
            { text: "삭제", style: "destructive", onPress: () => handleDelete(id) }
        ]);
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

    const canGoBack = useMemo(() => {
        if (sessions.length === 0) return false;
        return true;
    }, [sessions]);

    // 그룹화된 리스트 (필터 없이 전체 세션 사용)
    // 히트맵 데이터 및 스트릭 계산 (오전 6시 기준 일자 변경 적용)
    const getStudyDate = (date: string | Date) => {
        const d = new Date(date);
        // UTC+9 기준 오전 6시 이전이면 이전 날짜로 취급
        // 간단하게 6시간을 빼서 날짜를 구하면 됨
        const shifted = new Date(d.getTime() - (6 * 60 * 60 * 1000));
        return shifted.toISOString().split('T')[0];
    };

    const heatmapData = useMemo(() => {
        const map: Record<string, number> = {};
        sessions.forEach(s => {
            const d = getStudyDate(s.date);
            map[d] = (map[d] || 0) + s.totalQuestions;
        });
        return Object.entries(map).map(([date, count]) => ({ date, count }));
    }, [sessions]);

    const { currentStreak, bestStreak } = useMemo(() => {
        const activeDates = Array.from(new Set(sessions.map(s => getStudyDate(s.date)))).sort();
        if (activeDates.length === 0) return { currentStreak: 0, bestStreak: 0 };

        let max = 0;
        let current = 0;
        let streak = 0;

        // Best Streak
        for (let i = 0; i < activeDates.length; i++) {
            if (i === 0) {
                streak = 1;
            } else {
                const prev = new Date(activeDates[i - 1]);
                const curr = new Date(activeDates[i]);
                const diffTime = Math.abs(curr.getTime() - prev.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    streak++;
                } else {
                    streak = 1;
                }
            }
            max = Math.max(max, streak);
        }

        // Current Streak
        const today = getStudyDate(new Date());
        const yesterday = getStudyDate(new Date(Date.now() - 86400000));

        let lastDate = activeDates[activeDates.length - 1];
        if (lastDate === today || lastDate === yesterday) {
            let tempStreak = 0;
            let checkDate = new Date(lastDate);

            for (let i = activeDates.length - 1; i >= 0; i--) {
                const d = new Date(activeDates[i]);
                const diffTime = Math.abs(checkDate.getTime() - d.getTime());
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 0 || diffDays === 1) {
                    tempStreak++;
                    checkDate = d;
                } else {
                    break;
                }
            }
            current = tempStreak;
        }

        return { currentStreak: current, bestStreak: max };
    }, [sessions]);

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
                    {/* 월간 스트릭 히트맵 섹션 */}
                    <View style={{ marginTop: 20, marginBottom: 12 }}>
                        <MonthlyStreakHeatmap
                            month={new Date().toISOString().slice(0, 7)}
                            data={heatmapData}
                            currentStreak={currentStreak}
                            bestStreak={bestStreak}
                        />
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
                                        <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(session.id)}>
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
