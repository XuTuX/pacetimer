import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { SessionStats } from '../../lib/recordsIndex';
import { formatClockTime, formatDisplayDate, formatDurationMs } from '../../lib/studyDate';
import { COLORS } from '../../lib/theme';
import type { Session, Subject } from '../../lib/types';

function getModeInfo(mode: Session['mode']) {
    if (mode === 'problem-solving') return { label: 'PERSONAL', color: '#8E8E93', icon: 'person' as const };
    return { label: 'CHALLENGE', color: COLORS.primary, icon: 'flash' as const };
}

function getSubjectName(subjectId: string, subjectsById: Record<string, Subject>) {
    if (subjectId === '__review__') return '검토';
    if (subjectId.startsWith('__legacy_category__:')) return '이전 데이터';
    if (subjectId === '__room_exam__') return '룸 모의고사';
    return subjectsById[subjectId]?.name ?? '미분류';
}

type Props = {
    sessions: Session[];
    sessionStatsById: Record<string, SessionStats>;
    subjectsById: Record<string, Subject>;
    onOpenSession: (sessionId: string) => void;
    date: string;
    nowMs: number;
};

export default function DayDetail({ sessions, sessionStatsById, subjectsById, onOpenSession, date, nowMs }: Props) {
    const sortedSessions = useMemo(() => {
        return [...sessions].sort((a, b) => b.startedAt - a.startedAt);
    }, [sessions]);

    const getSessionUI = (s: Session) => {
        const isRoom = s.title?.includes('[룸]');
        const modeInfo = getModeInfo(s.mode);
        let title = s.title ?? (s.mode === 'mock-exam' ? '모의고사' : '학습 세션');
        title = title.replace(/^(\[.*?\]\s*|.*?•\s*)+/, '');
        return { isRoom, title, modeInfo };
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTextWrapper}>
                    <Text style={styles.dateLabel}>{formatDisplayDate(date, nowMs)}</Text>
                    <Text style={styles.sessionCount}>{sessions.length} sessions recorded</Text>
                </View>
                <View style={styles.headerLine} />
            </View>

            {sortedSessions.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconCircle}>
                        <Ionicons name="calendar-clear-outline" size={28} color={COLORS.border} />
                    </View>
                    <Text style={styles.emptyText}>No activity for this day</Text>
                </View>
            ) : (
                <View style={styles.list}>
                    {sortedSessions.map((s) => {
                        const stats = sessionStatsById[s.id];
                        const { isRoom, title, modeInfo } = getSessionUI(s);
                        const subjectList = (stats?.subjectIds ?? [])
                            .slice(0, 2)
                            .map((sid) => getSubjectName(sid, subjectsById));

                        const subjectsDisplay = subjectList.join(', ');
                        const moreCount = (stats?.subjectIds ?? []).length - subjectList.length;

                        return (
                            <TouchableOpacity
                                key={s.id}
                                style={styles.card}
                                onPress={() => onOpenSession(s.id)}
                                activeOpacity={0.6}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={styles.titleArea}>
                                        <View style={styles.modeIndicator}>
                                            <Ionicons name={isRoom ? 'people' : modeInfo.icon} size={12} color={isRoom ? COLORS.primary : modeInfo.color} />
                                            <Text style={[styles.modeLabel, { color: isRoom ? COLORS.primary : modeInfo.color }]}>
                                                {isRoom ? 'ROOM' : modeInfo.label}
                                            </Text>
                                        </View>
                                        <Text style={styles.sessionTitle} numberOfLines={1}>{title}</Text>
                                    </View>
                                    <Text style={styles.durationValue}>{formatDurationMs(stats?.durationMs ?? 0)}</Text>
                                </View>

                                <View style={styles.cardFooter}>
                                    <View style={styles.metaInfo}>
                                        <Text style={styles.timeText}>{formatClockTime(s.startedAt)}</Text>
                                        <View style={styles.dot} />
                                        <Text style={styles.subjectText} numberOfLines={1}>
                                            {subjectsDisplay}
                                            {moreCount > 0 && <Text style={styles.moreText}> +{moreCount}</Text>}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={12} color={COLORS.border} />
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
    container: {
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        paddingHorizontal: 4,
    },
    headerTextWrapper: {
        marginRight: 16,
    },
    dateLabel: {
        fontSize: 22,
        fontWeight: '900',
        color: COLORS.text,
        letterSpacing: -0.8,
        marginBottom: 2,
    },
    sessionCount: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    headerLine: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.border,
        opacity: 0.5,
    },
    list: {
        gap: 12,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 20,
        // Using a more structured shadow and border combo
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
        shadowColor: 'rgba(0,0,0,1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    titleArea: {
        flex: 1,
        marginRight: 12,
    },
    modeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 6,
    },
    modeLabel: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.8,
    },
    sessionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
        letterSpacing: -0.4,
    },
    durationValue: {
        fontSize: 16,
        fontWeight: '900',
        color: COLORS.primary,
        fontVariant: ['tabular-nums'],
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    metaInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    timeText: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: COLORS.border,
        marginHorizontal: 8,
    },
    subjectText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textMuted,
        flex: 1,
    },
    moreText: {
        color: COLORS.primary,
        fontWeight: '800',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        opacity: 0.8,
    },
    emptyIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
});
