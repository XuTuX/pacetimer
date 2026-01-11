import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { DateRange } from '../../lib/analytics-utils';
import { formatDurationMs } from '../../lib/studyDate';
import { COLORS, RADIUS, SPACING } from '../../lib/theme';
import { Card } from '../ui/Card';
import { ThemedText } from '../ui/ThemedText';

interface Props {
    hourlyDuration: number[]; // 24 values (ms)
    hourlyQuestions: number[]; // 24 values (counts)
    range: DateRange;
}

export const HourlyDistributionChart: React.FC<Props> = ({ hourlyDuration, hourlyQuestions, range }) => {
    const [mode, setMode] = useState<'time' | 'questions'>('time');
    const [selectedHour, setSelectedHour] = useState<number | null>(null);

    const data = mode === 'time' ? hourlyDuration : hourlyQuestions;
    const max = Math.max(...data, 0);
    const hasData = max > 0;

    const getIntensityColor = (value: number) => {
        if (value === 0) return 'rgba(0,0,0,0.03)';
        if (max === 0) return 'rgba(0,0,0,0.03)';

        const ratio = value / max;
        if (ratio > 0.8) return COLORS.primary;
        if (ratio > 0.5) return COLORS.primary + 'CC'; // 80%
        if (ratio > 0.2) return COLORS.primary + '80'; // 50%
        return COLORS.primary + '33'; // 20%
    };

    const getIntensityTextColor = (value: number) => {
        if (value === 0) return COLORS.textMuted;
        const ratio = value / max;
        return ratio > 0.5 ? COLORS.white : COLORS.text;
    };

    const gridData = [
        { label: '새벽', hours: [0, 1, 2, 3, 4, 5] },
        { label: '오전', hours: [6, 7, 8, 9, 10, 11] },
        { label: '오후', hours: [12, 13, 14, 15, 16, 17] },
        { label: '저녁', hours: [18, 19, 20, 21, 22, 23] },
    ];

    const rangeText = range === 'today' ? '오늘' : range === '7days' ? '최근 7일' : '최근 30일';
    const peakHour = data.indexOf(max);

    const formatValue = (val: number) => {
        if (mode === 'time') return formatDurationMs(val);
        return `${val}문제`;
    };

    return (
        <Card variant="outlined" padding="lg" radius="xxl" style={styles.container}>
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <ThemedText variant="h3">시간대별 분포</ThemedText>
                    {hasData && (
                        <ThemedText variant="caption" color={COLORS.textMuted} style={styles.subtitle}>
                            {selectedHour !== null
                                ? `${selectedHour}시: ${formatValue(data[selectedHour])}`
                                : `${rangeText} ${peakHour}시에 가장 ${mode === 'time' ? '많이 집중했어요' : '많은 문제를 풀었어요'}`
                            }
                        </ThemedText>
                    )}
                </View>
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleButton, mode === 'time' && styles.toggleButtonActive]}
                        onPress={() => {
                            setMode('time');
                            setSelectedHour(null);
                        }}
                    >
                        <ThemedText variant="label" color={mode === 'time' ? COLORS.primary : COLORS.textMuted}>시간</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleButton, mode === 'questions' && styles.toggleButtonActive]}
                        onPress={() => {
                            setMode('questions');
                            setSelectedHour(null);
                        }}
                    >
                        <ThemedText variant="label" color={mode === 'questions' ? COLORS.primary : COLORS.textMuted}>문제</ThemedText>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.gridContainer}>
                {gridData.map((row, rowIndex) => (
                    <View key={rowIndex} style={styles.row}>
                        <View style={styles.rowLabelContainer}>
                            <ThemedText variant="caption" bold color={COLORS.textMuted}>{row.label}</ThemedText>
                        </View>
                        <View style={styles.boxes}>
                            {row.hours.map((h) => {
                                const val = data[h];
                                const isSelected = selectedHour === h;
                                return (
                                    <TouchableOpacity
                                        key={h}
                                        activeOpacity={0.7}
                                        style={[
                                            styles.box,
                                            { backgroundColor: getIntensityColor(val) },
                                            isSelected && { borderWidth: 2, borderColor: COLORS.primary }
                                        ]}
                                        onPress={() => setSelectedHour(selectedHour === h ? null : h)}
                                    >
                                        <ThemedText
                                            style={[
                                                styles.hourText,
                                                { color: getIntensityTextColor(val) }
                                            ]}
                                        >
                                            {h}
                                        </ThemedText>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                ))}
            </View>

            <View style={styles.legend}>
                <ThemedText variant="caption" color={COLORS.textMuted} bold>적음</ThemedText>
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
                <ThemedText variant="caption" color={COLORS.textMuted} bold>많음</ThemedText>
            </View>

            {!hasData && (
                <View style={styles.emptyOverlay}>
                    <ThemedText variant="body2" color={COLORS.textMuted} bold>학습 데이터가 없습니다</ThemedText>
                </View>
            )}
        </Card>
    );
};

const styles = StyleSheet.create({
    container: {
        // Handled by Card
    },
    header: {
        marginBottom: SPACING.xl,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    subtitle: {
        marginTop: 4,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.surfaceVariant,
        padding: 4,
        borderRadius: RADIUS.md,
    },
    toggleButton: {
        paddingHorizontal: SPACING.md,
        paddingVertical: 6,
        borderRadius: RADIUS.sm,
    },
    toggleButtonActive: {
        backgroundColor: COLORS.white,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    gridContainer: {
        gap: SPACING.md,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    rowLabelContainer: {
        width: 32,
    },
    boxes: {
        flex: 1,
        flexDirection: 'row',
        gap: 6,
    },
    box: {
        flex: 1,
        aspectRatio: 1,
        borderRadius: RADIUS.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    hourText: {
        fontSize: 10,
        fontWeight: '800',
    },
    legend: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: SPACING.xl,
        gap: SPACING.sm,
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
    emptyOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: RADIUS.xxl,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
});
