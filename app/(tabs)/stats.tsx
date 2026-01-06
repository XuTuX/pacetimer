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

// --- 이미지의 초록색 느낌을 반영한 내부 컬러 설정 ---
const THEME_GREEN = {
    point: '#00D094',      // 잔디 및 숫자 강조색 (민트 그린)
    pointLight: '#E6F9F4', // 아이콘 배경 및 태그 배경 (매우 연한 민트)
    pointDeep: '#00B380',  // 좀 더 짙은 민트 (필요시)
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

    const handleDelete = async (id: string) => {
        await deleteSession(id);
        loadSessions();
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <StatusBar barStyle="dark-content" />
                <AppHeader />

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
                        <View>
                            <View style={styles.summaryCard}>
                                <View style={styles.streakInfo}>
                                    <Text style={styles.summaryLabel}>현재 스트릭</Text>
                                    <Text style={styles.summaryValue}>
                                        <Text style={styles.highlightText}>{processedData.currentStreak}일</Text> 연속 성장 중
                                    </Text>
                                </View>
                                <View style={styles.streakIcon}>
                                    {/* 아이콘도 초록색으로 통일 */}
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
                        <View>
                            <View style={styles.historyHeader}>
                                <Text style={styles.historyCount}>전체 {sessions.length}개의 기록</Text>
                            </View>

                            {processedData.dateSections.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Ionicons name="document-text-outline" size={40} color={COLORS.border} />
                                    <Text style={styles.emptyText}>학습 기록이 아직 없습니다.</Text>
                                </View>
                            ) : (
                                processedData.dateSections.map((section) => (
                                    <View key={section.date} style={styles.dateGroup}>
                                        <Text style={styles.dateHeader}>{section.displayDate}</Text>
                                        {section.sessions.map((session) => (
                                            <TouchableOpacity
                                                key={session.id}
                                                style={styles.sessionCard}
                                                activeOpacity={0.7}
                                                onPress={() => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    setSelectedSession(session);
                                                }}
                                            >
                                                <View style={styles.cardInfo}>
                                                    <View style={styles.tagRow}>
                                                        <View style={styles.categoryTag}>
                                                            <Text style={styles.categoryTagText}>{session.categoryName}</Text>
                                                        </View>
                                                        <Text style={styles.cardTime}>
                                                            {new Date(session.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </Text>
                                                    </View>
                                                    <Text style={styles.cardTitle} numberOfLines={1}>{session.title}</Text>
                                                    <Text style={styles.cardSub}>
                                                        {Math.floor(session.totalSeconds / 60)}분 · {session.totalQuestions}문항
                                                    </Text>
                                                </View>
                                                <TouchableOpacity
                                                    style={styles.deleteBtn}
                                                    onPress={() => {
                                                        Alert.alert("삭제", "이 기록을 삭제하시겠습니까?", [
                                                            { text: "취소", style: "cancel" },
                                                            { text: "삭제", style: "destructive", onPress: () => handleDelete(session.id) }
                                                        ]);
                                                    }}
                                                >
                                                    <Ionicons name="trash-outline" size={18} color={COLORS.border} />
                                                </TouchableOpacity>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                ))
                            )}
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>

            {selectedSession && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.bg, zIndex: 100 }]}>
                    <SafeAreaView style={{ flex: 1 }}>
                        <ScrollView contentContainerStyle={{ padding: 24 }}>
                            <SessionDetail
                                session={selectedSession}
                                showDate={true}
                                onBack={() => setSelectedSession(null)}
                            />
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
    tabButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 10,
    },
    activeTabButton: {
        backgroundColor: COLORS.surface,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
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
    // 숫자 강조색 적용
    highlightText: { color: THEME_GREEN.point, fontWeight: '900' },

    streakIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: THEME_GREEN.pointLight, // 이미지의 연한 초록 배경 느낌
        alignItems: 'center',
        justifyContent: 'center'
    },

    sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 16, marginLeft: 4 },

    historyHeader: { marginBottom: 16, paddingLeft: 4 },
    historyCount: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
    dateGroup: { marginBottom: 28 },
    dateHeader: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 14, marginLeft: 4 },

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
    tagRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
    // 카테고리 태그 색상 변경
    categoryTag: { backgroundColor: THEME_GREEN.pointLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    categoryTagText: { color: THEME_GREEN.point, fontSize: 11, fontWeight: '800' },

    cardTime: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
    cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
    cardSub: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },

    deleteBtn: { padding: 10, marginLeft: 10 },
    emptyState: { alignItems: 'center', marginTop: 80, gap: 12 },
    emptyText: { color: COLORS.textMuted, fontSize: 15, fontWeight: '500' }
});