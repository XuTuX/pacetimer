import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { ExamSession } from '../lib/storage';
import { COLORS } from '../lib/theme';

export type LapSortMode = 'number' | 'slowest' | 'fastest';

type Props = {
    session: ExamSession;
    initialSortMode?: LapSortMode;
    style?: StyleProp<ViewStyle>;
    showDate?: boolean;
};

const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}분 ${s}초`;
};

const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

export default function SessionDetail({ session, initialSortMode = 'number', style, showDate = true }: Props) {
    const [lapSortMode, setLapSortMode] = useState<LapSortMode>(initialSortMode);

    useEffect(() => {
        setLapSortMode(initialSortMode);
    }, [session.id, initialSortMode]);

    const analysis = useMemo(() => {
        const targetPaceSec = session.targetSeconds / session.totalQuestions;
        const efficientLaps = session.laps.filter(l => l.duration <= targetPaceSec).length;
        const average = session.totalQuestions ? Math.floor(session.totalSeconds / session.totalQuestions) : 0;
        return { targetPaceSec, efficientLaps, average };
    }, [session]);

    const sortedLaps = useMemo(() => {
        const copy = [...session.laps];
        if (lapSortMode === 'slowest') return copy.sort((a, b) => b.duration - a.duration);
        if (lapSortMode === 'fastest') return copy.sort((a, b) => a.duration - b.duration);
        return copy.sort((a, b) => a.questionNo - b.questionNo);
    }, [session.laps, lapSortMode]);

    const renderSortButton = (mode: LapSortMode, label: string) => {
        const isActive = lapSortMode === mode;
        return (
            <TouchableOpacity
                key={mode}
                style={[styles.sortToggleItem, isActive && styles.sortToggleItemActive]}
                onPress={() => setLapSortMode(mode)}
            >
                <Text style={[styles.sortToggleText, isActive && styles.sortToggleTextActive]}>{label}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, style]}>
            <View style={styles.header}>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{session.categoryName}</Text>
                </View>
                {showDate && <Text style={styles.dateText}>{formatDate(session.date)}</Text>}
            </View>

            <Text style={styles.title} numberOfLines={1}>{session.title}</Text>
            <Text style={styles.subtitle}>{session.totalQuestions}문항 · 목표 {formatTime(session.targetSeconds)}</Text>

            <View style={styles.summaryGrid}>
                <View style={[styles.summaryBox, { backgroundColor: COLORS.primaryLight }]}>
                    <Text style={styles.summaryLabel}>소요 시간</Text>
                    <View style={styles.summaryValueRow}>
                        <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                        <Text style={styles.summaryValue}>{formatTime(session.totalSeconds)}</Text>
                    </View>
                </View>
                <View style={[styles.summaryBox, { backgroundColor: '#ECFDF5' }]}>
                    <Text style={styles.summaryLabel}>평균 페이스</Text>
                    <Text style={styles.summaryValue}>{formatTime(analysis.average)}</Text>
                </View>
                <View style={[styles.summaryBox, { backgroundColor: '#FDF2F8' }]}>
                    <Text style={styles.summaryLabel}>목표 내 달성</Text>
                    <Text style={[styles.summaryValue, { color: COLORS.accent }]}>{analysis.efficientLaps}문항</Text>
                    <Text style={styles.summaryHelper}>목표 페이스 {formatTime(Math.round(analysis.targetPaceSec))}</Text>
                </View>
            </View>

            <View style={styles.lapHeader}>
                <Text style={styles.lapTitle}>문항별 상세 기록</Text>
                <View style={styles.sortToggle}>
                    {renderSortButton('number', '번호순')}
                    {renderSortButton('slowest', '느린순')}
                    {renderSortButton('fastest', '빠른순')}
                </View>
            </View>

            {sortedLaps.length === 0 ? (
                <View style={styles.emptyLaps}>
                    <Text style={styles.emptyText}>기록된 문항이 없습니다.</Text>
                </View>
            ) : (
                sortedLaps.map(lap => {
                    const isEfficient = lap.duration <= analysis.targetPaceSec;
                    const isTimeSink = lap.duration > analysis.targetPaceSec * 1.5;
                    return (
                        <View key={lap.questionNo} style={styles.lapRow}>
                            <View style={styles.lapNumber}>
                                <Text style={styles.lapNumberText}>{lap.questionNo}</Text>
                            </View>
                            <Text style={styles.lapTime}>{formatTime(lap.duration)}</Text>
                            {isTimeSink ? (
                                <View style={[styles.lapBadge, { backgroundColor: '#FFF1F2' }]}>
                                    <Text style={[styles.lapBadgeText, { color: COLORS.accent }]}>지체</Text>
                                </View>
                            ) : isEfficient ? (
                                <View style={[styles.lapBadge, { backgroundColor: '#ECFDF5' }]}>
                                    <Text style={[styles.lapBadgeText, { color: COLORS.success }]}>안정</Text>
                                </View>
                            ) : null}
                        </View>
                    );
                })
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    badge: {
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    badgeText: {
        color: COLORS.primary,
        fontSize: 12,
        fontWeight: '800',
    },
    dateText: {
        color: COLORS.textMuted,
        fontSize: 13,
        fontWeight: '600',
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.text,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 10,
    },
    summaryBox: {
        flexBasis: '32%',
        flexGrow: 1,
        borderRadius: 16,
        padding: 14,
        minHeight: 90,
    },
    summaryLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: '700',
        marginBottom: 6,
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.text,
        fontVariant: ['tabular-nums'],
    },
    summaryValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    summaryHelper: {
        marginTop: 6,
        fontSize: 12,
        color: COLORS.textMuted,
    },
    lapHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    lapTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
    },
    sortToggle: {
        flexDirection: 'row',
        backgroundColor: COLORS.border,
        padding: 3,
        borderRadius: 10,
    },
    sortToggleItem: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    sortToggleItemActive: {
        backgroundColor: COLORS.surface,
    },
    sortToggleText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    sortToggleTextActive: {
        color: COLORS.text,
    },
    lapRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 18,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 12,
    },
    lapNumber: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    lapNumberText: {
        fontSize: 14,
        fontWeight: '800',
        color: COLORS.text,
    },
    lapTime: {
        flex: 1,
        fontSize: 15,
        fontWeight: '800',
        color: COLORS.text,
        fontVariant: ['tabular-nums'],
    },
    lapBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    lapBadgeText: {
        fontSize: 11,
        fontWeight: '800',
    },
    emptyLaps: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    emptyText: {
        color: COLORS.textMuted,
        fontWeight: '700',
    },
});
