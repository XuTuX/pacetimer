import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { DateRange } from '../../lib/analytics-utils';
import { COLORS, RADIUS, SPACING } from '../../lib/theme';
import { Card } from '../ui/Card';
import { ThemedText } from '../ui/ThemedText';

interface Props {
    data: { date: string; durationMs: number }[];
    range: DateRange;
}

export const DailyActivityChart: React.FC<Props> = ({ data, range }) => {
    if (range === 'today') return null;

    const max = Math.max(...data.map(d => d.durationMs), 0);
    const hasData = max > 0;

    const getIntensityColor = (value: number) => {
        if (value === 0) return 'rgba(0,0,0,0.03)';
        const ratio = value / max;
        if (ratio > 0.8) return COLORS.primary;
        if (ratio > 0.5) return COLORS.primary + 'CC';
        if (ratio > 0.2) return COLORS.primary + '80';
        return COLORS.primary + '33';
    };

    const render7Days = () => (
        <View style={styles.days7Container}>
            {data.map((item, i) => {
                const dayLabel = item.date.slice(-2);
                return (
                    <View key={item.date} style={styles.dayColumn}>
                        <View
                            style={[
                                styles.dayBox,
                                { backgroundColor: getIntensityColor(item.durationMs) }
                            ]}
                        />
                        <ThemedText variant="caption" color={COLORS.textMuted} style={{ fontWeight: '700' }}>
                            {dayLabel}일
                        </ThemedText>
                    </View>
                );
            })}
        </View>
    );

    const render30Days = () => (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days30Container}>
            {data.map((item, i) => {
                const isFirstOfMonth = item.date.endsWith('01');
                return (
                    <View key={item.date} style={styles.dayColumnMini}>
                        <View
                            style={[
                                styles.dayBoxMini,
                                { backgroundColor: getIntensityColor(item.durationMs) }
                            ]}
                        />
                        {(i % 5 === 0 || isFirstOfMonth) && (
                            <ThemedText variant="caption" color={COLORS.textMuted} style={styles.dayLabelMini}>
                                {item.date.slice(-2)}
                            </ThemedText>
                        )}
                    </View>
                );
            })}
        </ScrollView>
    );

    return (
        <Card variant="outlined" padding="lg" radius="xxl" style={styles.container}>
            <View style={styles.header}>
                <ThemedText variant="h3">{range === '7days' ? '최근 7일 활동' : '최근 30일 활동'}</ThemedText>
            </View>

            {range === '7days' ? render7Days() : render30Days()}

            <View style={styles.legend}>
                <ThemedText variant="caption" color={COLORS.textMuted} style={{ fontWeight: '700' }}>적음</ThemedText>
                <View style={styles.legendSteps}>
                    {[0, 0.2, 0.5, 0.9].map((lvl, i) => (
                        <View
                            key={i}
                            style={[
                                styles.legendBox,
                                { backgroundColor: getIntensityColor(lvl * max || (i === 0 ? 0 : 1)) }
                            ]}
                        />
                    ))}
                </View>
                <ThemedText variant="caption" color={COLORS.textMuted} style={{ fontWeight: '700' }}>많음</ThemedText>
            </View>
        </Card>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: SPACING.xxl,
    },
    header: {
        marginBottom: SPACING.lg,
    },
    days7Container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
    },
    dayColumn: {
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    dayBox: {
        width: '80%',
        aspectRatio: 1,
        borderRadius: RADIUS.sm,
    },
    days30Container: {
        flexDirection: 'row',
        gap: 6,
        paddingVertical: 10,
    },
    dayColumnMini: {
        alignItems: 'center',
        gap: 4,
        width: 20,
    },
    dayBoxMini: {
        width: 20,
        height: 20,
        borderRadius: 4,
    },
    dayLabelMini: {
        fontSize: 10,
        position: 'absolute',
        top: 24,
        fontWeight: '700',
    },
    legend: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: SPACING.xl,
        gap: 8,
    },
    legendSteps: {
        flexDirection: 'row',
        gap: 4,
    },
    legendBox: {
        width: 12,
        height: 12,
        borderRadius: 3,
    },
});
