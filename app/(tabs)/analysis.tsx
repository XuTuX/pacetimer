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
import { AnalyticsHeader } from '../../components/analytics/AnalyticsHeader';
import { DayTimeline } from '../../components/analytics/DayTimeline';
import { HourlyDistributionChart } from '../../components/analytics/HourlyDistributionChart';
import { SummaryCards } from '../../components/analytics/SummaryCards';
import { DateRange, processAnalytics, SubjectFilter } from '../../lib/analytics-utils';
import { useAppStore } from '../../lib/store';
import { getStudyDateKey } from '../../lib/studyDate';
import { COLORS } from '../../lib/theme';

export default function AnalysisScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { sessions, segments, questionRecords, subjects } = useAppStore();

    const [nowMs, setNowMs] = useState(Date.now());
    const [range, setRange] = useState<DateRange>('today');
    const [filter, setFilter] = useState<SubjectFilter>('all');

    useFocusEffect(useCallback(() => {
        setNowMs(Date.now());
        const id = setInterval(() => setNowMs(Date.now()), 60000);
        return () => clearInterval(id);
    }, []));

    const analytics = useMemo(() =>
        processAnalytics(sessions, segments, questionRecords, range, filter, nowMs),
        [sessions, segments, questionRecords, range, filter, nowMs]);

    const handleViewInHistory = (date: string) => {
        // Deep link to history with date search param
        router.push({
            pathname: '/history',
            params: { date }
        });
    };

    const rangeLabel = useMemo(() => {
        const today = getStudyDateKey(nowMs);
        if (range === 'today') return `오늘 (${today})`;

        const days = range === '7days' ? 7 : 30;
        const startDate = getStudyDateKey(nowMs - (days - 1) * 24 * 60 * 60 * 1000);
        return `${range === '7days' ? '최근 7일' : '최근 30일'} (${startDate} ~ ${today})`;
    }, [range, nowMs]);

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <StatusBar barStyle="dark-content" />
                <View style={styles.header}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>학습 분석</Text>
                        <Text style={styles.rangeLabel}>{rangeLabel}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.historyAction}
                        onPress={() => handleViewInHistory(analytics.representativeDay)}
                    >
                        <Text style={styles.historyActionText}>상세 기록</Text>
                        <Ionicons name="chevron-forward" size={12} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>

                <AnalyticsHeader
                    selectedRange={range}
                    onRangeChange={setRange}
                    selectedFilter={filter}
                    onFilterChange={setFilter}
                    subjects={subjects}
                />

                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                >
                    <View style={styles.sections}>
                        <SummaryCards
                            totalDurationMs={analytics.totalDurationMs}
                            totalQuestionCount={analytics.totalQuestionCount}
                            averageQuestionDurationMs={analytics.averageQuestionDurationMs}
                        />

                        <HourlyDistributionChart data={analytics.hourlyDistribution} />

                        <DayTimeline
                            date={analytics.representativeDay}
                            sessions={analytics.timelineSessions}
                            segments={analytics.timelineSegments}
                            questions={analytics.timelineQuestions}
                            subjects={subjects}
                            onViewHistory={handleViewInHistory}
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
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 8,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.text,
    },
    rangeLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textMuted,
        marginTop: 4,
    },
    historyAction: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    historyActionText: {
        fontSize: 13,
        fontWeight: '800',
        color: COLORS.primary,
        marginRight: 4,
    },
    content: { flex: 1 },
    sections: {
        paddingTop: 12,
        gap: 20,
    },
});
