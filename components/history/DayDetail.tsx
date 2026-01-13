import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { SessionStats } from '../../lib/recordsIndex';
import { formatClockTime, formatDisplayDate, formatDurationMs } from '../../lib/studyDate';
import { COLORS, SPACING } from '../../lib/theme';
import type { Session, Subject } from '../../lib/types';
import { Card } from '../ui/Card';
import { ThemedText } from '../ui/ThemedText';

// --- Helper Logic ---
function getSubjectName(subjectId: string, subjectsById: Record<string, Subject>) {
    if (subjectId === '__review__') return '검토';
    if (subjectId.startsWith('__legacy_category__:')) return '이전 데이터';
    if (subjectId === '__room_exam__') return '스터디 모의고사';
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
        let title = s.title ?? (s.mode === 'mock-exam' ? '모의고사' : '학습 세션');
        title = title.replace(/^(\[.*?\]\s*|.*?•\s*)+/, '');
        return { title };
    };

    return (
        <View style={styles.container}>
            {/* Header Area */}
            <View style={styles.header}>
                <ThemedText variant="h2" style={styles.dateLabel}>
                    {formatDisplayDate(date, nowMs)}
                </ThemedText>
                <ThemedText variant="caption" color={COLORS.textMuted}>
                    총 {sortedSessions.length}개의 기록
                </ThemedText>
            </View>

            {sortedSessions.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconCircle}>
                        <Ionicons name="calendar-clear-outline" size={32} color={COLORS.border} />
                    </View>
                    <ThemedText variant="body2" color={COLORS.textMuted}>
                        학습 기록이 없습니다
                    </ThemedText>
                </View>
            ) : (
                <View style={styles.list}>
                    {sortedSessions.map((s) => {
                        const stats = sessionStatsById[s.id];
                        const { title } = getSessionUI(s);

                        const rawSubjectIds = stats?.subjectIds ?? [];
                        const isRoom = rawSubjectIds.includes('__room_exam__') || s.title?.includes('[스터디]');
                        const isMockExam = s.mode === 'mock-exam';

                        // Subject Name Construction
                        const subjectIds = rawSubjectIds.filter(sid =>
                            sid !== '__review__' && sid !== '__room_exam__' && !sid.startsWith('__legacy_category__:')
                        );
                        const subjectList = subjectIds.map((sid) => getSubjectName(sid, subjectsById));
                        let displayTitle = subjectList.join(', ');
                        if (!displayTitle) displayTitle = title;

                        // --- Design Configuration ---
                        // Define theme colors for different types
                        let themeColor = COLORS.primary;
                        let badgeText = null;

                        // Priority: Room+Mock > Mock > Room > Default
                        if (isRoom && isMockExam) {
                            themeColor = '#D4AF37'; // Gold
                            badgeText = "ROOM • 모의고사";
                        } else if (isMockExam) {
                            themeColor = '#2E7D32'; // Green
                            badgeText = "모의고사";
                        } else if (isRoom) {
                            themeColor = '#5C6BC0'; // Indigo
                            badgeText = "ROOM";
                        }

                        return (
                            <Pressable
                                key={s.id}
                                onPress={() => onOpenSession(s.id)}
                                style={({ pressed }) => [
                                    styles.cardWrapper,
                                    pressed && styles.pressed
                                ]}
                            >
                                <Card variant="elevated" radius="md" padding="none" style={styles.card}>
                                    {/* Left Color Indicator Bar */}
                                    <View style={[styles.indicatorBar, { backgroundColor: themeColor }]} />

                                    <View style={styles.cardContent}>
                                        <View style={styles.mainInfo}>
                                            {/* Top Row: Badges & Time */}
                                            <View style={styles.metaRow}>
                                                {badgeText && (
                                                    <View style={[styles.badge, { backgroundColor: themeColor + '15' }]}>
                                                        <ThemedText style={[styles.badgeText, { color: themeColor }]}>
                                                            {badgeText}
                                                        </ThemedText>
                                                    </View>
                                                )}
                                                <ThemedText variant="caption" color={COLORS.textMuted} style={styles.startTimeText}>
                                                    {formatClockTime(s.startedAt)}
                                                </ThemedText>
                                            </View>

                                            {/* Middle: Title */}
                                            <ThemedText variant="h3" numberOfLines={1} style={styles.titleText}>
                                                {displayTitle}
                                            </ThemedText>
                                        </View>

                                        {/* Right: Duration */}
                                        <View style={styles.rightInfo}>
                                            <ThemedText variant="h2" style={[styles.durationValue, { color: themeColor }]}>
                                                {formatDurationMs(stats?.durationMs ?? 0)}
                                            </ThemedText>
                                            <Ionicons name="chevron-forward" size={14} color={COLORS.border} />
                                        </View>
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
        paddingHorizontal: 4,
        marginBottom: SPACING.lg,
        marginTop: SPACING.sm,
    },
    dateLabel: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 4,
    },
    list: {
        gap: SPACING.md,
    },
    cardWrapper: {
        borderRadius: 12, // Match Card radius
    },
    pressed: {
        opacity: 0.9,
        transform: [{ scale: 0.995 }],
    },
    card: {
        flexDirection: 'row',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border + '40', // Very subtle border
        backgroundColor: COLORS.bg, // Clean background
    },
    indicatorBar: {
        width: 5,
        height: '100%',
    },
    cardContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.md,
    },
    mainInfo: {
        flex: 1,
        justifyContent: 'center',
        gap: 6,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    startTimeText: {
        fontSize: 12,
        includeFontPadding: false,
    },
    titleText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    rightInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 12,
        gap: 4,
    },
    durationValue: {
        fontSize: 18,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
        opacity: 0.6,
    },
    emptyIconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
});