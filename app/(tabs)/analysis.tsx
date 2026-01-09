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
import DailyRhythmChart from '../../components/analytics/DailyRhythmChart';
import SubjectBreakdown from '../../components/analytics/SubjectBreakdown';
import SummaryGrid from '../../components/analytics/SummaryGrid';
import { buildAnalyticsSnapshot } from '../../lib/analytics';
import { useAppStore } from '../../lib/store';
import { COLORS } from '../../lib/theme';
import { formatDurationMs } from '../../lib/studyDate';

function formatMMSS(ms: number) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function AnalysisScreen() {
    const { signOut, userId } = useAuth();
    const router = useRouter();
    const [settingsOpen, setSettingsOpen] = useState(false);
    const insets = useSafeAreaInsets();

    const { sessions, segments, questionRecords, subjects } = useAppStore();
    const [nowMs, setNowMs] = useState(Date.now());

    useFocusEffect(useCallback(() => {
        const id = setInterval(() => setNowMs(Date.now()), 30000);
        return () => clearInterval(id);
    }, []));

    const snapshot = useMemo(() => buildAnalyticsSnapshot({ sessions, segments, questionRecords, subjects, nowMs, dailyDays: 14 }), [sessions, segments, questionRecords, subjects, nowMs]);
    const hasProblemWeekQuestions = snapshot.week.questionCount > 0;

    const openScreen = useCallback((path: Parameters<typeof router.push>[0]) => {
        setSettingsOpen(false);
        router.push(path);
    }, [router]);

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
                        <Text style={styles.headerTitle}>학습 분석</Text>
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
                    <View style={styles.statsView}>
                        <View style={styles.section}>
                            <SummaryGrid snapshot={snapshot} />
                        </View>

                        <View style={styles.section}>
                            <DailyRhythmChart daily={snapshot.daily} title="문제풀이 리듬 (7일)" />
                        </View>

                        <View style={styles.section}>
                            <SubjectBreakdown
                                title="과목별 문제풀이 (7일)"
                                subjects={snapshot.subjectsWeek}
                                maxVisible={5}
                                onPressViewAll={() => openScreen('/analysis/subjects')}
                            />
                        </View>

                        <View style={styles.section}>
                            <TouchableOpacity
                                style={styles.linkCard}
                                onPress={() => openScreen('/analysis/bottlenecks')}
                                activeOpacity={0.9}
                            >
                                <View style={styles.linkHeader}>
                                    <View style={styles.linkTitleRow}>
                                        <View style={styles.linkIconCircle}>
                                            <Ionicons name="time-outline" size={16} color={COLORS.textMuted} />
                                        </View>
                                        <Text style={styles.linkTitle}>병목 문항</Text>
                                    </View>
                                <View style={styles.linkRight}>
                                    <View style={styles.pillNeutral}>
                                        <Text style={styles.pillNeutralText}>
                                            {hasProblemWeekQuestions ? `평균 ${formatMMSS(snapshot.bottlenecksWeek.averageMs)}` : '데이터 없음'}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                                </View>
                            </View>

                                {!hasProblemWeekQuestions ? (
                                    <Text style={styles.linkBodyText}>이번 주 문제풀이 기록이 없어요.</Text>
                                ) : snapshot.bottlenecksWeek.count === 0 ? (
                                    <Text style={styles.linkBodyText}>이번 주에는 평균을 크게 넘긴 문항이 없어요.</Text>
                                ) : (
                                    <Text style={styles.linkBodyText} numberOfLines={2}>
                                        ⚠️ 평균보다 오래 걸린 문항 {snapshot.bottlenecksWeek.count}개 → 문항 분석 보기
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.section}>
                            <TouchableOpacity
                                style={styles.linkCard}
                                onPress={() => openScreen('/analysis/mock-exams')}
                                activeOpacity={0.9}
                            >
                                <View style={styles.linkHeader}>
                                    <View style={styles.linkTitleRow}>
                                        <View style={[styles.linkIconCircle, { backgroundColor: COLORS.primaryLight }]}>
                                            <Ionicons name="school-outline" size={16} color={COLORS.primary} />
                                        </View>
                                        <Text style={styles.linkTitle}>모의고사</Text>
                                    </View>
                                    <View style={styles.linkRight}>
                                        <View style={styles.pillPrimary}>
                                            <Text style={styles.pillPrimaryText}>{snapshot.mockExam.week.sessionCount}회 (7일)</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                                    </View>
                                </View>

                                {snapshot.mockExam.week.sessionCount === 0 ? (
                                    <Text style={styles.linkBodyText}>최근 7일에는 모의고사 기록이 없어요. → 분석 보기</Text>
                                ) : snapshot.mockExam.latest ? (
                                    <Text style={styles.linkBodyText} numberOfLines={2}>
                                        최근: {formatDurationMs(snapshot.mockExam.latest.durationMs)} · {snapshot.mockExam.latest.questionCount}문항 · 평균 {formatMMSS(snapshot.mockExam.latest.questionCount > 0 ? Math.round(snapshot.mockExam.latest.durationMs / snapshot.mockExam.latest.questionCount) : 0)}
                                    </Text>
                                ) : (
                                    <Text style={styles.linkBodyText}>최근 세션 요약을 불러오는 중입니다. → 분석 보기</Text>
                                )}
                            </TouchableOpacity>
                        </View>
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
    statsView: { paddingHorizontal: 24, paddingTop: 16, gap: 18 },
    section: { gap: 12 },

    linkCard: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 12,
    },
    linkHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    linkTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    linkIconCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    linkTitle: { fontSize: 16, fontWeight: '900', color: COLORS.text },
    linkRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    linkBodyText: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, lineHeight: 18 },
    pillNeutral: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: COLORS.surfaceVariant },
    pillNeutralText: { fontSize: 12, fontWeight: '800', color: COLORS.textMuted, fontVariant: ['tabular-nums'] },
    pillPrimary: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: COLORS.primaryLight },
    pillPrimaryText: { fontSize: 12, fontWeight: '900', color: COLORS.primary },
});
