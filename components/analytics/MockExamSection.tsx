import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { MockExamSessionSummary } from '../../lib/analytics';
import { COLORS } from '../../lib/theme';
import { formatDisplayDate, formatDurationMs } from '../../lib/studyDate';

function formatMMSS(ms: number) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type Props = {
    nowMs: number;
    week: { durationMs: number; questionCount: number; sessionCount: number };
    recent: MockExamSessionSummary[];
    latest?: MockExamSessionSummary;
};

export default function MockExamSection({ nowMs, week, recent, latest }: Props) {
    const avgMs = latest && latest.questionCount > 0 ? Math.round(latest.durationMs / latest.questionCount) : 0;
    const limitMs = latest?.timeLimitSec ? latest.timeLimitSec * 1000 : undefined;

    return (
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>모의고사</Text>
                <View style={styles.pill}>
                    <Ionicons name="school-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.pillText}>{week.sessionCount}회 (7일)</Text>
                </View>
            </View>

            {week.sessionCount === 0 ? (
                <View style={styles.empty}>
                    <Ionicons name="clipboard-outline" size={28} color={COLORS.border} />
                    <Text style={styles.emptyText}>아직 모의고사 기록이 없어요.</Text>
                </View>
            ) : (
                <>
                    {latest && (
                        <View style={styles.latestCard}>
                            <View style={styles.latestTop}>
                                <Text style={styles.latestTitle}>최근 세션</Text>
                                <Text style={styles.latestDate}>{formatDisplayDate(latest.studyDate, nowMs)}</Text>
                            </View>
                            <View style={styles.latestGrid}>
                                <View style={styles.latestItem}>
                                    <Text style={styles.latestLabel}>총 시간</Text>
                                    <Text style={styles.latestValue}>{formatDurationMs(latest.durationMs)}</Text>
                                </View>
                                <View style={styles.latestDivider} />
                                <View style={styles.latestItem}>
                                    <Text style={styles.latestLabel}>문항</Text>
                                    <Text style={styles.latestValue}>{latest.questionCount}개</Text>
                                </View>
                                <View style={styles.latestDivider} />
                                <View style={styles.latestItem}>
                                    <Text style={styles.latestLabel}>평균</Text>
                                    <Text style={styles.latestValue}>{formatMMSS(avgMs)}</Text>
                                </View>
                            </View>
                            {limitMs !== undefined && (
                                <Text style={styles.limitHint}>
                                    제한 {formatDurationMs(limitMs)} · {latest.durationMs <= limitMs ? `${formatDurationMs(limitMs - latest.durationMs)} 남김` : `${formatDurationMs(latest.durationMs - limitMs)} 초과`}
                                </Text>
                            )}
                        </View>
                    )}

                    <View style={styles.recentList}>
                        {recent.slice(0, 4).map((s) => (
                            <View key={s.sessionId} style={styles.recentRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.recentTitle} numberOfLines={1}>{formatDisplayDate(s.studyDate, nowMs)}</Text>
                                    <Text style={styles.recentSub}>{s.questionCount}문항 · 평균 {formatMMSS(s.questionCount > 0 ? Math.round(s.durationMs / s.questionCount) : 0)}</Text>
                                </View>
                                <Text style={styles.recentDuration}>{formatDurationMs(s.durationMs)}</Text>
                            </View>
                        ))}
                    </View>
                </>
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
    pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: COLORS.primaryLight },
    pillText: { fontSize: 12, fontWeight: '900', color: COLORS.primary },

    empty: { paddingVertical: 18, alignItems: 'center', gap: 10 },
    emptyText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },

    latestCard: { backgroundColor: COLORS.bg, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
    latestTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    latestTitle: { fontSize: 13, fontWeight: '900', color: COLORS.text },
    latestDate: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
    latestGrid: { flexDirection: 'row', alignItems: 'center' },
    latestItem: { flex: 1, alignItems: 'center', gap: 4 },
    latestLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted },
    latestValue: { fontSize: 13, fontWeight: '900', color: COLORS.text },
    latestDivider: { width: 1, height: 24, backgroundColor: COLORS.border },
    limitHint: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textAlign: 'center' },

    recentList: { gap: 10 },
    recentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: COLORS.surfaceVariant, padding: 12, borderRadius: 16 },
    recentTitle: { fontSize: 13, fontWeight: '900', color: COLORS.text },
    recentSub: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginTop: 2 },
    recentDuration: { fontSize: 12, fontWeight: '900', color: COLORS.text, fontVariant: ['tabular-nums'] },
});

