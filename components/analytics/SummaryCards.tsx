import React from 'react';
import { StyleSheet, View } from 'react-native';
import { formatHMS } from '../../lib/studyDate';
import { COLORS, SPACING } from '../../lib/theme';
import { Card } from '../ui/Card';
import { ThemedText } from '../ui/ThemedText';

interface Props {
    totalDurationMs: number;
    totalQuestionCount: number;
    averageQuestionDurationMs: number;
}

function formatMMSS(ms: number) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const SummaryCards: React.FC<Props> = ({
    totalDurationMs,
    totalQuestionCount,
    averageQuestionDurationMs,
}) => {
    return (
        <View style={styles.container}>
            <Card variant="elevated" padding="xl" radius="xxl" style={styles.mainCard}>
                <ThemedText variant="caption" color={COLORS.textMuted} style={[styles.label, { fontWeight: '800' }]}>총 공부시간</ThemedText>
                <View style={styles.mainValueRow}>
                    <ThemedText style={styles.mainValue}>{formatHMS(totalDurationMs)}</ThemedText>
                </View>

                <View style={styles.divider} />

                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <ThemedText variant="label" color={COLORS.textMuted} style={styles.statLabel}>문항 수</ThemedText>
                        <ThemedText variant="h3">{totalQuestionCount.toLocaleString('ko-KR')}<ThemedText variant="caption" color={COLORS.textMuted}> 문제</ThemedText></ThemedText>
                    </View>
                    <View style={styles.verticalDivider} />
                    <View style={styles.statItem}>
                        <ThemedText variant="label" color={COLORS.textMuted} style={styles.statLabel}>문항당 평균</ThemedText>
                        <ThemedText variant="h3">{formatMMSS(averageQuestionDurationMs)}</ThemedText>
                    </View>
                </View>
            </Card>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: SPACING.xxl,
    },
    mainCard: {
        backgroundColor: COLORS.white,
    },
    label: {
        marginBottom: SPACING.xs,
    },
    mainValueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: SPACING.sm,
    },
    mainValue: {
        fontSize: 32,
        fontWeight: '900',
        color: COLORS.text,
    },
    secondaryValue: {
        fontSize: 14,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: SPACING.xl,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statItem: {
        flex: 1,
    },
    statLabel: {
        marginBottom: 4,
    },
    verticalDivider: {
        width: 1,
        height: 24,
        backgroundColor: COLORS.border,
        marginHorizontal: SPACING.lg,
    },
});
