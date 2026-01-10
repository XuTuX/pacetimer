import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../lib/theme';

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
                <Text style={styles.label}>{label}</Text>
                <View style={styles.values}>
                    <Text style={[styles.value, styles.myValue]}>{myValue}</Text>
                    <Text style={styles.valueMuted}> / avg {avgValue}</Text>
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
                    <Text style={[styles.diffText, { color: barColor }]}>
                        {isFaster ? '-' : '+'}{Math.abs(diffPercent).toFixed(0)}%
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text,
    },
    values: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    value: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text,
        fontVariant: ['tabular-nums'],
    },
    myValue: {
        color: COLORS.primary,
    },
    valueMuted: {
        fontSize: 12,
        color: COLORS.textMuted,
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
    diffText: {
        fontSize: 11,
        fontWeight: '700',
    },
});
