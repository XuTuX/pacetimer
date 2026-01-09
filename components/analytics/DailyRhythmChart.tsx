import React, { useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import type { DailyTotal } from '../../lib/analytics';
import { COLORS } from '../../lib/theme';

function formatDayLabel(date: string) {
    const [, m, d] = date.split('-');
    return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
}

type Props = {
    daily: DailyTotal[]; // chronological
    title?: string;
};

export default function DailyRhythmChart({ daily, title = '일간 리듬 (7일)' }: Props) {
    const { width } = useWindowDimensions();
    const data = useMemo(() => daily.slice(-7), [daily]);
    const chartWidth = Math.min(420, width - 48); // matches 24px padding on both sides
    const chartHeight = 110;
    const gap = 8;
    const barWidth = (chartWidth - gap * (data.length - 1)) / data.length;
    const max = Math.max(1, ...data.map((d) => d.durationMs));

    return (
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.sub}>{formatDayLabel(data[0]?.date ?? '')}–{formatDayLabel(data[data.length - 1]?.date ?? '')}</Text>
            </View>

            <View style={styles.chartWrap}>
                <Svg width={chartWidth} height={chartHeight}>
                    {data.map((d, i) => {
                        const h = Math.max(3, Math.round((d.durationMs / max) * chartHeight));
                        const x = i * (barWidth + gap);
                        const y = chartHeight - h;
                        const fill = d.durationMs > 0 ? COLORS.primary : COLORS.border;
                        return (
                            <Rect
                                key={d.date}
                                x={x}
                                y={y}
                                width={barWidth}
                                height={h}
                                rx={8}
                                fill={fill}
                                opacity={d.durationMs > 0 ? 0.9 : 0.5}
                            />
                        );
                    })}
                </Svg>

                <View style={[styles.labelRow, { width: chartWidth }]}>
                    {data.map((d) => (
                        <Text key={d.date} style={styles.dayLabel}>
                            {d.date.slice(8, 10)}
                        </Text>
                    ))}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 12,
    },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    title: { fontSize: 16, fontWeight: '900', color: COLORS.text },
    sub: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
    chartWrap: { alignItems: 'center' },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    dayLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
});

