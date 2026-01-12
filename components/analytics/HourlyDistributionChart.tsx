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

    // Standard thresholds for "high intensity" (100% color)
    // 1 hour a day is a logical maximum for an hourly distribution slot.
    // For 7/30 days, we set the benchmark for "A lot" (darkest blue) 
    // to reflect consistent daily study at that hour.
    const getReferenceMax = () => {
        const days = range === 'today' ? 1 : range === '7days' ? 7 : 30;
        if (mode === 'time') {
            if (range === '7days') {
                // 7일은 4시간이 3단계(2/3) 지점이 되도록 6시간을 기준으로 설정
                return 3600000 * 6;
            }
            // 그 외는 하루 1시간(60분) 기준
            return 3600000 * days;
        } else {
            // 5문제(1/3), 10문제(2/3), 15문제(전체) 기준
            return 15 * days;
        }
    };

    const refMax = getReferenceMax();

    const getIntensityColor = (value: number) => {
        if (value === 0) return 'rgba(0,0,0,0.03)';

        const ratio = value / refMax;
        // 3단계: 시간(40분+), 문제(10개+)
        if (ratio >= 0.66) return COLORS.primary;
        // 2단계: 시간(20분~40분), 문제(5개~10개)
        if (ratio >= 0.33) return COLORS.primary + '80';
        // 1단계: 시간(0~20분), 문제(0~5개)
        return COLORS.primary + '33';
    };

    const getIntensityTextColor = (value: number) => {
        if (value === 0) return COLORS.textMuted;
        const ratio = value / refMax;
        return ratio > 0.33 ? COLORS.white : COLORS.text;
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

    const formatHourlyValueLabel = (val: number) => {
        if (val === 0) return '';
        if (mode === 'time') {
            const totalSeconds = Math.max(0, Math.floor(val / 1000));
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            if (hours > 0) {
                return `${hours}시간`;
            }
            if (minutes > 0) {
                return `${minutes}분`;
            }
            return `${seconds}초`;
        }

        return `${val}문제`;
    };

    return (
        <Card variant="outlined" padding="lg" radius="xxl" style={styles.container}>
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <ThemedText variant="h3">시간대별 분포</ThemedText>
                    <ThemedText variant="caption" color={COLORS.textMuted} style={styles.subtitle}>
                        {hasData ? (
                            selectedHour !== null
                                ? `${selectedHour}시: ${formatValue(data[selectedHour])}`
                                : `${rangeText} ${peakHour}시에 가장 ${mode === 'time' ? '많이 집중했어요' : '많은 문제를 풀었어요'}`
                        ) : '학습 데이터가 없습니다'}
                    </ThemedText>
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
                            <ThemedText variant="caption" color={COLORS.textMuted} style={{ fontWeight: '800' }}>{row.label}</ThemedText>
                        </View>
                        <View style={styles.boxes}>
                            {row.hours.map((h) => {
                                const val = data[h];
                                const isSelected = selectedHour === h;
                                const labelColor = getIntensityTextColor(val);
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
                                        <View style={styles.hourContent}>
                                            <ThemedText
                                                style={[
                                                    styles.hourText,
                                                    { color: labelColor }
                                                ]}
                                            >
                                                {h}
                                            </ThemedText>
                                            <ThemedText
                                                variant="caption"
                                                numberOfLines={1}
                                                adjustsFontSizeToFit
                                                style={[
                                                    styles.hourValue,
                                                    { color: labelColor }
                                                ]}
                                            >
                                                {formatHourlyValueLabel(val)}
                                            </ThemedText>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                ))}
            </View>

            <View style={styles.legend}>
                <ThemedText variant="caption" color={COLORS.textMuted} style={{ fontWeight: '800' }}>
                    {mode === 'time' ? (
                        range === 'today' ? '20분 미만' :
                            range === '7days' ? '3시간 미만' :
                                `${10 * 30 / 60}시간 미만`
                    ) : (
                        `${5 * (range === 'today' ? 1 : range === '7days' ? 7 : 30)}문제 미만`
                    )}
                </ThemedText>
                <View style={styles.legendSteps}>
                    {[0.2, 0.5, 0.8].map((lvl, i) => (
                        <View
                            key={i}
                            style={[
                                styles.legendBox,
                                { backgroundColor: getIntensityColor(lvl * (refMax || 1)) }
                            ]}
                        />
                    ))}
                </View>
                <ThemedText variant="caption" color={COLORS.textMuted} style={{ fontWeight: '800' }}>
                    {mode === 'time' ? (
                        range === 'today' ? '40분 이상' :
                            range === '7days' ? '4시간 이상' :
                                `${20 * 30 / 60}시간 이상`
                    ) : (
                        `${10 * (range === 'today' ? 1 : range === '7days' ? 7 : 30)}문제 이상`
                    )}
                </ThemedText>
            </View>

        </Card>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: SPACING.xxl,
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
    hourContent: {
        alignItems: 'center',
    },
    hourValue: {
        fontSize: 9,
        fontWeight: '700',
        marginTop: 1,
        width: '90%',
        textAlign: 'center',
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
});
