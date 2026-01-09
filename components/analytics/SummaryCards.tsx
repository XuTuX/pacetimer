import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatDurationMs } from '../../lib/studyDate';
import { COLORS } from '../../lib/theme';

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
            <View style={styles.card}>
                <Text style={styles.label}>총 공부시간</Text>
                <Text style={styles.value}>{formatDurationMs(totalDurationMs)}</Text>
            </View>
            <View style={styles.row}>
                <View style={[styles.card, { flex: 1 }]}>
                    <Text style={styles.label}>총 해결 문항</Text>
                    <Text style={styles.value}>{totalQuestionCount}개</Text>
                </View>
                <View style={[styles.card, { flex: 1 }]}>
                    <Text style={styles.label}>문항당 평균</Text>
                    <Text style={styles.value}>{formatMMSS(averageQuestionDurationMs)}</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 24,
        gap: 12,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textMuted,
        marginBottom: 8,
    },
    value: {
        fontSize: 22,
        fontWeight: '900',
        color: COLORS.text,
        fontVariant: ['tabular-nums'],
    },
});
