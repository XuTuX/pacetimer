import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { BottleneckQuestion } from '../../lib/analytics';
import { COLORS } from '../../lib/theme';
import { formatClockTime, formatDisplayDate } from '../../lib/studyDate';

function formatMMSS(ms: number) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type Props = {
    averageMs: number;
    items: BottleneckQuestion[];
    nowMs: number;
};

export default function BottleneckList({ averageMs, items, nowMs }: Props) {
    return (
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>병목 문항</Text>
                <View style={styles.badge}>
                    <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.badgeText}>평균 {formatMMSS(averageMs)}</Text>
                </View>
            </View>

            {items.length === 0 ? (
                <View style={styles.empty}>
                    <Ionicons name="flash-outline" size={28} color={COLORS.border} />
                    <Text style={styles.emptyText}>이번 주에는 큰 병목이 없어요.</Text>
                </View>
            ) : (
                <View style={styles.list}>
                    {items.map((q) => (
                        <View key={q.id} style={styles.row}>
                            <View style={styles.rowTop}>
                                <Text style={styles.subject} numberOfLines={1}>{q.subjectName}</Text>
                                <Text style={styles.duration}>{formatMMSS(q.durationMs)}</Text>
                            </View>
                            <View style={styles.rowBottom}>
                                <Text style={styles.meta}>
                                    {formatDisplayDate(q.studyDate, nowMs)} · {formatClockTime(q.startedAt)}
                                </Text>
                                <Text style={styles.delta}>+{formatMMSS(q.overAvgMs)}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}
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
        gap: 14,
    },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 16, fontWeight: '900', color: COLORS.text },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: COLORS.surfaceVariant },
    badgeText: { fontSize: 12, fontWeight: '800', color: COLORS.textMuted },

    empty: { paddingVertical: 18, alignItems: 'center', gap: 10 },
    emptyText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },

    list: { gap: 12 },
    row: { backgroundColor: COLORS.bg, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 6 },
    rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
    subject: { flex: 1, fontSize: 13, fontWeight: '900', color: COLORS.text },
    duration: { fontSize: 13, fontWeight: '900', color: COLORS.text, fontVariant: ['tabular-nums'] },
    rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    meta: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
    delta: { fontSize: 12, fontWeight: '900', color: COLORS.accent, fontVariant: ['tabular-nums'] },
});

