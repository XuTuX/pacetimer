import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import HistoryTab from '../../components/HistoryTab';
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

export default function HistoryScreen() {
    const { signOut, userId } = useAuth();
    const router = useRouter();
    const [sessions, setSessions] = useState<ExamSession[]>([]);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const insets = useSafeAreaInsets();
    const { questionRecords } = useAppStore();

    const getStudyDate = (timestamp: number | string | Date) => {
        const d = new Date(timestamp);
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

    const loadSessions = useCallback(async () => {
        const data = await getSessions();
        setSessions(data);
    }, []);

    useFocusEffect(useCallback(() => { loadSessions(); }, [loadSessions]));

    const processedData = useMemo(() => {
        const dateMap: Record<string, { sessions: ExamSession[], totalSeconds: number, totalQuestions: number }> = {};

        sessions.forEach(s => {
            const d = getStudyDate(s.date);
            if (!dateMap[d]) dateMap[d] = { sessions: [], totalSeconds: 0, totalQuestions: 0 };
            dateMap[d].sessions.push(s);
        });

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

        return sections;
    }, [sessions, questionRecords]);

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
                        <Text style={styles.headerTitle}>학습 기록</Text>
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

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
                    <View style={styles.historyWrapper}>
                        <HistoryTab
                            sessionsCount={sessions.length}
                            dateSections={processedData}
                            onDeleted={() => loadSessions()}
                            onViewDailyAnalysis={(date) => {
                                // Navigate to Analysis tab with date would be nice, but for now just console log
                                // router.push({ pathname: '/analysis', params: { date } });
                            }}
                        />
                    </View>
                </ScrollView>
            </SafeAreaView>
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
    content: { flex: 1 },
    historyWrapper: {
        paddingHorizontal: 24,
        paddingTop: 16,
    },
});
