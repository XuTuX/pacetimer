import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
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
import { DailyAnalysis } from '../../components/DailyAnalysis';
import HistoryTab from '../../components/HistoryTab';
import SessionDetail from '../../components/SessionDetail';
import { ExamSession, getSessions } from '../../lib/storage';
import { useAppStore } from '../../lib/store';
import { COLORS } from '../../lib/theme';



type DateSection = {
    date: string;
    displayDate: string;
    sessions: ExamSession[];
    totalSeconds: number;
    totalQuestions: number;
};

type TabType = 'analysis' | 'detail' | 'history';

import PagerView from 'react-native-pager-view';

export default function StatsScreen() {
    const { signOut, userId } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabType>('analysis');
    const [sessions, setSessions] = useState<ExamSession[]>([]);
    const [selectedSession, setSelectedSession] = useState<ExamSession | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const insets = useSafeAreaInsets();
    const pagerRef = React.useRef<PagerView>(null);

    const getStudyDate = (timestamp: number | string | Date) => {
        const d = new Date(timestamp);
        // Subtract 6 hours (21600000 ms) to shift the "day" boundary to 6 AM
        const shifted = new Date(d.getTime() - 21600000);
        return shifted.toISOString().split('T')[0];
    };

    const formatDisplayDateLocal = (dateStr: string) => {
        const today = getStudyDate(Date.now());
        const yesterday = getStudyDate(Date.now() - 86400000);
        if (dateStr === today) return '오늘';
        if (dateStr === yesterday) return '어제';
        const [y, m, d] = dateStr.split('-');
        return `${parseInt(m)}월 ${parseInt(d)}일`;
    };

    const { questionRecords } = useAppStore();

    const [selectedAnalysisDate, setSelectedAnalysisDate] = useState<string>(getStudyDate(Date.now()));

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

    const processedData = useMemo(() => {
        const dateMap: Record<string, { sessions: ExamSession[], totalSeconds: number, totalQuestions: number }> = {};

        // Add ExamSessions (Mock Exams)
        sessions.forEach(s => {
            const d = getStudyDate(s.date);
            if (!dateMap[d]) dateMap[d] = { sessions: [], totalSeconds: 0, totalQuestions: 0 };
            dateMap[d].sessions.push(s);
        });

        // Add QuestionRecords (All modes)
        questionRecords.forEach(r => {
            const d = getStudyDate(r.startedAt);
            if (!dateMap[d]) dateMap[d] = { sessions: [], totalSeconds: 0, totalQuestions: 0 };
            dateMap[d].totalSeconds += (r.durationMs / 1000);
            dateMap[d].totalQuestions += 1;
        });

        const sortedDates = Object.keys(dateMap).sort((a, b) => b.localeCompare(a));

        const sections: DateSection[] = sortedDates.map(date => ({
            date,
            displayDate: formatDisplayDateLocal(date),
            sessions: dateMap[date].sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
            totalSeconds: dateMap[date].totalSeconds,
            totalQuestions: dateMap[date].totalQuestions,
        }));

        return { dateSections: sections };
    }, [sessions, questionRecords]);

    const handleTabChange = (tab: TabType) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveTab(tab);
        const index = tab === 'analysis' ? 0 : tab === 'detail' ? 1 : 2;
        pagerRef.current?.setPage(index);
    };

    const onViewDailyAnalysis = (date: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedAnalysisDate(date);
        handleTabChange('analysis');
    };

    const handleSignOut = async () => {
        try {
            await signOut();
            router.replace('/auth/login');
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <StatusBar barStyle="dark-content" />
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>학습 리포트</Text>
                        <Text style={styles.userLabel}>{userId || 'Guest User'}</Text>
                    </View>
                    <TouchableOpacity style={styles.settingsBtn} onPress={() => setSettingsOpen(v => !v)}>
                        <Ionicons name="settings-outline" size={22} color={COLORS.text} />
                    </TouchableOpacity>
                    {settingsOpen && (
                        <View style={styles.dropdown}>
                            <TouchableOpacity style={styles.dropdownItem} onPress={() => router.push('/subjects/manage')}>
                                <Ionicons name="book-outline" size={18} color={COLORS.text} />
                                <Text style={styles.dropdownText}>과목 관리</Text>
                            </TouchableOpacity>
                            <View style={styles.divider} />
                            <TouchableOpacity style={styles.dropdownItem} onPress={handleSignOut}>
                                <Ionicons name="log-out-outline" size={18} color={COLORS.accent} />
                                <Text style={[styles.dropdownText, { color: COLORS.accent }]}>로그아웃</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <View style={styles.tabContainer}>
                    <View style={styles.tabHeader}>
                        <TouchableOpacity
                            style={[styles.tabItem, activeTab === 'analysis' && styles.activeTabItem]}
                            onPress={() => handleTabChange('analysis')}
                        >
                            <Text style={[styles.tabText, activeTab === 'analysis' && styles.activeTabText]}>분석</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tabItem, activeTab === 'detail' && styles.activeTabItem]}
                            onPress={() => handleTabChange('detail')}
                        >
                            <Text style={[styles.tabText, activeTab === 'detail' && styles.activeTabText]}>내역</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tabItem, activeTab === 'history' && styles.activeTabItem]}
                            onPress={() => handleTabChange('history')}
                        >
                            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>전체</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <PagerView
                    ref={pagerRef}
                    style={{ flex: 1 }}
                    initialPage={0}
                    onPageSelected={(e) => {
                        const pos = e.nativeEvent.position;
                        const tab: TabType = pos === 0 ? 'analysis' : pos === 1 ? 'detail' : 'history';
                        setActiveTab(tab);
                        Haptics.selectionAsync();
                    }}
                >
                    <ScrollView key="1" style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
                        <View style={styles.statsView}>
                            <DailyAnalysis
                                selectedDate={selectedAnalysisDate}
                                viewMode="analysis"
                                onDateChange={(d) => {
                                    if (d) setSelectedAnalysisDate(d);
                                    else handleTabChange('history');
                                }}
                            />
                        </View>
                    </ScrollView>
                    <ScrollView key="2" style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
                        <View style={styles.statsView}>
                            <DailyAnalysis
                                selectedDate={selectedAnalysisDate}
                                viewMode="detail"
                                onDateChange={(d) => {
                                    if (d) setSelectedAnalysisDate(d);
                                    else handleTabChange('history');
                                }}
                            />
                        </View>
                    </ScrollView>
                    <ScrollView key="3" style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
                        <View style={styles.historyWrapper}>
                            <HistoryTab
                                sessionsCount={sessions.length}
                                dateSections={processedData.dateSections}
                                onDeleted={() => loadSessions()}
                                onViewDailyAnalysis={onViewDailyAnalysis}
                            />
                        </View>
                    </ScrollView>
                </PagerView>

                <View style={styles.indicatorContainer}>
                    <View style={[styles.dot, activeTab === 'analysis' && styles.activeDot]} />
                    <View style={[styles.dot, activeTab === 'detail' && styles.activeDot]} />
                    <View style={[styles.dot, activeTab === 'history' && styles.activeDot]} />
                </View>
            </SafeAreaView>

            {selectedSession && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.bg, zIndex: 100 }]}>
                    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
                        <ScrollView
                            style={{ backgroundColor: COLORS.bg }}
                            contentContainerStyle={{ padding: 24 }}
                            showsVerticalScrollIndicator={false}
                        >
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
        zIndex: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.text,
    },
    userLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textMuted,
        marginTop: 2,
    },
    settingsBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    dropdown: {
        position: 'absolute',
        top: 70,
        right: 24,
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 8,
        minWidth: 160,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 12,
    },
    dropdownText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginHorizontal: 8,
    },
    indicatorContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 16,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.border,
    },
    activeDot: {
        width: 12,
        backgroundColor: COLORS.primary,
    },
    content: { flex: 1 },
    tabContainer: {
        paddingHorizontal: 24,
        marginBottom: 8,
    },
    tabHeader: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    tabItem: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 16,
    },
    activeTabItem: {
        backgroundColor: COLORS.primaryLight,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    activeTabText: {
        color: COLORS.primary,
    },
    statsView: { paddingHorizontal: 24, paddingTop: 16 },
    historyWrapper: {
        paddingHorizontal: 24,
        paddingTop: 16,
    },
});
