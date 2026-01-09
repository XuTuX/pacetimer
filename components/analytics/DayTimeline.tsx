import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatDurationMs } from '../../lib/studyDate';
import { COLORS } from '../../lib/theme';
import { QuestionRecord, Segment, Session, Subject } from '../../lib/types';

interface Props {
    date: string;
    sessions: Session[];
    segments: Segment[];
    questions: QuestionRecord[];
    subjects: Subject[];
    onViewHistory: (date: string) => void;
}

const TIMELINE_HEIGHT = 100;
const PADDING_HORIZONTAL = 20;

export const DayTimeline: React.FC<Props> = ({
    date,
    sessions,
    segments,
    questions,
    subjects,
    onViewHistory,
}) => {
    const subjectsMap = useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects]);

    // Calculate timeline range
    const range = useMemo(() => {
        if (sessions.length === 0) return null;
        const sorted = [...sessions].sort((a, b) => a.startedAt - b.startedAt);
        const start = sorted[0].startedAt;
        const end = Math.max(...sessions.map(s => s.endedAt ?? Date.now()));
        // Add 30 mins buffer if possible
        const buffer = 30 * 60 * 1000;
        return { start: start - buffer, end: end + buffer, duration: (end + buffer) - (start - buffer) };
    }, [sessions]);

    const [tooltip, setTooltip] = useState<{
        type: 'segment' | 'question' | 'rest';
        data: any;
        x: number;
        y: number;
    } | null>(null);

    if (!range) {
        return (
            <View style={styles.empty}>
                <Text style={styles.emptyText}>해당 날짜에 공부 기록이 없습니다.</Text>
            </View>
        );
    }

    const getX = (timestamp: number) => {
        return `${((timestamp - range.start) / range.duration) * 100}%` as any;
    };

    const getWidth = (duration: number) => {
        return `${(duration / range.duration) * 100}%` as any;
    };

    // Calculate rest blocks
    const restBlocks = useMemo(() => {
        const blocks: { start: number; end: number; duration: number }[] = [];
        const sortedSegments = [...segments].sort((a, b) => a.startedAt - b.startedAt);

        for (let i = 0; i < sortedSegments.length - 1; i++) {
            const currentEnd = sortedSegments[i].endedAt;
            const nextStart = sortedSegments[i + 1].startedAt;
            const currentSessionId = sortedSegments[i].sessionId;
            const nextSessionId = sortedSegments[i + 1].sessionId;

            if (currentEnd && nextStart > currentEnd) {
                blocks.push({
                    start: currentEnd,
                    end: nextStart,
                    duration: nextStart - currentEnd,
                });
            }
        }
        return blocks;
    }, [segments]);

    const handleSegmentPress = (seg: Segment) => {
        const segQuestions = questions.filter(q => q.segmentId === seg.id);
        const duration = (seg.endedAt ?? Date.now()) - seg.startedAt;
        const avgTime = segQuestions.length > 0 ? duration / segQuestions.length : 0;

        setTooltip({
            type: 'segment',
            data: {
                name: subjectsMap.get(seg.subjectId)?.name ?? '기타',
                duration,
                questionCount: segQuestions.length,
                avgTime,
            },
            x: 0, y: 0 // Modal centered
        });
    };

    const handleQuestionPress = (q: QuestionRecord) => {
        setTooltip({
            type: 'question',
            data: {
                no: q.questionNo,
                duration: q.durationMs,
            },
            x: 0, y: 0
        });
    };

    const formatTime = (ts: number) => {
        const d = new Date(ts);
        return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    const formatMMSS = (ms: number) => {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>학습 타임라인</Text>
            </View>

            <View style={styles.timelineWrapper}>
                <View style={styles.axis}>
                    {/* Time ticks */}
                    {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                        <View key={i} style={[styles.tick, { left: `${p * 100}%` }]}>
                            <Text style={styles.tickText}>{formatTime(range.start + range.duration * p)}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.timeline}>
                    {/* Rest Blocks */}
                    {restBlocks.map((rest, i) => (
                        <View
                            key={`rest-${i}`}
                            style={[
                                styles.restBlock,
                                { left: getX(rest.start), width: getWidth(rest.duration) }
                            ]}
                        />
                    ))}

                    {/* Segments */}
                    {segments.map((seg) => (
                        <TouchableOpacity
                            key={seg.id}
                            activeOpacity={0.8}
                            onPress={() => handleSegmentPress(seg)}
                            style={[
                                styles.segmentBlock,
                                {
                                    left: getX(seg.startedAt),
                                    width: getWidth((seg.endedAt ?? Date.now()) - seg.startedAt),
                                    backgroundColor: COLORS.primary,
                                }
                            ]}
                        />
                    ))}

                    {/* Questions */}
                    {questions.map((q) => (
                        <TouchableOpacity
                            key={q.id}
                            onPress={() => handleQuestionPress(q)}
                            style={[styles.questionDot, { left: getX(q.endedAt) }]}
                        />
                    ))}

                    {/* Session boundaries */}
                    {sessions.map((s, i) => (
                        <View key={s.id} style={[styles.sessionDivider, { left: getX(s.startedAt) }]}>
                            <View style={styles.sessionLabel}>
                                <Text style={styles.sessionLabelText}>Session {i + 1}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </View>

            {/* Tooltip Modal */}
            <Modal transparent visible={!!tooltip} animationType="fade">
                <Pressable style={styles.modalOverlay} onPress={() => setTooltip(null)}>
                    <View style={styles.tooltipCard}>
                        {tooltip?.type === 'segment' && (
                            <>
                                <Text style={styles.tooltipTitle}>{tooltip.data.name}</Text>
                                <View style={styles.tooltipGrid}>
                                    <View style={styles.tooltipItem}>
                                        <Text style={styles.tooltipLabel}>소요 시간</Text>
                                        <Text style={styles.tooltipValue}>{formatDurationMs(tooltip.data.duration)}</Text>
                                    </View>
                                    <View style={styles.tooltipItem}>
                                        <Text style={styles.tooltipLabel}>해결 문항</Text>
                                        <Text style={styles.tooltipValue}>{tooltip.data.questionCount}개</Text>
                                    </View>
                                    <View style={styles.tooltipItem}>
                                        <Text style={styles.tooltipLabel}>평균 시간</Text>
                                        <Text style={styles.tooltipValue}>{formatMMSS(tooltip.data.avgTime)}</Text>
                                    </View>
                                </View>
                            </>
                        )}
                        {tooltip?.type === 'question' && (
                            <>
                                <Text style={styles.tooltipTitle}>{tooltip.data.no}번 문항</Text>
                                <View style={styles.tooltipItem}>
                                    <Text style={styles.tooltipLabel}>풀이 시간</Text>
                                    <Text style={styles.tooltipValue}>{formatMMSS(tooltip.data.duration)}</Text>
                                </View>
                            </>
                        )}
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setTooltip(null)}>
                            <Text style={styles.closeBtnText}>닫기</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 24,
        padding: 24,
        backgroundColor: COLORS.white,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: '900',
        color: COLORS.text,
    },
    link: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.primary,
    },
    empty: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    timelineWrapper: {
        height: 140,
        justifyContent: 'flex-end',
    },
    timeline: {
        height: 48,
        backgroundColor: COLORS.surfaceVariant,
        borderRadius: 12,
        position: 'relative',
        overflow: 'hidden',
    },
    axis: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 20,
    },
    tick: {
        position: 'absolute',
        width: 1,
        height: 4,
        backgroundColor: COLORS.border,
        bottom: -6,
    },
    tickText: {
        position: 'absolute',
        top: -20,
        width: 60,
        marginLeft: -30,
        textAlign: 'center',
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    restBlock: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    segmentBlock: {
        position: 'absolute',
        top: 4,
        bottom: 4,
        borderRadius: 6,
    },
    questionDot: {
        position: 'absolute',
        top: '50%',
        marginTop: -3,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderWidth: 1,
        borderColor: COLORS.primary,
        zIndex: 10,
    },
    sessionDivider: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 2,
        backgroundColor: 'rgba(0,0,0,0.1)',
        zIndex: 5,
    },
    sessionLabel: {
        position: 'absolute',
        top: -20,
        left: 4,
    },
    sessionLabelText: {
        fontSize: 9,
        fontWeight: '800',
        color: COLORS.textMuted,
        backgroundColor: COLORS.white,
        paddingHorizontal: 4,
        borderRadius: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tooltipCard: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 24,
        width: '80%',
        maxWidth: 320,
        gap: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    tooltipTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: COLORS.text,
    },
    tooltipGrid: {
        gap: 12,
    },
    tooltipItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tooltipLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    tooltipValue: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.text,
    },
    closeBtn: {
        backgroundColor: COLORS.surfaceVariant,
        paddingVertical: 12,
        borderRadius: 16,
        alignItems: 'center',
    },
    closeBtnText: {
        fontSize: 15,
        fontWeight: '800',
        color: COLORS.text,
    },
});
