import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppStore } from '../lib/store';
import { COLORS } from '../lib/theme';

type Props = {
    selectedDate: string | null;
    onDateChange: (date: string | null) => void;
};

export function DailyAnalysis({ selectedDate, onDateChange }: Props) {
    const { questionRecords, subjects } = useAppStore();

    const analysis = useMemo(() => {
        const dateMap: Record<string, {
            totalMs: number,
            count: number,
            bySubject: Record<string, { count: number, totalMs: number, records: typeof questionRecords }>
        }> = {};

        questionRecords.forEach(r => {
            const date = new Date(r.startedAt).toISOString().split('T')[0];
            if (!dateMap[date]) {
                dateMap[date] = { totalMs: 0, count: 0, bySubject: {} };
            }
            dateMap[date].totalMs += r.durationMs;
            dateMap[date].count += 1;

            const subject = subjects.find(s => s.id === r.subjectId);
            const subjectName = subject?.name || 'Unknown';

            if (!dateMap[date].bySubject[subjectName]) {
                dateMap[date].bySubject[subjectName] = { count: 0, totalMs: 0, records: [] };
            }
            dateMap[date].bySubject[subjectName].count += 1;
            dateMap[date].bySubject[subjectName].totalMs += r.durationMs;
            dateMap[date].bySubject[subjectName].records.push(r);
        });

        return Object.entries(dateMap)
            .sort((a, b) => b[0].localeCompare(a[0]));
    }, [questionRecords, subjects]);

    const formatTime = (ms: number) => {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        if (h > 0) return `${h}시간 ${m}분`;
        return m > 0 ? `${m}분 ${s}초` : `${s}초`;
    };

    if (analysis.length === 0) {
        return (
            <View style={styles.empty}>
                <Ionicons name="stats-chart-outline" size={48} color={COLORS.border} />
                <Text style={styles.emptyText}>아직 기록된 매일의 분석이 없습니다.</Text>
            </View>
        );
    }

    if (selectedDate) {
        const dayData = analysis.find(([date]) => date === selectedDate)?.[1];
        if (!dayData) return null;

        return (
            <View style={styles.container}>
                <TouchableOpacity onPress={() => onDateChange(null)} style={styles.backLink}>
                    <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
                    <Text style={styles.backLinkText}>전체 목록으로</Text>
                </TouchableOpacity>

                <View style={styles.detailHeader}>
                    <Text style={styles.detailDate}>{selectedDate}</Text>
                    <View style={styles.totalBadge}>
                        <Text style={styles.totalBadgeLabel}>총 공부시간</Text>
                        <Text style={styles.totalBadgeValue}>{formatTime(dayData.totalMs)}</Text>
                    </View>
                </View>

                {Object.entries(dayData.bySubject).map(([sub, data]) => (
                    <View key={sub} style={styles.subjectCard}>
                        <View style={styles.subjectCardHeader}>
                            <View>
                                <Text style={styles.subjectNameDetail}>{sub}</Text>
                                <Text style={styles.subjectStatsDetail}>
                                    {data.count}개 문항 · {formatTime(data.totalMs)}
                                </Text>
                            </View>
                            <Ionicons name="book-outline" size={24} color={COLORS.primary} />
                        </View>

                        <View style={styles.questionList}>
                            {data.records.sort((a, b) => a.questionNo - b.questionNo).map((r) => (
                                <View key={r.id} style={styles.qItem}>
                                    <View style={styles.qBadge}>
                                        <Text style={styles.qBadgeText}>Q{r.questionNo}</Text>
                                    </View>
                                    <View style={styles.qBarContainer}>
                                        <View style={[styles.qBar, {
                                            width: `${Math.max(10, (r.durationMs / data.totalMs) * 100)}%`
                                        }]} />
                                    </View>
                                    <Text style={styles.qDuration}>{formatTime(r.durationMs)}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                ))}
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>일별 핵심 분석</Text>
            {analysis.slice(0, 7).map(([date, data]) => (
                <TouchableOpacity key={date} style={styles.dayCard} onPress={() => onDateChange(date)}>
                    <View style={styles.dayHeader}>
                        <View>
                            <Text style={styles.dateText}>{date}</Text>
                            <Text style={styles.totalText}>{formatTime(data.totalMs)}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={COLORS.border} />
                    </View>
                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Text style={styles.statLabel}>풀이 문항</Text>
                            <Text style={styles.statValue}>{data.count}개</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.subjectBreakdown}>
                            {Object.entries(data.bySubject).map(([sub, subData]) => (
                                <View key={sub} style={styles.subTag}>
                                    <Text style={styles.subName}>{sub}</Text>
                                    <Text style={styles.subCount}>{subData.count}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 8,
    },
    backLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    backLinkText: {
        fontSize: 14,
        fontWeight: '800',
        color: COLORS.primary,
    },
    detailHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    detailDate: {
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.text,
    },
    totalBadge: {
        alignItems: 'flex-end',
    },
    totalBadgeLabel: {
        fontSize: 11,
        color: COLORS.textMuted,
        fontWeight: '700',
    },
    totalBadgeValue: {
        fontSize: 18,
        fontWeight: '900',
        color: COLORS.primary,
    },
    subjectCard: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 16,
    },
    subjectCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingBottom: 16,
    },
    subjectNameDetail: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
    },
    subjectStatsDetail: {
        fontSize: 13,
        color: COLORS.textMuted,
        fontWeight: '600',
        marginTop: 2,
    },
    questionList: {
        gap: 12,
    },
    qItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    qBadge: {
        backgroundColor: COLORS.bg,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        minWidth: 44,
        alignItems: 'center',
    },
    qBadgeText: {
        fontSize: 12,
        fontWeight: '800',
        color: COLORS.textMuted,
    },
    qBarContainer: {
        flex: 1,
        height: 8,
        backgroundColor: COLORS.bg,
        borderRadius: 4,
        overflow: 'hidden',
    },
    qBar: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 4,
    },
    qDuration: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.text,
        minWidth: 60,
        textAlign: 'right',
    },
    dayCard: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    dayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    dateText: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.text,
    },
    totalText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.primary,
        marginTop: 2,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    stat: {
        gap: 4,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    statValue: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
    },
    divider: {
        width: 1,
        height: 30,
        backgroundColor: COLORS.border,
    },
    subjectBreakdown: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    subTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bg,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    subName: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    subCount: {
        fontSize: 11,
        fontWeight: '800',
        color: COLORS.primary,
    },
    empty: {
        alignItems: 'center',
        padding: 40,
        gap: 12,
    },
    emptyText: {
        color: COLORS.textMuted,
        fontSize: 14,
        fontWeight: '500',
    },
});
