import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import type { SessionStats } from '../../lib/recordsIndex';
import { formatClockTime } from '../../lib/studyDate';
import { COLORS } from '../../lib/theme';
import type { Session, Subject } from '../../lib/types';
import { ThemedText } from '../ui/ThemedText';

interface TimelineViewProps {
    sessions: Session[];
    sessionStatsById: Record<string, SessionStats>;
    subjectsById: Record<string, Subject>;
    onOpenSession: (sessionId: string) => void;
}

function getSubjectName(subjectId: string, subjectsById: Record<string, Subject>) {
    if (subjectId === '__review__') return '검토';
    if (subjectId.startsWith('__legacy_category__:')) return '이전 데이터';
    if (subjectId === '__room_exam__') return '스터디 모의고사';
    return subjectsById[subjectId]?.name ?? '';
}

function getThemeColor(s: Session, stats?: SessionStats) {
    const rawSubjectIds = stats?.subjectIds ?? [];
    const isRoom = rawSubjectIds.includes('__room_exam__') || s.title?.includes('[스터디]');
    const isMockExam = s.mode === 'mock-exam';

    if (isRoom && isMockExam) return '#D4AF37';
    if (isMockExam) return COLORS.primary;
    if (isRoom) return '#5C6BC0';

    const colors = ['#00D094', '#4DABF7', '#BE4BDB', '#FF6B99', '#51CF66'];
    const idx = (s.id.charCodeAt(0) + s.id.charCodeAt(s.id.length - 1)) % colors.length;
    return colors[idx];
}

export default function TimelineView({ sessions, sessionStatsById, subjectsById, onOpenSession }: TimelineViewProps) {
    const sortedSessions = useMemo(() => {
        // Sort chronologically (oldest first for a timeline list)
        return [...sessions].sort((a, b) => a.startedAt - b.startedAt);
    }, [sessions]);

    if (sortedSessions.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            {sortedSessions.map((s, idx) => {
                const stats = sessionStatsById[s.id];
                const themeColor = getThemeColor(s, stats);
                const isMockExam = s.mode === 'mock-exam';
                const isLast = idx === sortedSessions.length - 1;

                const rawSubjectIds = stats?.subjectIds ?? [];
                const subjectIds = rawSubjectIds.filter(sid =>
                    sid !== '__review__' && sid !== '__room_exam__' && !sid.startsWith('__legacy_category__:')
                );
                const subjectList = subjectIds.map((sid) => getSubjectName(sid, subjectsById)).filter(n => !!n);

                let displayTitle = '';
                if (subjectList.length > 0) {
                    displayTitle = subjectList.join(', ');
                } else if (s.title && !s.title.includes('null') && s.title !== 'subject') {
                    displayTitle = s.title.replace(/^(\[.*?\]\s*|.*?•\s*)+/, '');
                } else {
                    displayTitle = isMockExam ? '모의고사' : '자율 학습';
                }

                const durationMs = stats?.durationMs ?? 0;
                const durationMinutes = Math.round(durationMs / 60000);
                const durationText = durationMinutes >= 60
                    ? `${Math.floor(durationMinutes / 60)}시간 ${durationMinutes % 60}분`
                    : `${durationMinutes}분`;

                return (
                    <View key={s.id} style={styles.timelineRow}>
                        {/* Time Column */}
                        <View style={styles.timeColumn}>
                            <ThemedText style={styles.startTime}>
                                {formatClockTime(s.startedAt)}
                            </ThemedText>
                            <View style={styles.verticalLineContainer}>
                                <View style={[styles.dot, { backgroundColor: themeColor }]} />
                                {!isLast && <View style={styles.line} />}
                            </View>
                        </View>

                        {/* Content Card (Sequential Stack - Never Overlaps) */}
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => onOpenSession(s.id)}
                            style={[styles.card, { borderLeftColor: themeColor }]}
                        >
                            <View style={styles.cardHeader}>
                                <ThemedText style={styles.title} numberOfLines={1}>
                                    {displayTitle}
                                </ThemedText>
                                <Ionicons name="chevron-forward" size={16} color="#DDD" />
                            </View>

                            <View style={styles.cardFooter}>
                                <View style={styles.infoRow}>
                                    <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
                                    <ThemedText style={styles.infoText}>{durationText}</ThemedText>
                                </View>
                                <View style={[styles.badge, { backgroundColor: themeColor + '10' }]}>
                                    <ThemedText style={[styles.badgeText, { color: themeColor }]}>
                                        학습 분석 보기
                                    </ThemedText>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 4,
        paddingVertical: 10,
    },
    timelineRow: {
        flexDirection: 'row',
        minHeight: 100, // Fixed space between rows
    },
    timeColumn: {
        width: 65,
        alignItems: 'center',
    },
    startTime: {
        fontSize: 13,
        fontWeight: '700',
        color: '#999',
        marginBottom: 8,
    },
    verticalLineContainer: {
        flex: 1,
        alignItems: 'center',
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        zIndex: 2,
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    line: {
        width: 2,
        flex: 1,
        backgroundColor: '#F0F0F0',
        marginTop: -2,
    },
    card: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        marginLeft: 4,
        borderLeftWidth: 4,
        // Premium shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        justifyContent: 'center',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.text,
        flex: 1,
        marginRight: 8,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    infoText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '800',
    },
});
