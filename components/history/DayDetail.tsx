import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { SessionStats } from '../../lib/recordsIndex';
import { formatDisplayDateOnly, formatDisplayDayOnly, getStudyDateKey } from '../../lib/studyDate';
import { COLORS, SPACING } from '../../lib/theme';
import type { Session, Subject } from '../../lib/types';
import { ThemedText } from '../ui/ThemedText';
import TimelineView from './TimelineView';

type Props = {
    sessions: Session[];
    sessionStatsById: Record<string, SessionStats>;
    subjectsById: Record<string, Subject>;
    onOpenSession: (sessionId: string) => void;
    date: string;
    nowMs: number;
};

export default function DayDetail({ sessions, sessionStatsById, subjectsById, onOpenSession, date, nowMs }: Props) {
    const isToday = date === getStudyDateKey(nowMs);

    return (
        <View style={styles.container}>
            {/* Header Area */}
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <ThemedText style={styles.todayText}>
                        {isToday ? 'Today' : formatDisplayDayOnly(date)}
                    </ThemedText>
                    <ThemedText style={styles.dateText}>
                        {formatDisplayDateOnly(date)}
                    </ThemedText>
                </View>
                <ThemedText variant="caption" color={COLORS.textMuted} style={styles.recordCount}>
                    총 {sessions.length}개의 기록
                </ThemedText>
            </View>

            {sessions.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconCircle}>
                        <Ionicons name="calendar-clear-outline" size={32} color={COLORS.border} />
                    </View>
                    <ThemedText variant="body2" color={COLORS.textMuted}>
                        학습 기록이 없습니다
                    </ThemedText>
                </View>
            ) : (
                <TimelineView
                    sessions={sessions}
                    sessionStatsById={sessionStatsById}
                    subjectsById={subjectsById}
                    onOpenSession={onOpenSession}
                />
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
        marginBottom: 24,
        marginTop: SPACING.sm,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 12,
        marginBottom: 6,
    },
    todayText: {
        fontSize: 34,
        fontWeight: '900',
        color: COLORS.text,
        letterSpacing: -1,
    },
    dateText: {
        fontSize: 28,
        fontWeight: '500',
        color: '#C0C0C0', // Very light gray like the reference
        letterSpacing: -0.5,
    },
    recordCount: {
        fontSize: 13,
        fontWeight: '600',
        opacity: 0.7,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
        backgroundColor: COLORS.white,
        borderRadius: 24,
        opacity: 0.8,
    },
    emptyIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#F8F9FA',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
});