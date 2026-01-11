import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnalyticsHeader } from '../../components/analytics/AnalyticsHeader';
import { DailyActivityChart } from '../../components/analytics/DailyActivityChart';
import { HourlyDistributionChart } from '../../components/analytics/HourlyDistributionChart';
import { SummaryCards } from '../../components/analytics/SummaryCards';
import { DateRange, processAnalytics, SubjectFilter } from '../../lib/analytics-utils';
import { useAppStore } from '../../lib/store';
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



    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <StatusBar barStyle="dark-content" />
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>학습 분석</Text>
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

                        <DailyActivityChart
                            data={analytics.dailyDistribution}
                            range={range}
                        />

                        <HourlyDistributionChart
                            hourlyDuration={analytics.hourlyDistribution}
                            hourlyQuestions={analytics.hourlyQuestionDistribution}
                            range={range}
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
    content: { flex: 1 },
    sections: {
        paddingTop: 12,
        gap: 20,
    },
});
