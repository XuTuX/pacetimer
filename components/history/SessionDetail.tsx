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

type MergedGroup = {
    mainSubjectId: string;
    durationMs: number;
    questionCount: number;
    questionRecords: QuestionRecord[];
};

export default function SessionDetail({ nowMs, session, sessionStats, segments, questionsBySegmentId, subjectsById }: Props) {
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

    const mergedGroups = useMemo(() => {
        const groups: MergedGroup[] = [];
        let currentGroup: MergedGroup | null = null;
        const sortedSegments = [...segments].sort((a, b) => a.startedAt - b.startedAt);

        for (const seg of sortedSegments) {
            const segDuration = getSegmentDurationMs(seg, nowMs);
            const segQuestions = questionsBySegmentId[seg.id] ?? [];

            if (seg.subjectId === '__review__') {
                if (currentGroup) {
                    currentGroup.durationMs += segDuration;
                    currentGroup.questionCount += segQuestions.length;
                    currentGroup.questionRecords.push(...segQuestions);
                } else {
                    groups.push({
                        mainSubjectId: '__review__',
                        durationMs: segDuration,
                        questionCount: segQuestions.length,
                        questionRecords: [...segQuestions],
                    });
                }
            } else {
                const existingGroup = groups.find(g => g.mainSubjectId === seg.subjectId);
                if (existingGroup) {
                    existingGroup.durationMs += segDuration;
                    existingGroup.questionCount += segQuestions.length;
                    existingGroup.questionRecords.push(...segQuestions);
                    currentGroup = existingGroup;
                } else {
                    const newGroup: MergedGroup = {
                        mainSubjectId: seg.subjectId,
                        durationMs: segDuration,
                        questionCount: segQuestions.length,
                        questionRecords: [...segQuestions],
                    };
                    groups.push(newGroup);
                    currentGroup = newGroup;
                }
            }
        }
        return groups.sort((a, b) => b.durationMs - a.durationMs);
    }, [segments, nowMs, questionsBySegmentId]);

    const handleSubjectPress = (subjectId: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelectedSubjectId(subjectId);
        setViewMode('detail');
    };

    const handleBack = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setViewMode('list');
        setSelectedSubjectId(null);
    };

    const modeInfo = getModeInfo(session);
    const title = (session.title ?? (session.mode === 'mock-exam' ? '모의고사' : '학습 세션')).replace(/^(\[.*?\]\s*|.*?•\s*)+/, '');

    const renderDetailView = () => {
        const group = mergedGroups.find(g => g.mainSubjectId === selectedSubjectId);
        if (!group) return null;
        const subjectName = getSubjectName(group.mainSubjectId, subjectsById);

        return (
            <View>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
                    <Text style={styles.backButtonText}>목록으로</Text>
                </TouchableOpacity>

                <View style={styles.detailHeader}>
                    <Text style={styles.detailTitle}>{subjectName}</Text>
                    <Text style={styles.detailSubtitle}>
                        {formatDurationMs(group.durationMs)} · {group.questionCount} 문제
                    </Text>
                </View>

                <View style={styles.questionListContainer}>
                    {group.questionRecords.length === 0 ? (
                        <View style={styles.emptyQuestions}>
                            <Text style={styles.emptyQuestionsText}>등록된 문항 기록이 없습니다.</Text>
                        </View>
                    ) : (
                        group.questionRecords.map((q, idx) => (
                            <View key={q.id} style={styles.questionRow}>
                                <View style={styles.qIndexCircle}>
                                    <Text style={styles.qIndexText}>{idx + 1}</Text>
                                </View>
                                <View style={styles.qInfo}>
                                    <Text style={styles.qNo}>Q{q.questionNo}</Text>
                                    <Text style={styles.qTimestamp}>{formatClockTime(q.startedAt)}</Text>
                                </View>
                                <Text style={styles.qDuration}>{formatDurationMs(q.durationMs)}</Text>
                            </View>
                        ))
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {viewMode === 'list' && (
                <>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.topRow}>
                            <View style={[styles.badge, { backgroundColor: modeInfo.bg }]}>
                                <Ionicons name={modeInfo.icon} size={10} color={modeInfo.color} style={{ marginRight: 4 }} />
                                <Text style={[styles.badgeText, { color: modeInfo.color }]}>{modeInfo.label}</Text>
                            </View>
                        </View>
                        <Text style={styles.mainTitle}>{title}</Text>
                        <Text style={styles.subTitle}>{formatClockTime(session.startedAt)} 시작</Text>
                    </View>

                    {/* Stats Summary Bento Grid */}
                    <View style={styles.statsContainer}>
                        {/* 왼쪽: 총 시간 (아이콘과 라벨이 한 줄) */}
                        <View style={[styles.statCard, styles.statCardLarge]}>
                            <View style={styles.statLabelRow}>
                                <Ionicons name="time" size={14} color={COLORS.primary} />
                                <Text style={styles.statLabel}>TOTAL TIME</Text>
                            </View>
                            <Text style={styles.statValueLarge}>{formatDurationMs(sessionStats.durationMs)}</Text>
                        </View>

                        {/* 오른쪽: 요약 정보 (문제수, 과목수) */}
                        <View style={styles.statRightCol}>
                            <View style={styles.statCardSmall}>
                                <Text style={styles.statValueMedium}>{sessionStats.questionCount}문제</Text>
                            </View>
                            <View style={styles.statCardSmall}>
                                <Text style={styles.statValueMedium}>{mergedGroups.length}과목</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Content List */}
                    <View style={styles.listContainer}>
                        {mergedGroups.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="cloud-offline-outline" size={48} color={PALETTE.gray300} />
                                <Text style={styles.emptyText}>상세 기록이 존재하지 않습니다</Text>
                            </View>
                        ) : (
                            mergedGroups.map((g) => {
                                const rawSubjectName = getSubjectName(g.mainSubjectId, subjectsById);
                                const subjectName = (rawSubjectName === '기타' && title) ? title : rawSubjectName;
                                return (
                                    <TouchableOpacity
                                        key={g.mainSubjectId}
                                        style={styles.subjectCard}
                                        onPress={() => handleSubjectPress(g.mainSubjectId)}
                                        activeOpacity={0.6}
                                    >
                                        <View style={styles.subjectRow}>
                                            <View style={styles.subjectInfo}>
                                                <Text style={styles.subjectName}>{subjectName}</Text>
                                                <Text style={styles.subjectStats}>
                                                    {formatDurationMs(g.durationMs)} · {g.questionCount} 문제
                                                </Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={20} color={PALETTE.gray400} />
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </View>
                </>
            )}

            {viewMode === 'detail' && renderDetailView()}
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

    // Stats Grid
    statsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
    },
    statCardLarge: {
        flex: 1.3,
        height: 100,
        justifyContent: 'center',
    },
    statLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: PALETTE.gray400,
        letterSpacing: 0.5,
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
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1,
    },
    statValueLarge: {
        fontSize: 26,
        fontWeight: '800',
        color: COLORS.text,
        letterSpacing: -0.5,
    },
    statValueMedium: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },

    divider: {
        height: 1,
        backgroundColor: PALETTE.gray100,
        marginBottom: 20,
    },

    // List & Detail Styles
    listContainer: {
        gap: 12,
    },
    subjectCard: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: PALETTE.gray100,
    },
    subjectRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    subjectInfo: {
        gap: 4,
    },
    subjectName: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    subjectStats: {
        fontSize: 13,
        color: PALETTE.gray500,
        fontWeight: '500',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingVertical: 8,
    },
    backButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.primary,
        marginLeft: 4,
    },
    detailHeader: {
        marginBottom: 24,
        paddingHorizontal: 4,
    },
    detailTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 4,
    },
    detailSubtitle: {
        fontSize: 15,
        color: PALETTE.gray500,
        fontWeight: '600',
    },
    questionListContainer: {
        gap: 12,
    },
    emptyQuestions: {
        padding: 24,
        alignItems: 'center',
    },
    emptyQuestionsText: {
        color: PALETTE.gray400,
        fontSize: 14,
    },
    questionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: PALETTE.gray100,
    },
    qIndexCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: PALETTE.gray100,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    qIndexText: {
        fontSize: 11,
        fontWeight: '700',
        color: PALETTE.gray500,
    },
    qInfo: {
        flex: 1,
    },
    qNo: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 2,
    },
    qTimestamp: {
        fontSize: 11,
        color: PALETTE.gray400,
    },
    qDuration: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.primary,
        fontVariant: ['tabular-nums'],
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