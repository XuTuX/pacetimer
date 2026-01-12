import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { LayoutAnimation, Platform, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import type { SessionStats } from '../../lib/recordsIndex';
import { getSegmentDurationMs } from '../../lib/recordsIndex';
import { formatClockTime, formatDurationMs } from '../../lib/studyDate';
import { COLORS } from '../../lib/theme';
import type { QuestionRecord, Segment, Session, Subject } from '../../lib/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PALETTE = {
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray800: '#1F2937',
};

function formatMMSS(ms: number) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getModeInfo(session: Session) {
    const isRoom = session.title?.startsWith('[룸]');
    if (isRoom) return { label: 'ROOM', color: COLORS.primary, bg: 'rgba(52, 199, 89, 0.1)', icon: 'people' as const };
    if (session.mode === 'problem-solving') return { label: 'PERSONAL', color: '#8E8E93', bg: '#F2F2F7', icon: 'person' as const };
    return { label: 'CHALLENGE', color: COLORS.primary, bg: 'rgba(52, 199, 89, 0.1)', icon: 'flash' as const };
}

function getSubjectName(subjectId: string, subjectsById: Record<string, Subject>) {
    if (subjectId === '__review__') return '검토';
    if (subjectId.startsWith('__legacy_category__:')) return '이전 데이터';
    return subjectsById[subjectId]?.name ?? '기타';
}

function formatDateFull(ms: number) {
    const d = new Date(ms);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const weekMap = ['일', '월', '화', '수', '목', '금', '토'];
    const week = weekMap[d.getDay()];
    return `${month}월 ${day}일 (${week})`;
}

type Props = {
    nowMs: number;
    session: Session;
    sessionStats: SessionStats;
    segments: Segment[];
    questionsBySegmentId: Record<string, QuestionRecord[]>;
    subjectsById: Record<string, Subject>;
};

export default function SessionDetail({ nowMs, session, sessionStats, segments, questionsBySegmentId, subjectsById }: Props) {
    const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
    const [expandedSegmentId, setExpandedSegmentId] = useState<string | null>(null);

    const toggleSubject = (id: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedSubjectId(prev => (prev === id ? null : id));
    };

    const toggleSegment = (id: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedSegmentId(prev => (prev === id ? null : id));
    };

    const grouped = useMemo(() => {
        const bySubject: Record<string, { subjectId: string; durationMs: number; questionCount: number; segments: Segment[] }> = {};
        for (const seg of segments) {
            if (!bySubject[seg.subjectId]) {
                bySubject[seg.subjectId] = { subjectId: seg.subjectId, durationMs: 0, questionCount: 0, segments: [] };
            }
            bySubject[seg.subjectId].segments.push(seg);
            bySubject[seg.subjectId].durationMs += getSegmentDurationMs(seg, nowMs);
            bySubject[seg.subjectId].questionCount += (questionsBySegmentId[seg.id]?.length ?? 0);
        }
        const list = Object.values(bySubject);
        for (const item of list) item.segments.sort((a, b) => a.startedAt - b.startedAt);
        list.sort((a, b) => b.durationMs - a.durationMs);
        return list;
    }, [segments, nowMs, questionsBySegmentId]);

    const modeInfo = getModeInfo(session);
    // Strip all prefixes like [언어논리], [룸], or "Subject • "
    const title = (session.title ?? (session.mode === 'mock-exam' ? '모의고사' : '학습 세션')).replace(/^(\[.*?\]\s*|.*?•\s*)+/, '');

    return (
        <View style={styles.container}>
            {/* Header Section */}
            <View style={styles.header}>
                <View style={styles.topRow}>
                    <View style={[styles.badge, { backgroundColor: modeInfo.bg }]}>
                        <Ionicons name={modeInfo.icon} size={10} color={modeInfo.color} style={{ marginRight: 4 }} />
                        <Text style={[styles.badgeText, { color: modeInfo.color }]}>{modeInfo.label}</Text>
                    </View>
                    <Text style={styles.dateText}>{formatDateFull(session.startedAt)}</Text>
                </View>
                <Text style={styles.mainTitle}>{title}</Text>
                <Text style={styles.subTitle}>{formatClockTime(session.startedAt)} 시작</Text>
            </View>

            {/* Stats Overview - Bento Grid Style */}
            <View style={styles.statsContainer}>
                <View style={[styles.statCard, styles.statCardLarge]}>
                    <View style={styles.statIconCircle}>
                        <Ionicons name="time" size={18} color={COLORS.primary} />
                    </View>
                    <View>
                        <Text style={styles.statLabel}>Total Time</Text>
                        <Text style={styles.statValueLarge}>{formatDurationMs(sessionStats.durationMs)}</Text>
                    </View>
                </View>
                <View style={styles.statRightCol}>
                    <View style={styles.statCardSmall}>
                        <Text style={styles.statLabel}>Questions</Text>
                        <Text style={styles.statValueMedium}>{sessionStats.questionCount}<Text style={styles.statUnit}> q</Text></Text>
                    </View>
                    <View style={styles.statCardSmall}>
                        <Text style={styles.statLabel}>Segments</Text>
                        <Text style={styles.statValueMedium}>{sessionStats.segmentCount}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.divider} />

            {/* Content List */}
            <View style={styles.listContainer}>
                {grouped.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="cloud-offline-outline" size={48} color={PALETTE.gray300} />
                        <Text style={styles.emptyText}>상세 기록이 존재하지 않습니다</Text>
                    </View>
                ) : (
                    grouped.map((g, i) => {
                        const isSubjectOpen = expandedSubjectId === g.subjectId;
                        return (
                            <View key={g.subjectId} style={styles.subjectGroup}>
                                <TouchableOpacity
                                    style={styles.subjectHeader}
                                    onPress={() => toggleSubject(g.subjectId)}
                                    activeOpacity={0.6}
                                >
                                    <View style={styles.subjectInfoLeft}>
                                        <View style={styles.subjectIndicator} />
                                        <Text style={styles.subjectName}>{getSubjectName(g.subjectId, subjectsById)}</Text>
                                    </View>
                                    <View style={styles.subjectInfoRight}>
                                        <Text style={styles.subjectStats}>{formatDurationMs(g.durationMs)}</Text>
                                        <Ionicons
                                            name="chevron-down"
                                            size={16}
                                            color={PALETTE.gray400}
                                            style={{ transform: [{ rotate: isSubjectOpen ? '180deg' : '0deg' }], marginLeft: 8 }}
                                        />
                                    </View>
                                </TouchableOpacity>

                                {isSubjectOpen && (
                                    <View style={styles.segmentList}>
                                        {g.segments.map((seg, idx) => {
                                            const segQuestions = questionsBySegmentId[seg.id] ?? [];
                                            const isSegOpen = expandedSegmentId === seg.id;
                                            const isLast = idx === g.segments.length - 1;
                                            return (
                                                <View key={seg.id} style={[styles.segmentItem, !isLast && styles.segmentBorder]}>
                                                    <TouchableOpacity
                                                        style={styles.segmentHeader}
                                                        onPress={() => toggleSegment(seg.id)}
                                                    >
                                                        <View style={styles.segmentTimeLine}>
                                                            <View style={styles.timeDot} />
                                                            {!isLast && <View style={styles.timeLine} />}
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <View style={styles.segmentRow}>
                                                                <Text style={styles.segmentTimeRange}>
                                                                    {formatClockTime(seg.startedAt)} - {seg.endedAt ? formatClockTime(seg.endedAt) : '...'}
                                                                </Text>
                                                                <Text style={styles.segmentDuration}>
                                                                    {formatDurationMs(getSegmentDurationMs(seg, nowMs))}
                                                                </Text>
                                                            </View>
                                                            {segQuestions.length > 0 && (
                                                                <Text style={styles.segmentQuestionSummary}>
                                                                    {segQuestions.length} 문제 풀이
                                                                </Text>
                                                            )}
                                                        </View>
                                                    </TouchableOpacity>

                                                    {isSegOpen && segQuestions.length > 0 && (
                                                        <View style={styles.questionList}>
                                                            {segQuestions.map((q) => (
                                                                <View key={q.id} style={styles.questionItem}>
                                                                    <View style={styles.qBadge}>
                                                                        <Text style={styles.qBadgeText}>Q{q.questionNo}</Text>
                                                                    </View>
                                                                    <Text style={styles.qDuration}>{formatMMSS(q.durationMs)}</Text>
                                                                    <Text style={styles.qTimestamp}>{formatClockTime(q.startedAt)}</Text>
                                                                </View>
                                                            ))}
                                                        </View>
                                                    )}
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 10,
    },
    header: {
        paddingHorizontal: 4,
        marginBottom: 24,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    dateText: {
        fontSize: 13,
        color: PALETTE.gray500,
        fontWeight: '500',
    },
    mainTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: COLORS.text,
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    subTitle: {
        fontSize: 14,
        color: PALETTE.gray500,
        fontWeight: '500',
    },

    // Stats Bento
    statsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        justifyContent: 'space-between',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
    },
    statCardLarge: {
        flex: 1.3,
        height: 110,
    },
    statRightCol: {
        flex: 1,
        gap: 10,
    },
    statCardSmall: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1,
    },
    statIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.primaryLight + '40',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: PALETTE.gray500,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    statValueLarge: {
        fontSize: 22,
        fontWeight: '800',
        color: COLORS.text,
    },
    statValueMedium: {
        fontSize: 17,
        fontWeight: '700',
        color: COLORS.text,
    },
    statUnit: {
        fontSize: 12,
        color: PALETTE.gray400,
        fontWeight: '500',
    },

    divider: {
        height: 1,
        backgroundColor: PALETTE.gray100,
        marginBottom: 20,
    },

    // List
    listContainer: {
        gap: 16,
    },
    subjectGroup: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 4,
        borderWidth: 1,
        borderColor: PALETTE.gray100,
    },
    subjectHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    subjectInfoLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    subjectIndicator: {
        width: 4,
        height: 16,
        borderRadius: 2,
        backgroundColor: COLORS.primary,
    },
    subjectName: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    subjectInfoRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    subjectStats: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        fontVariant: ['tabular-nums'],
    },
    segmentList: {
        paddingTop: 0,
        paddingBottom: 8,
        paddingHorizontal: 16,
    },
    segmentItem: {
        paddingVertical: 12,
    },
    segmentBorder: {
        borderBottomWidth: 1,
        borderBottomColor: PALETTE.gray50,
    },
    segmentHeader: {
        flexDirection: 'row',
    },
    segmentTimeLine: {
        width: 20,
        alignItems: 'center',
        marginRight: 12,
        marginTop: 4,
    },
    timeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: PALETTE.gray300,
    },
    timeLine: {
        width: 1,
        flex: 1,
        backgroundColor: PALETTE.gray200,
        marginTop: 4,
    },
    segmentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    segmentTimeRange: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    segmentDuration: {
        fontSize: 13,
        color: PALETTE.gray500,
        fontVariant: ['tabular-nums'],
    },
    segmentQuestionSummary: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: '500',
    },
    questionList: {
        marginLeft: 32,
        marginTop: 8,
        backgroundColor: PALETTE.gray50,
        borderRadius: 8,
        padding: 8,
        gap: 6,
    },
    questionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    qBadge: {
        backgroundColor: '#fff',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: PALETTE.gray200,
    },
    qBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: PALETTE.gray600,
    },
    qDuration: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.text,
        fontVariant: ['tabular-nums'],
    },
    qTimestamp: {
        fontSize: 11,
        color: PALETTE.gray400,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    emptyText: {
        color: PALETTE.gray400,
        fontSize: 14,
    },
});
