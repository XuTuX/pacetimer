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
import HistoryTab from '../../components/HistoryTab';
import MonthlyStreakHeatmap from '../../components/MonthlyStreakHeatmap';
import SessionDetail from '../../components/SessionDetail';
import { ExamSession, getSessions } from '../../lib/storage';
import { COLORS } from '../../lib/theme';


// --- 초록색 테마 설정 ---
const THEME_GREEN = {
    point: '#00D094',      // 선명한 포인트 민트 그린 (도트 및 숫자)
    pointLight: '#E6F9F4', // 아이콘 배경용 연한 민트
    textMain: '#222222',   // 가독성을 위한 진한 텍스트
    textMuted: '#8E8E93',  // 부가 정보용 회색
};

type DateSection = {
    date: string;
    displayDate: string;
    sessions: ExamSession[];
};

type TabType = 'stats' | 'history';

export default function StatsScreen() {
    const [activeTab, setActiveTab] = useState<TabType>('stats');
    const [sessions, setSessions] = useState<ExamSession[]>([]);
    const [selectedSession, setSelectedSession] = useState<ExamSession | null>(null);
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const backAction = () => {
            if (selectedSession) {
                setSelectedSession(null);
                return true;
            }
            return false;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [selectedSession]);

    const loadSessions = useCallback(async () => {
        const data = await getSessions();
        setSessions(data);
    }, []);

    useFocusEffect(useCallback(() => { loadSessions(); }, [loadSessions]));

    const getStudyDate = (dateString: string | Date) => {
        const d = new Date(dateString);
        const shifted = new Date(d.getTime() - (6 * 60 * 60 * 1000));
        return shifted.toISOString().split('T')[0];
    };

    const formatDisplayDate = (dateStr: string) => {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (dateStr === today) return '오늘';
        if (dateStr === yesterday) return '어제';
        const d = new Date(dateStr);
        return `${d.getMonth() + 1}월 ${d.getDate()}일`;
    };

    const processedData = useMemo(() => {
        if (sessions.length === 0) return { dateSections: [], currentStreak: 0, heatmapData: [] };
        const dateMap: Record<string, ExamSession[]> = {};
        sessions.forEach(s => {
            const d = getStudyDate(s.date);
            if (!dateMap[d]) dateMap[d] = [];
            dateMap[d].push(s);
        });
        const sortedDates = Object.keys(dateMap).sort((a, b) => b.localeCompare(a));

        let curStrk = 0;
        const today = getStudyDate(new Date());
        const yesterday = getStudyDate(new Date(Date.now() - 86400000));
        if (sortedDates.includes(today) || sortedDates.includes(yesterday)) {
            let checkDate = sortedDates.includes(today) ? new Date(today) : new Date(yesterday);
            while (true) {
                const checkStr = checkDate.toISOString().split('T')[0];
                if (dateMap[checkStr]) {
                    curStrk++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else { break; }
            }
        }

        const sections: DateSection[] = sortedDates.map(date => ({
            date,
            displayDate: formatDisplayDate(date),
            sessions: dateMap[date].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        }));

        const heatmap = Object.entries(dateMap).map(([date, items]) => ({
            date,
            count: items.reduce((sum, s) => sum + s.totalQuestions, 0)
        }));

        return { dateSections: sections, currentStreak: curStrk, heatmapData: heatmap };
    }, [sessions]);

    const handleTabChange = (tab: TabType) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveTab(tab);
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <StatusBar barStyle="dark-content" />
                <AppHeader />

                {/* 탭 버튼 */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'stats' && styles.activeTabButton]}
                        onPress={() => handleTabChange('stats')}
                    >
                        <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>리포트</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'history' && styles.activeTabButton]}
                        onPress={() => handleTabChange('history')}
                    >
                        <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>학습 기록</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                >
                    {activeTab === 'stats' ? (
                        /* --- 리포트 탭 --- */
                        <View>
                            <View style={styles.summaryCard}>
                                <View style={styles.streakInfo}>
                                    <Text style={styles.summaryLabel}>현재 스트릭</Text>
                                    <Text style={styles.summaryValue}>
                                        <Text style={styles.highlightText}>{processedData.currentStreak}일</Text> 연속 성장 중
                                    </Text>
                                </View>
                                <View style={styles.streakIcon}>
                                    <Ionicons name="flame" size={30} color={THEME_GREEN.point} />
                                </View>
                            </View>

                            <Text style={styles.sectionTitle}>학습 활동</Text>
                            <MonthlyStreakHeatmap
                                data={processedData.heatmapData}
                                currentStreak={processedData.currentStreak}
                            />
                        </View>
                    ) : (
                        <HistoryTab
                            sessionsCount={sessions.length}
                            dateSections={processedData.dateSections}
                            onSelectSession={(s) => setSelectedSession(s)}
                            onDeleted={() => loadSessions()}
                        />
                    )}
                </ScrollView>
            </SafeAreaView>

            {/* 상세 보기 레이어 */}
            {selectedSession && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.bg, zIndex: 100 }]}>
                    <SafeAreaView style={{ flex: 1 }}>
                        <ScrollView contentContainerStyle={{ padding: 24 }}>
                            <SessionDetail session={selectedSession} showDate={true} onBack={() => setSelectedSession(null)} />
                        </ScrollView>
                    </SafeAreaView>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    content: { flex: 1, paddingHorizontal: 20 },

    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F1F1F5',
        marginHorizontal: 20,
        borderRadius: 14,
        padding: 4,
        marginTop: 12,
        marginBottom: 24,
    },
    tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
    activeTabButton: { backgroundColor: COLORS.surface, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
    tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
    activeTabText: { color: COLORS.text, fontWeight: '800' },

    summaryCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        padding: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    streakInfo: { flex: 1 },
    summaryLabel: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600', marginBottom: 6 },
    summaryValue: { fontSize: 22, fontWeight: '800', color: COLORS.text },
    highlightText: { color: THEME_GREEN.point, fontWeight: '900' },
    streakIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: THEME_GREEN.pointLight, alignItems: 'center', justifyContent: 'center' },

    sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 16, marginLeft: 4 },

    // 기록 탭 헤더
    historyHeader: { marginBottom: 16, paddingLeft: 4 },
    historyCount: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
    dateGroup: { marginBottom: 28 },
    dateHeader: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 14, marginLeft: 4 },

    // 세션 카드 & 도트 스타일
    sessionCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 18,
        padding: 18,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardInfo: { flex: 1 },
    tagRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },

    // 도트(Dot) 스타일 핵심
    categoryDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: THEME_GREEN.point, // 초록 점
        marginRight: 6
    },
    categoryNameText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#444', // 제목보다 약간 연한 다크 그레이
        marginRight: 10
    },
    cardTime: { fontSize: 12, color: THEME_GREEN.textMuted, fontWeight: '500' },

    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: THEME_GREEN.textMain,
        marginBottom: 6
    },
    cardSub: { fontSize: 13, color: THEME_GREEN.textMuted, fontWeight: '500' },

    deleteBtn: { padding: 10, marginLeft: 10 },
});