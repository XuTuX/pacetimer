import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { SessionStats } from '../../lib/recordsIndex';
import type { Session, Subject } from '../../lib/types';
import { COLORS } from '../../lib/theme';
import { formatClockTime, formatDurationMs } from '../../lib/studyDate';

function getModeLabel(mode: Session['mode']) {
    return mode === 'problem-solving' ? '문제풀이' : '모의고사';
}

function getModePillStyle(mode: Session['mode']) {
    if (mode === 'problem-solving') return { bg: COLORS.primaryLight, fg: COLORS.primary };
    return { bg: COLORS.surfaceVariant, fg: COLORS.textMuted };
}

function getSubjectName(subjectId: string, subjectsById: Record<string, Subject>) {
    if (subjectId === '__review__') return '검토';
    if (subjectId.startsWith('__legacy_category__:')) return '이전 데이터';
    return subjectsById[subjectId]?.name ?? '기타';
}

type Props = {
    sessions: Session[];
    sessionStatsById: Record<string, SessionStats>;
    subjectsById: Record<string, Subject>;
    onOpenSession: (sessionId: string) => void;
};

export default function DayDetail({ sessions, sessionStatsById, subjectsById, onOpenSession }: Props) {
    return (
        <View style={styles.container}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>세션</Text>
                <Text style={styles.sectionMeta}>{sessions.length}개</Text>
            </View>

            {sessions.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Ionicons name="calendar-outline" size={32} color={COLORS.border} />
                    <Text style={styles.emptyText}>이 날짜에는 기록이 없어요.</Text>
                </View>
            ) : (
                <View style={styles.list}>
                    {sessions.map((s) => {
                        const stats = sessionStatsById[s.id];
                        const modePill = getModePillStyle(s.mode);
                        const subjectsText = (stats?.subjectIds ?? [])
                            .slice(0, 3)
                            .map((sid) => getSubjectName(sid, subjectsById))
                            .join(' · ');

                        const more = (stats?.subjectIds ?? []).length > 3 ? ` 외 ${(stats.subjectIds.length - 3)}개` : '';

                        return (
                            <TouchableOpacity
                                key={s.id}
                                style={styles.sessionCard}
                                onPress={() => onOpenSession(s.id)}
                                activeOpacity={0.85}
                            >
                                <View style={styles.sessionTopRow}>
                                    <View style={[styles.modePill, { backgroundColor: modePill.bg }]}>
                                        <Text style={[styles.modePillText, { color: modePill.fg }]}>{getModeLabel(s.mode)}</Text>
                                    </View>
                                    <Text style={styles.sessionTime}>{formatClockTime(s.startedAt)}</Text>
                                </View>

                                <View style={styles.sessionMainRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.sessionTitle}>{s.title ?? (s.mode === 'mock-exam' ? '모의고사' : '학습 세션')}</Text>
                                        <Text style={styles.sessionSub} numberOfLines={1}>
                                            {subjectsText || '과목 정보 없음'}
                                            {more}
                                        </Text>
                                    </View>
                                    <View style={styles.sessionStats}>
                                        <Text style={styles.sessionStatValue}>{formatDurationMs(stats?.durationMs ?? 0)}</Text>
                                        <Text style={styles.sessionStatSub}>{stats?.questionCount ?? 0}문항</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { gap: 18 },

    sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    sectionMeta: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },

    list: { gap: 12 },
    sessionCard: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 12,
    },
    sessionTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    modePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
    modePillText: { fontSize: 12, fontWeight: '900' },
    sessionTime: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },

    sessionMainRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    sessionTitle: { fontSize: 16, fontWeight: '900', color: COLORS.text },
    sessionSub: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginTop: 2 },
    sessionStats: { alignItems: 'flex-end' },
    sessionStatValue: { fontSize: 13, fontWeight: '900', color: COLORS.text },
    sessionStatSub: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginTop: 2 },

    emptyCard: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
        gap: 10,
    },
    emptyText: {
        color: COLORS.textMuted,
        fontSize: 14,
        fontWeight: '600',
    },
});
