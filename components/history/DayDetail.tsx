import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { SessionStats } from '../../lib/recordsIndex';
import { formatClockTime, formatDisplayDate, formatDurationMs } from '../../lib/studyDate';
import { COLORS, SPACING } from '../../lib/theme';
import type { Session, Subject } from '../../lib/types';
import { Card } from '../ui/Card';
import { ThemedText } from '../ui/ThemedText';

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
        let title = s.title ?? (s.mode === 'mock-exam' ? '모의고사' : '학습 세션');
        title = title.replace(/^(\[.*?\]\s*|.*?•\s*)+/, '');
        return { title };
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
                    <ThemedText variant="body2" color={COLORS.textMuted}>이 날은 학습 기록이 없습니다</ThemedText>
                </View>
            ) : (
                <View style={styles.list}>
                    {sortedSessions.map((s) => {
                        const stats = sessionStatsById[s.id];
                        const { title } = getSessionUI(s);

                        const rawSubjectIds = stats?.subjectIds ?? [];
                        const isRoom = rawSubjectIds.includes('__room_exam__') || s.title?.includes('[룸]');
                        const isMockExam = s.mode === 'mock-exam';

                        // Filter pseudo-subjects for the title
                        const subjectIds = rawSubjectIds.filter(sid =>
                            sid !== '__review__' && sid !== '__room_exam__' && !sid.startsWith('__legacy_category__:')
                        );
                        const subjectList = subjectIds.map((sid) => getSubjectName(sid, subjectsById));

                        let displayTitle = subjectList.join(', ');
                        if (!displayTitle) displayTitle = title;

                        // Determine Style Specs
                        let badgeConfig = null;
                        let cardStyle = {};

                        if (isRoom && isMockExam) {
                            badgeConfig = {
                                text: "ROOM • 모의고사",
                                color: '#977A00', // Darker Gold
                                bg: '#FFFDF2',
                                border: '#F9F1C8'
                            };
                        } else if (isRoom) {
                            badgeConfig = {
                                text: "ROOM",
                                color: COLORS.primary,
                                bg: '#F8F9FF',
                                border: 'transparent'
                            };
                            // Optional: Keep Room simple or give it a tint. Let's keep it clean but maybe a tiny tint.
                            // User asked for "Room" to be distinct? Let's use primary tint.
                            // badgeConfig.bg = COLORS.primary + '08';
                        } else if (isMockExam) {
                            badgeConfig = {
                                text: "모의고사",
                                color: '#2E7D32', // Forest Green
                                bg: '#F4FBF6',
                                border: '#D4EEE2'
                            };
                        }

                        // Apply styles if badge is configured (meaning it's a special type)
                        if (badgeConfig?.bg) {
                            cardStyle = {
                                backgroundColor: badgeConfig.bg,
                                borderWidth: 1,
                                borderColor: badgeConfig.border,
                                shadowOpacity: 0, // Flatten it for a cleaner look? Or keep subtle shadow. Let's keep subtle.
                                elevation: 0, // Flat look is more premium for colored cards usually
                            };
                        }

                        return (
                            <View key={s.id} style={{ marginTop: badgeConfig ? 10 : 0 }}>
                                <Pressable
                                    onPress={() => onOpenSession(s.id)}
                                >
                                    <Card variant={badgeConfig ? 'flat' : 'elevated'} radius="lg" padding="lg" style={cardStyle}>
                                        <View style={styles.cardContent}>
                                            <View style={styles.mainInfo}>
                                                <ThemedText variant="h3" numberOfLines={1} style={{ fontSize: 17, marginBottom: 2 }}>
                                                    {displayTitle}
                                                </ThemedText>

                                                <ThemedText variant="caption" color={COLORS.textMuted}>
                                                    {formatClockTime(s.startedAt)} 시작
                                                </ThemedText>
                                            </View>

                                            <View style={styles.rightInfo}>
                                                <ThemedText variant="h2" color={COLORS.primary} style={styles.durationValue}>
                                                    {formatDurationMs(stats?.durationMs ?? 0)}
                                                </ThemedText>
                                                <Ionicons name="chevron-forward" size={16} color={COLORS.border} style={{ marginLeft: 8, opacity: 0.5 }} />
                                            </View>
                                        </View>
                                    </Card>
                                </Pressable>

                                {badgeConfig && (
                                    <View style={{
                                        position: 'absolute',
                                        top: -9,
                                        left: 16,
                                        backgroundColor: COLORS.bg,
                                        paddingHorizontal: 6,
                                        zIndex: 1,
                                    }}>
                                        <ThemedText style={{
                                            color: badgeConfig.color,
                                            fontSize: 11,
                                            fontWeight: '700'
                                        }}>
                                            {badgeConfig.text}
                                        </ThemedText>
                                    </View>
                                )}
                            </View>
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
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    mainInfo: {
        flex: 1,
        marginRight: 16,
    },
    rightInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    durationValue: {
        fontVariant: ['tabular-nums'],
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
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
});
