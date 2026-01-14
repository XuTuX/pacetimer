import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";
import { formatShortDuration } from "../../lib/insights";
import { COLORS, RADIUS, SPACING } from "../../lib/theme";
import { Typography } from "../ui/Typography";

export interface QuestionBarData {
    questionNo: number;
    myDurationMs: number;
    roomAvgMs: number;
    roomMedianMs: number;
    zScore: number;
    percentile: number;
    highlight: 'slow' | 'fast' | 'common_hard' | 'best' | 'skipped' | null;
}

interface QuestionBarProps {
    data: QuestionBarData;
    maxDuration: number;
    showMedian?: boolean;
}

const HIGHLIGHT_CONFIG = {
    slow: {
        bg: '#FEF2F2',
        border: '#FCA5A5',
        icon: 'arrow-up' as const,
        iconColor: '#EF4444',
        label: '느림',
        labelColor: '#DC2626',
    },
    fast: {
        bg: '#F0FDF4',
        border: '#86EFAC',
        icon: 'arrow-down' as const,
        iconColor: '#10B981',
        label: '빠름',
        labelColor: '#059669',
    },
    common_hard: {
        bg: '#FFFBEB',
        border: '#FCD34D',
        icon: 'people' as const,
        iconColor: '#F59E0B',
        label: '공통 어려움',
        labelColor: '#D97706',
    },
    best: {
        bg: '#EDE9FE',
        border: '#C4B5FD',
        icon: 'star' as const,
        iconColor: '#8B5CF6',
        label: '최고 기록',
        labelColor: '#7C3AED',
    },
    skipped: {
        bg: '#EEF2FF',
        border: '#A5B4FC',
        icon: 'time-outline' as const,
        iconColor: '#6366F1',
        label: '시간 부족',
        labelColor: '#4F46E5',
    },
};

export function QuestionBar({ data, maxDuration, showMedian = true }: QuestionBarProps) {
    const { questionNo, myDurationMs, roomAvgMs, roomMedianMs, highlight } = data;

    const myBarWidth = Math.max(5, (myDurationMs / maxDuration) * 100);
    const refValue = showMedian ? roomMedianMs : roomAvgMs;
    const refPosition = Math.min(95, (refValue / maxDuration) * 100);

    const config = highlight ? HIGHLIGHT_CONFIG[highlight] : null;
    const diffMs = myDurationMs - refValue;
    const diffPercent = refValue > 0 ? Math.round((diffMs / refValue) * 100) : 0;

    return (
        <View style={[
            styles.container,
            config && { backgroundColor: config.bg, borderColor: config.border }
        ]}>
            <View style={styles.header}>
                <View style={styles.labelRow}>
                    <Typography.Body2 bold color={COLORS.text}>
                        문제 {questionNo}
                    </Typography.Body2>
                    {config && (
                        <View style={[styles.badge, { backgroundColor: `${config.iconColor}20` }]}>
                            <Ionicons name={config.icon} size={10} color={config.iconColor} />
                            <Typography.Label color={config.labelColor}>{config.label}</Typography.Label>
                        </View>
                    )}
                </View>
                <View style={styles.timeRow}>
                    {highlight === 'skipped' ? (
                        <Typography.Subtitle2 bold color="#6366F1">
                            —
                        </Typography.Subtitle2>
                    ) : (
                        <>
                            <Typography.Subtitle2 bold color={COLORS.primary}>
                                {formatShortDuration(myDurationMs)}
                            </Typography.Subtitle2>
                            {diffMs !== 0 && (
                                <Typography.Caption color={diffMs > 0 ? '#EF4444' : '#10B981'}>
                                    {diffMs > 0 ? '+' : ''}{formatShortDuration(Math.abs(diffMs))}
                                </Typography.Caption>
                            )}
                        </>
                    )}
                </View>
            </View>

            <View style={styles.barContainer}>
                {/* My bar */}
                <View
                    style={[
                        styles.bar,
                        { width: `${myBarWidth}%` },
                        highlight === 'slow' && styles.barSlow,
                        highlight === 'fast' && styles.barFast,
                        highlight === 'best' && styles.barBest,
                        highlight === 'skipped' && styles.barSkipped,
                    ]}
                />
                {/* Reference line (median/avg) */}
                {refValue > 0 && (
                    <View style={[styles.refLine, { left: `${refPosition}%` }]} />
                )}
            </View>

            <View style={styles.legend}>
                <Typography.Caption color={COLORS.textMuted}>
                    {showMedian ? '중앙값' : '평균'}: {formatShortDuration(refValue)}
                </Typography.Caption>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: RADIUS.full,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
    },
    barContainer: {
        height: 8,
        backgroundColor: COLORS.surfaceVariant,
        borderRadius: 4,
        overflow: 'visible',
        position: 'relative',
    },
    bar: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 4,
    },
    barSlow: {
        backgroundColor: '#EF4444',
    },
    barFast: {
        backgroundColor: '#10B981',
    },
    barBest: {
        backgroundColor: '#8B5CF6',
    },
    barSkipped: {
        backgroundColor: '#6366F1',
    },
    refLine: {
        position: 'absolute',
        top: -4,
        width: 2,
        height: 16,
        backgroundColor: COLORS.textMuted,
        borderRadius: 1,
    },
    legend: {
        marginTop: SPACING.xs,
        alignItems: 'flex-end',
    },
});
