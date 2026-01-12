import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { SessionStats } from '../../lib/recordsIndex';
import { formatClockTime, formatDisplayDate, formatDurationMs } from '../../lib/studyDate';
import { COLORS, SPACING } from '../../lib/theme';
import type { Session, Subject } from '../../lib/types';
import { Card } from '../ui/Card';
import { ThemedText } from '../ui/ThemedText';

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
                    <ThemedText variant="h2" style={styles.dateLabel}>{formatDisplayDate(date, nowMs)}</ThemedText>
                </View>
                <View style={styles.headerLine} />
            </View>

            {sortedSessions.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconCircle}>
                        <Ionicons name="calendar-clear-outline" size={28} color={COLORS.border} />
                    </View>
                    <ThemedText variant="body2" color={COLORS.textMuted}>No activity for this day</ThemedText>
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
                            <Pressable
                                key={s.id}
                                onPress={() => onOpenSession(s.id)}
                            >
                                <Card variant="elevated" radius="lg" padding="lg">
                                    <View style={styles.cardHeader}>
                                        <View style={styles.titleArea}>
                                            <View style={styles.modeIndicator}>
                                                <Ionicons name={isRoom ? 'people' : modeInfo.icon} size={12} color={isRoom ? COLORS.primary : modeInfo.color} />
                                                <ThemedText
                                                    variant="label"
                                                    color={isRoom ? COLORS.primary : modeInfo.color}
                                                >
                                                    {isRoom ? 'ROOM' : modeInfo.label}
                                                </ThemedText>
                                            </View>
                                            <ThemedText variant="h3" numberOfLines={1}>{title}</ThemedText>
                                        </View>
                                        <ThemedText variant="h3" color={COLORS.primary} style={styles.durationValue}>
                                            {formatDurationMs(stats?.durationMs ?? 0)}
                                        </ThemedText>
                                    </View>

                                    <View style={styles.cardFooter}>
                                        <View style={styles.metaInfo}>
                                            <ThemedText variant="caption" color={COLORS.textMuted}>{formatClockTime(s.startedAt)}</ThemedText>
                                            <View style={styles.dot} />
                                            <ThemedText variant="caption" color={COLORS.textMuted} numberOfLines={1} style={styles.subjectText}>
                                                {subjectsDisplay}
                                                {moreCount > 0 && <ThemedText variant="caption" color={COLORS.primary}> +{moreCount}</ThemedText>}
                                            </ThemedText>
                                        </View>
                                        <Ionicons name="chevron-forward" size={12} color={COLORS.border} />
                                    </View>
                                </Card>
                            </Pressable>
                        );
                    })}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingBottom: SPACING.xl,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xxl,
        paddingHorizontal: 4,
    },
    headerTextWrapper: {
        marginRight: SPACING.lg,
    },
    dateLabel: {
        marginBottom: 2,
    },
    headerLine: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.border,
        opacity: 0.5,
    },
    list: {
        gap: SPACING.md,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.lg,
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
    durationValue: {
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
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: COLORS.border,
        marginHorizontal: 8,
    },
    subjectText: {
        flex: 1,
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
});
