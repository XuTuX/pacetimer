import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { COLORS } from '../lib/theme';
import { QuestionRecord } from '../lib/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 48 - 40; // Accounting for padding
const CHART_HEIGHT = 160;
const BAR_GAP = 12;

interface Props {
    records: QuestionRecord[];
}

export function WeeklyTrend({ records }: Props) {
    const weeklyData = useMemo(() => {
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() - (6 - i));
            return d;
        });

        const dayStats = last7Days.map(date => {
            const dayStr = date.toISOString().split('T')[0];
            const ms = records.reduce((acc, r) => {
                const rDate = new Date(r.startedAt);
                const rShifted = new Date(rDate.getTime() - 21600000);
                const rStr = rShifted.toISOString().split('T')[0];
                return rStr === dayStr ? acc + r.durationMs : acc;
            }, 0);
            return {
                label: ['일', '월', '화', '수', '목', '금', '토'][date.getDay()],
                ms,
                isToday: dayStr === new Date(Date.now() - 21600000).toISOString().split('T')[0]
            };
        });

        const maxMs = Math.max(...dayStats.map(d => d.ms), 3600000); // Min 1 hour for scale
        const totalWeeklyMs = dayStats.reduce((acc, d) => acc + d.ms, 0);
        return { dayStats, maxMs, totalWeeklyMs };
    }, [records]);

    const formatTime = (ms: number) => {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        if (h > 0) return `${h}시간 ${m}분`;
        return `${m}분`;
    };

    const barWidth = (CHART_WIDTH - (BAR_GAP * 6)) / 7;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>주간 학습 추이</Text>
            <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                    <View>
                        <Text style={styles.chartSubtitle}>최근 7일간의 학습 시간 변화</Text>
                        <Text style={styles.totalTimeLabel}>주간 총 {formatTime(weeklyData.totalWeeklyMs)}</Text>
                    </View>
                </View>

                <View style={styles.svgWrapper}>
                    <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
                        {/* Horizontal Grid Lines */}
                        {[0, 0.5, 1].map((level, i) => (
                            <Line
                                key={i}
                                x1="0"
                                y1={CHART_HEIGHT - (level * (CHART_HEIGHT - 30)) - 30}
                                x2={CHART_WIDTH}
                                y2={CHART_HEIGHT - (level * (CHART_HEIGHT - 30)) - 30}
                                stroke={COLORS.border}
                                strokeWidth="1"
                                strokeDasharray="4 4"
                            />
                        ))}

                        {weeklyData.dayStats.map((day, i) => {
                            const barHeight = (day.ms / weeklyData.maxMs) * (CHART_HEIGHT - 60);
                            const x = i * (barWidth + BAR_GAP);
                            const y = CHART_HEIGHT - barHeight - 30;

                            return (
                                <G key={i}>
                                    <Rect
                                        x={x}
                                        y={y}
                                        width={barWidth}
                                        height={barHeight}
                                        rx={barWidth / 2}
                                        fill={day.isToday ? COLORS.primary : COLORS.border}
                                    />
                                    <SvgText
                                        x={x + barWidth / 2}
                                        y={CHART_HEIGHT - 10}
                                        fontSize="11"
                                        fontWeight="700"
                                        fill={day.isToday ? COLORS.primary : COLORS.textMuted}
                                        textAnchor="middle"
                                    >
                                        {day.label}
                                    </SvgText>
                                </G>
                            );
                        })}
                    </Svg>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 32,
        paddingHorizontal: 4,
    },
    title: {
        fontSize: 19,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 16,
    },
    chartCard: {
        backgroundColor: COLORS.white,
        borderRadius: 32,
        padding: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.04,
        shadowRadius: 20,
        elevation: 5,
    },
    chartHeader: {
        marginBottom: 20,
    },
    chartSubtitle: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    totalTimeLabel: {
        fontSize: 20,
        fontWeight: '900',
        color: COLORS.text,
        marginTop: 4,
    },
    svgWrapper: {
        alignItems: 'center',
    }
});
