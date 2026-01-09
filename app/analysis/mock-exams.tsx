import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MockExamSection from '../../components/analytics/MockExamSection';
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

export default function MockExamAnalysisScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { sessions, segments, questionRecords, subjects } = useAppStore();
    const [nowMs, setNowMs] = useState(Date.now());

    useFocusEffect(useCallback(() => {
        const id = setInterval(() => setNowMs(Date.now()), 30000);
        return () => clearInterval(id);
    }, []));

    const snapshot = useMemo(
        () => buildAnalyticsSnapshot({ sessions, segments, questionRecords, subjects, nowMs, dailyDays: 14 }),
        [sessions, segments, questionRecords, subjects, nowMs]
    );

    const week = snapshot.mockExam.week;
    const avgMs = week.questionCount > 0 ? Math.round(week.durationMs / week.questionCount) : 0;

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <StatusBar barStyle="dark-content" />
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={22} color={COLORS.text} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>모의고사 분석</Text>
                        <Text style={styles.headerSub}>최근 7일 · 모의고사만</Text>
                    </View>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{
                        paddingHorizontal: 24,
                        paddingTop: 16,
                        paddingBottom: insets.bottom + 40,
                        gap: 18,
                    }}
                >
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryHeader}>
                            <Text style={styles.summaryTitle}>최근 7일 요약</Text>
                            <View style={styles.pill}>
                                <Ionicons name="school-outline" size={14} color={COLORS.primary} />
                                <Text style={styles.pillText}>{week.sessionCount}회</Text>
                            </View>
                        </View>

                        {week.sessionCount === 0 ? (
                            <View style={styles.empty}>
                                <Ionicons name="clipboard-outline" size={28} color={COLORS.border} />
                                <Text style={styles.emptyText}>최근 7일에는 모의고사 기록이 없어요.</Text>
                            </View>
                        ) : (
                            <View style={styles.metricsRow}>
                                <View style={styles.metric}>
                                    <Text style={styles.metricLabel}>총 시간</Text>
                                    <Text style={styles.metricValue}>{formatDurationMs(week.durationMs)}</Text>
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.metric}>
                                    <Text style={styles.metricLabel}>문항</Text>
                                    <Text style={styles.metricValue}>{week.questionCount}개</Text>
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.metric}>
                                    <Text style={styles.metricLabel}>평균</Text>
                                    <Text style={styles.metricValue}>{formatMMSS(avgMs)}</Text>
                                </View>
                            </View>
                        )}
                    </View>

                    <MockExamSection nowMs={nowMs} week={week} recent={snapshot.mockExam.recent} latest={snapshot.mockExam.latest} />
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
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: COLORS.text,
    },
    headerSub: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textMuted,
        marginTop: 2,
    },
    content: { flex: 1 },

    summaryCard: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 14,
    },
    summaryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    summaryTitle: { fontSize: 16, fontWeight: '900', color: COLORS.text },
    pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: COLORS.primaryLight },
    pillText: { fontSize: 12, fontWeight: '900', color: COLORS.primary },

    empty: { paddingVertical: 18, alignItems: 'center', gap: 10 },
    emptyText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },

    metricsRow: { flexDirection: 'row', alignItems: 'center' },
    metric: { flex: 1, alignItems: 'center', gap: 4 },
    metricLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted },
    metricValue: { fontSize: 13, fontWeight: '900', color: COLORS.text, fontVariant: ['tabular-nums'] },
    divider: { width: 1, height: 24, backgroundColor: COLORS.border },
});

