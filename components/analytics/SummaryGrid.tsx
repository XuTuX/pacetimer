import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AnalyticsSnapshot } from '../../lib/analytics';
import { COLORS } from '../../lib/theme';
import { formatDurationMs } from '../../lib/studyDate';

type CardProps = {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    sub?: string;
};

function SummaryCard({ icon, label, value, sub }: CardProps) {
    return (
        <View style={styles.card}>
            <View style={styles.cardTop}>
                <View style={styles.iconCircle}>
                    <Ionicons name={icon} size={16} color={COLORS.primary} />
                </View>
                <Text style={styles.cardLabel}>{label}</Text>
            </View>
            <Text style={styles.cardValue}>{value}</Text>
            {!!sub && <Text style={styles.cardSub}>{sub}</Text>}
        </View>
    );
}

type Props = {
    snapshot: AnalyticsSnapshot;
};

export default function SummaryGrid({ snapshot }: Props) {
    return (
        <View style={styles.container}>
            <View style={styles.row}>
                <SummaryCard
                    icon="sunny-outline"
                    label="오늘 문제풀이"
                    value={formatDurationMs(snapshot.today.durationMs)}
                    sub={`${snapshot.today.questionCount}문항`}
                />
                <SummaryCard
                    icon="calendar-outline"
                    label="7일 문제풀이"
                    value={formatDurationMs(snapshot.week.durationMs)}
                    sub={`${snapshot.week.questionCount}문항`}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { gap: 12 },
    row: { flexDirection: 'row', gap: 12 },
    card: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 10,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardLabel: { fontSize: 12, fontWeight: '800', color: COLORS.textMuted },
    cardValue: { fontSize: 16, fontWeight: '900', color: COLORS.text },
    cardSub: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
});
