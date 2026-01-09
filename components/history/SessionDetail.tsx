import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { SessionStats } from '../../lib/recordsIndex';
import { getSegmentDurationMs } from '../../lib/recordsIndex';
import type { QuestionRecord, Segment, Session, Subject } from '../../lib/types';
import { COLORS } from '../../lib/theme';
import { formatClockTime, formatDurationMs } from '../../lib/studyDate';

function formatMMSS(ms: number) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getModeLabel(mode: Session['mode']) {
    return mode === 'problem-solving' ? '문제풀이' : '모의고사';
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

    const modePill = session.mode === 'problem-solving'
        ? { bg: COLORS.primaryLight, fg: COLORS.primary }
        : { bg: COLORS.surfaceVariant, fg: COLORS.textMuted };

    return (
        <View style={styles.container}>
            <View style={styles.headerCard}>
                <View style={styles.headerTopRow}>
                    <View style={[styles.modePill, { backgroundColor: modePill.bg }]}>
                        <Text style={[styles.modePillText, { color: modePill.fg }]}>{getModeLabel(session.mode)}</Text>
                    </View>
                    <Text style={styles.headerTime}>
                        {formatClockTime(session.startedAt)} 시작
                    </Text>
                </View>

                <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>총 시간</Text>
                        <Text style={styles.summaryValue}>{formatDurationMs(sessionStats.durationMs)}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>문항</Text>
                        <Text style={styles.summaryValue}>{sessionStats.questionCount}개</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>세그먼트</Text>
                        <Text style={styles.summaryValue}>{sessionStats.segmentCount}개</Text>
                    </View>
                </View>
            </View>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>과목</Text>
                <Text style={styles.sectionMeta}>{sessionStats.subjectIds.length}개</Text>
            </View>

            {grouped.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Ionicons name="list-outline" size={32} color={COLORS.border} />
                    <Text style={styles.emptyText}>아직 세부 기록이 없어요.</Text>
                </View>
            ) : (
                <View style={styles.groupList}>
                    {grouped.map((g) => {
                        const isSubjectOpen = expandedSubjectId === g.subjectId;
                        return (
                            <View key={g.subjectId} style={styles.subjectCard}>
                                <TouchableOpacity
                                    style={styles.subjectHeaderRow}
                                    onPress={() => {
                                        setExpandedSegmentId(null);
                                        setExpandedSubjectId((prev) => (prev === g.subjectId ? null : g.subjectId));
                                    }}
                                    activeOpacity={0.85}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.subjectName}>{getSubjectName(g.subjectId, subjectsById)}</Text>
                                        <Text style={styles.subjectMeta}>{formatDurationMs(g.durationMs)} · {g.questionCount}문항</Text>
                                    </View>
                                    <Ionicons name={isSubjectOpen ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textMuted} />
                                </TouchableOpacity>

                                {isSubjectOpen && (
                                    <View style={styles.segmentList}>
                                        {g.segments.map((seg) => {
                                            const segQuestions = questionsBySegmentId[seg.id] ?? [];
                                            const isSegOpen = expandedSegmentId === seg.id;
                                            return (
                                                <View key={seg.id} style={styles.segmentCard}>
                                                    <TouchableOpacity
                                                        style={styles.segmentHeaderRow}
                                                        onPress={() => setExpandedSegmentId((prev) => (prev === seg.id ? null : seg.id))}
                                                        activeOpacity={0.85}
                                                    >
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={styles.segmentTitle}>
                                                                {formatClockTime(seg.startedAt)}
                                                                {seg.endedAt ? `–${formatClockTime(seg.endedAt)}` : ''}
                                                            </Text>
                                                            <Text style={styles.segmentMeta}>
                                                                {formatDurationMs(getSegmentDurationMs(seg, nowMs))} · {segQuestions.length}문항
                                                            </Text>
                                                        </View>
                                                        <Ionicons name={isSegOpen ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textMuted} />
                                                    </TouchableOpacity>

                                                    {isSegOpen && (
                                                        <View style={styles.questionList}>
                                                            {segQuestions.length === 0 ? (
                                                                <Text style={styles.noQuestionsText}>문제 기록 없음</Text>
                                                            ) : (
                                                                segQuestions.map((q) => (
                                                                    <View key={q.id} style={styles.questionRow}>
                                                                        <Text style={styles.qNo}>Q{String(q.questionNo).padStart(2, '0')}</Text>
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
                    })}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { gap: 18 },

    headerCard: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 14,
    },
    headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    modePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
    modePillText: { fontSize: 12, fontWeight: '900' },
    headerTime: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },

    summaryRow: { flexDirection: 'row', alignItems: 'center' },
    summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
    summaryLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
    summaryValue: { fontSize: 14, fontWeight: '900', color: COLORS.text },
    summaryDivider: { width: 1, height: 26, backgroundColor: COLORS.border },

    sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    sectionMeta: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },

    groupList: { gap: 12 },
    subjectCard: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    subjectHeaderRow: { paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
    subjectName: { fontSize: 16, fontWeight: '900', color: COLORS.text },
    subjectMeta: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginTop: 2 },

    segmentList: { paddingHorizontal: 12, paddingBottom: 12, gap: 10 },
    segmentCard: { backgroundColor: COLORS.bg, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
    segmentHeaderRow: { paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
    segmentTitle: { fontSize: 13, fontWeight: '900', color: COLORS.text },
    segmentMeta: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginTop: 2 },

    questionList: { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
    noQuestionsText: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, paddingTop: 2 },
    questionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    qNo: { fontSize: 12, fontWeight: '900', color: COLORS.primary, width: 44 },
    qTime: { fontSize: 12, fontWeight: '800', color: COLORS.text, fontVariant: ['tabular-nums'] },
    qClock: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, fontVariant: ['tabular-nums'] },

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

