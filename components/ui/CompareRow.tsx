import React from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORS, SPACING } from '../../lib/theme';
import { Typography } from './Typography';

interface CompareRowProps {
    label: string;
    myValue: string;
    avgValue: string;
    isFaster: boolean;
    diffPercent?: number; // e.g., 20 means 20% faster/slower
}

export function CompareRow({ label, myValue, avgValue, isFaster, diffPercent = 0 }: CompareRowProps) {
    // Cap diff at 100% for visual bar
    const barWidth = Math.min(Math.abs(diffPercent), 100);
    const barColor = isFaster ? COLORS.primary : COLORS.error;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Typography.Subtitle2 bold>{label}</Typography.Subtitle2>
                <View style={styles.values}>
                    <Typography.Body2 bold color={COLORS.primary}>{myValue}</Typography.Body2>
                    <Typography.Caption color={COLORS.textMuted}> / 평균 {avgValue}</Typography.Caption>
                </View>
            </View>

            <View style={styles.visualContainer}>
                {/* Center Line */}
                <View style={styles.centerLine} />

                {/* Visual Bar */}
                <View style={[
                    styles.barContainer,
                    isFaster ? styles.alignRight : styles.alignLeft
                ]}>
                    <View style={[
                        styles.bar,
                        { width: `${Math.max(barWidth, 5)}%`, backgroundColor: barColor }
                    ]} />
                    <Typography.Label bold color={barColor}>
                        {isFaster ? '-' : '+'}{Math.abs(diffPercent).toFixed(0)}%
                    </Typography.Label>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.xs,
    },
    values: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    visualContainer: {
        height: 24,
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
    },
    centerLine: {
        position: 'absolute',
        left: '50%',
        width: 1,
        height: '100%',
        backgroundColor: COLORS.border,
        zIndex: 1,
    },
    barContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    alignRight: {
        justifyContent: 'flex-end',
        paddingRight: '50%',
        flexDirection: 'row',
    },
    alignLeft: {
        justifyContent: 'flex-start',
        paddingLeft: '50%',
        flexDirection: 'row-reverse',
    },
    bar: {
        height: 8,
        borderRadius: 4,
    },
});
