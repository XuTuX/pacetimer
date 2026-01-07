import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DailyAnalysis from '../../components/DailyAnalysis';
import HistoryTab from '../../components/HistoryTab';
import { ExamSession, getSessions } from '../../lib/storage';
import { COLORS } from '../../lib/theme';

type DateSection = {
    date: string;
    displayDate: string;
    sessions: ExamSession[];
};

export default function MyPageScreen() {
    const { signOut, userId } = useAuth();
    const router = useRouter();
    const [sessions, setSessions] = useState<ExamSession[]>([]);
    const [settingsOpen, setSettingsOpen] = useState(false);

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

    const processed = useMemo(() => {
        if (sessions.length === 0) return { dateSections: [] };
        const dateMap: Record<string, ExamSession[]> = {};
        sessions.forEach(s => {
            const d = getStudyDate(s.date);
            if (!dateMap[d]) dateMap[d] = [];
            dateMap[d].push(s);
        });
        const sortedDates = Object.keys(dateMap).sort((a, b) => b.localeCompare(a));

        const dateSections: DateSection[] = sortedDates.map(date => ({
            date,
            displayDate: formatDisplayDate(date),
            sessions: dateMap[date].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        }));

        return { dateSections };
    }, [sessions]);

    const handleSignOut = async () => {
        try {
            await signOut();
            router.replace('/auth/login');
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>마이페이지</Text>
                    <Text style={styles.userIdText}>{userId || 'Guest User'}</Text>
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

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={styles.summaryCard}>
                    <View style={styles.summaryInfo}>
                        <Text style={styles.summaryLabel}>학습 현황</Text>
                        <Text style={styles.summaryValue}>
                            총 <Text style={styles.highlight}>{sessions.length}</Text>개의 세션 완료
                        </Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>학습 데이터 분석</Text>
                    </View>
                    <DailyAnalysis />
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>상세 기록</Text>
                    </View>
                    <HistoryTab
                        sessionsCount={sessions.length}
                        dateSections={processed.dateSections}
                        onSelectSession={() => { }}
                        onDeleted={() => loadSessions()}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 20,
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.text,
    },
    userIdText: {
        fontSize: 13,
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
        top: 74,
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
    summaryCard: {
        backgroundColor: COLORS.white,
        marginHorizontal: 24,
        borderRadius: 32,
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: COLORS.border,
        marginVertical: 12,
    },
    summaryInfo: { gap: 4 },
    summaryLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textMuted,
        textTransform: 'uppercase',
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
    },
    highlight: { color: COLORS.primary },
    section: {
        marginTop: 24,
        paddingHorizontal: 24,
    },
    sectionHeader: {
        marginBottom: 16,
        marginLeft: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
    },
});

