import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { SessionStats } from '../../lib/recordsIndex';
import { getSegmentDurationMs } from '../../lib/recordsIndex';
import { formatClockTime, formatDurationMs } from '../../lib/studyDate';
import { COLORS } from '../../lib/theme';
import type { QuestionRecord, Segment, Session, Subject } from '../../lib/types';

function formatMMSS(ms: number) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getModeInfo(session: Session) {
    const isRoom = session.title?.startsWith('[룸]');
    if (isRoom) return { label: 'ROOM', color: COLORS.primary, bg: COLORS.primaryLight + '40', icon: 'people' as const };
    if (session.mode === 'problem-solving') return { label: 'PERSONAL', color: '#8E8E93', bg: '#F2F2F7', icon: 'person' as const };
    return { label: 'CHALLENGE', color: COLORS.primary, bg: COLORS.primaryLight, icon: 'flash' as const };
}

function getSubjectName(subjectId: string, subjectsById: Record<string, Subject>) {
    if (subjectId === '__review__') return '검토';
    if (subjectId.startsWith('__legacy_category__:')) return '이전 데이터';
    return subjectsById[subjectId]?.name ?? '기타';
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
            <View style={styles.headerArea}>
                <View style={styles.modeIndicator}>
                    <Ionicons name={modeInfo.icon} size={12} color={modeInfo.color} />
                    <Text style={[styles.modeLabel, { color: modeInfo.color }]}>{modeInfo.label}</Text>
                </View>
                <Text style={styles.sessionTitle}>{title}</Text>
                <Text style={styles.sessionTimeRange}>
                    {formatClockTime(session.startedAt)} 시작
                </Text>
            </View>

            <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Total Time</Text>
                    <Text style={styles.statValue}>{formatDurationMs(sessionStats.durationMs)}</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Questions</Text>
                    <Text style={styles.statValue}>{sessionStats.questionCount}</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Segments</Text>
                    <Text style={styles.statValue}>{sessionStats.segmentCount}</Text>
                </View>
            </View>

            <View style={styles.sectionDivider} />

            <View style={styles.groupList}>
                {grouped.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="documents-outline" size={32} color={COLORS.border} />
                        <Text style={styles.emptyText}>세부 기록이 없습니다</Text>
                    </View>
                ) : (
                    grouped.map((g) => {
                        const isSubjectOpen = expandedSubjectId === g.subjectId;
                        return (
                            <View key={g.subjectId} style={styles.subjectGroup}>
                                <TouchableOpacity
                                    style={styles.subjectHeader}
                                    onPress={() => {
                                        setExpandedSegmentId(null);
                                        setExpandedSubjectId((prev) => (prev === g.subjectId ? null : g.subjectId));
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.subjectInfo}>
                                        <Text style={styles.subjectName}>{getSubjectName(g.subjectId, subjectsById)}</Text>
                                        <Text style={styles.subjectMeta}>{formatDurationMs(g.durationMs)}  ·  {g.questionCount}q</Text>
                                    </View>
                                    <Ionicons name={isSubjectOpen ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.border} />
                                </TouchableOpacity>

                                {isSubjectOpen && (
                                    <View style={styles.segmentList}>
                                        {g.segments.map((seg) => {
                                            const segQuestions = questionsBySegmentId[seg.id] ?? [];
                                            const isSegOpen = expandedSegmentId === seg.id;
                                            return (
                                                <View key={seg.id} style={styles.segmentItem}>
                                                    <TouchableOpacity
                                                        style={styles.segmentHeader}
                                                        onPress={() => setExpandedSegmentId((prev) => (prev === seg.id ? null : seg.id))}
                                                        activeOpacity={0.7}
                                                    >
                                                        <View style={styles.segmentInfo}>
                                                            <Text style={styles.segmentTitle}>
                                                                {formatClockTime(seg.startedAt)}
                                                                {seg.endedAt ? ` – ${formatClockTime(seg.endedAt)}` : ''}
                                                            </Text>
                                                            <Text style={styles.segmentMeta}>
                                                                {formatDurationMs(getSegmentDurationMs(seg, nowMs))}  ·  {segQuestions.length}q
                                                            </Text>
                                                        </View>
                                                        <Ionicons name={isSegOpen ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.border} />
                                                    </TouchableOpacity>

                                                    {isSegOpen && (
                                                        <View style={styles.questionList}>
                                                            {segQuestions.length === 0 ? (
                                                                <Text style={styles.noQuestionsText}>진행된 문항이 없습니다.</Text>
                                                            ) : (
                                                                segQuestions.map((q) => (
                                                                    <View key={q.id} style={styles.questionRow}>
                                                                        <View style={styles.qNoWrapper}>
                                                                            <Text style={styles.qNo}>Q{q.questionNo}</Text>
                                                                        </View>
                                                                        <Text style={styles.qTime}>{formatMMSS(q.durationMs)}</Text>
                                                                        <Text style={styles.qClock}>{formatClockTime(q.startedAt)}</Text>
                                                                    </View>
                                                                ))
                                                            )}
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
    container: { gap: 24, paddingBottom: 20 },
    headerArea: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    modeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    modeLabel: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
    },
    sessionTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.text,
        letterSpacing: -0.8,
        textAlign: 'center',
    },
    sessionTimeRange: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textMuted,
        marginTop: 6,
    },
    statsGrid: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 20,
        gap: 12,
        shadowColor: 'rgba(0,0,0,1)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 2,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textMuted,
        textTransform: 'uppercase',
    },
    statValue: {
        fontSize: 16,
        fontWeight: '900',
        color: COLORS.text,
    },
    sectionDivider: {
        height: 1,
        backgroundColor: COLORS.border,
        opacity: 0.5,
        marginHorizontal: 12,
    },
    groupList: { gap: 12 },
    subjectGroup: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
    },
    subjectHeader: {
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    subjectInfo: { gap: 2 },
    subjectName: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    subjectMeta: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
    segmentList: {
        paddingHorizontal: 16,
        paddingBottom: 20,
        gap: 12,
    },
    segmentItem: {
        backgroundColor: COLORS.bg,
        borderRadius: 20,
        overflow: 'hidden',
    },
    segmentHeader: {
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    segmentInfo: { gap: 2 },
    segmentTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
    segmentMeta: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
    questionList: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 8,
    },
    questionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.03)',
    },
    qNoWrapper: {
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    qNo: { fontSize: 11, fontWeight: '900', color: COLORS.primary },
    qTime: { fontSize: 14, fontWeight: '800', color: COLORS.text, fontVariant: ['tabular-nums'] },
    qClock: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, fontVariant: ['tabular-nums'] },
    noQuestionsText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted, paddingVertical: 10, textAlign: 'center' },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
});
