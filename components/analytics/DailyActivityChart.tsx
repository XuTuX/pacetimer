import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DateRange } from '../../lib/analytics-utils';
import { COLORS } from '../../lib/theme';

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
                        <Text style={styles.dayLabel}>{dayLabel}일</Text>
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
                            <Text style={styles.dayLabelMini}>{item.date.slice(-2)}</Text>
                        )}
                    </View>
                );
            })}
        </ScrollView>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{range === '7days' ? '최근 7일 활동' : '최근 30일 활동'}</Text>
            </View>

            {range === '7days' ? render7Days() : render30Days()}

            <View style={styles.legend}>
                <Text style={styles.legendText}>적음</Text>
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
                <Text style={styles.legendText}>많음</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 24,
        padding: 24,
        backgroundColor: COLORS.white,
        borderRadius: 32,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    header: {
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '900',
        color: COLORS.text,
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
        borderRadius: 8,
    },
    dayLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    days30Container: {
        flexDirection: 'row',
        gap: 4,
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
        fontWeight: '700',
        color: COLORS.textMuted,
        position: 'absolute',
        top: 24,
    },
    legend: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 24,
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
    legendText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
});
