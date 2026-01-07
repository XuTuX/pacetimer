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

type TabType = 'stats' | 'history';

export default function StatsScreen() {
    const { signOut, userId } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabType>('stats');
    const [sessions, setSessions] = useState<ExamSession[]>([]);
    const [selectedSession, setSelectedSession] = useState<ExamSession | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
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

    const formatDisplayDate = (dateStr: string) => {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (dateStr === today) return '오늘';
        if (dateStr === yesterday) return '어제';
        const d = new Date(dateStr);
        return `${d.getMonth() + 1}월 ${d.getDate()}일`;
    };

    const getStudyDate = (dateString: string | Date) => {
        const d = new Date(dateString);
        const shifted = new Date(d.getTime() - (6 * 60 * 60 * 1000));
        return shifted.toISOString().split('T')[0];
    };

    const { questionRecords } = useAppStore();

    const processedData = useMemo(() => {
        const dateMap: Record<string, { sessions: ExamSession[], totalSeconds: number, totalQuestions: number }> = {};

        // Add ExamSessions (Mock Exams)
        sessions.forEach(s => {
            const d = getStudyDate(s.date);
            if (!dateMap[d]) dateMap[d] = { sessions: [], totalSeconds: 0, totalQuestions: 0 };
            dateMap[d].sessions.push(s);
            // We'll skip adding to totalSeconds here to avoid double counting with QuestionRecords if they overlap
            // Actually, let's just use QuestionRecords as the primary source for time/counts if they exist.
        });

        // Add QuestionRecords (All modes)
        questionRecords.forEach(r => {
            const d = new Date(r.startedAt).toISOString().split('T')[0];
            if (!dateMap[d]) dateMap[d] = { sessions: [], totalSeconds: 0, totalQuestions: 0 };
            dateMap[d].totalSeconds += (r.durationMs / 1000);
            dateMap[d].totalQuestions += 1;
        });

        const sortedDates = Object.keys(dateMap).sort((a, b) => b.localeCompare(a));

        const sections: DateSection[] = sortedDates.map(date => ({
            date,
            displayDate: formatDisplayDate(date),
            sessions: dateMap[date].sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
            totalSeconds: dateMap[date].totalSeconds,
            totalQuestions: dateMap[date].totalQuestions,
        }));

        return { dateSections: sections };
    }, [sessions, questionRecords]);

    const [selectedAnalysisDate, setSelectedAnalysisDate] = useState<string | null>(null);

    const handleTabChange = (tab: TabType) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveTab(tab);
    };

    const onViewDailyAnalysis = (date: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedAnalysisDate(date);
        setActiveTab('stats');
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

                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={[styles.tabItem, activeTab === 'stats' && styles.activeTabItem]}
                        onPress={() => handleTabChange('stats')}
                    >
                        <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>데이터 분석</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabItem, activeTab === 'history' && styles.activeTabItem]}
                        onPress={() => handleTabChange('history')}
                    >
                        <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>상세 기록</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                >
                    {activeTab === 'stats' ? (
                        <View style={styles.statsView}>
                            <DailyAnalysis
                                selectedDate={selectedAnalysisDate}
                                onDateChange={setSelectedAnalysisDate}
                            />
                        </View>
                    ) : (
                        <View style={styles.historyWrapper}>
                            <HistoryTab
                                sessionsCount={sessions.length}
                                dateSections={processedData.dateSections}
                                onSelectSession={(s) => setSelectedSession(s)}
                                onDeleted={() => loadSessions()}
                                onViewDailyAnalysis={onViewDailyAnalysis}
                            />
                        </View>
                    )}
                </ScrollView>
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
    tabBar: {
        flexDirection: 'row',
        backgroundColor: COLORS.surfaceVariant,
        marginHorizontal: 24,
        borderRadius: 20,
        padding: 4,
        marginBottom: 24,
    },
    tabItem: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 16,
    },
    activeTabItem: {
        backgroundColor: COLORS.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    activeTabText: {
        color: COLORS.text,
    },
    content: { flex: 1 },
    statsView: { paddingHorizontal: 24 },
    historyWrapper: {
        paddingHorizontal: 24,
    },
});
