import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
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

        // Find max duration for bar graph normalization
        const maxDuration = Math.max(...session.laps.map(l => l.duration), average * 2); // Ensure bar has some headroom

        return { targetPaceSec, efficientLaps, average, maxDuration };
    }, [session]);

    const sortedLaps = useMemo(() => {
        const copy = [...session.laps];
        if (lapSortMode === 'slowest') return copy.sort((a, b) => b.duration - a.duration);
        if (lapSortMode === 'fastest') return copy.sort((a, b) => a.duration - b.duration);
        return copy.sort((a, b) => a.questionNo - b.questionNo);
    }, [session.laps, lapSortMode]);

    const slowLaps = useMemo(() => {
        // Filter questions that took longer than average
        return [...session.laps].filter(l => l.duration > analysis.average).sort((a, b) => b.duration - a.duration);
    }, [session.laps, analysis.average]);

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

    const renderLapRow = (lap: any, showBadge = true) => {
        const isEfficient = lap.duration <= analysis.targetPaceSec;
        const isTimeSink = lap.duration > analysis.average;
        const barWidth = `${Math.min((lap.duration / analysis.maxDuration) * 100, 100)}%`;

        return (
            <View key={lap.questionNo} style={styles.lapRowContainer}>
                <View style={styles.lapRow}>
                    <View style={styles.lapNumber}>
                        <Text style={styles.lapNumberText}>{lap.questionNo}</Text>
                    </View>

                    <View style={styles.lapContent}>
                        <View style={styles.lapBarContainer}>
                            <View style={[styles.lapBar, { width: barWidth as any, backgroundColor: isTimeSink ? COLORS.accent : COLORS.primary }]} />
                        </View>
                        <View style={styles.lapMeta}>
                            <Text style={styles.lapTime}>{formatTime(lap.duration)}</Text>
                            {showBadge && (
                                isTimeSink ? (
                                    <View style={[styles.lapBadge, { backgroundColor: '#FFF1F2' }]}>
                                        <Text style={[styles.lapBadgeText, { color: COLORS.accent }]}>+{Math.round(lap.duration - analysis.average)}초</Text>
                                    </View>
                                ) : isEfficient ? (
                                    <View style={[styles.lapBadge, { backgroundColor: '#ECFDF5' }]}>
                                        <Text style={[styles.lapBadgeText, { color: COLORS.success }]}>안정</Text>
                                    </View>
                                ) : null
                            )}
                        </View>
                    </View>
                </View>
            </View>
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

            {/* Session Bar Chart */}
            <View style={styles.chartContainer}>
                <View style={styles.yAxis}>
                    <Text style={styles.yAxisLabel}>{formatTime(analysis.maxDuration)}</Text>
                    <Text style={styles.yAxisLabel}>{formatTime(Math.round(analysis.maxDuration / 2))}</Text>
                    <Text style={styles.yAxisLabel}>0</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
                    <View style={styles.chartBars}>
                        {/* Average Line */}
                        <View
                            style={[
                                styles.averageLine,
                                { bottom: `${(analysis.average / analysis.maxDuration) * 100 + 10}%` }
                            ]}
                        >
                            <View style={styles.averageLabel}>
                                <Text style={styles.averageLabelText}>평균 {formatTime(analysis.average)}</Text>
                            </View>
                        </View>

                        {session.laps.map((lap, i) => {
                            const barHeight = `${(lap.duration / analysis.maxDuration) * 100}%`;
                            const isSlow = lap.duration > analysis.average;
                            return (
                                <View key={i} style={styles.barItem}>
                                    <View style={styles.barWrapper}>
                                        <View
                                            style={[
                                                styles.bar,
                                                { height: barHeight as any, backgroundColor: isSlow ? COLORS.accent : COLORS.primary }
                                            ]}
                                        />
                                    </View>
                                    <Text style={styles.barLabel}>{lap.questionNo}</Text>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            </View>

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

            {slowLaps.length > 0 && (
                <View style={styles.slowSection}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="alert-circle-outline" size={18} color={COLORS.accent} />
                        <Text style={styles.slowTitle}>평균보다 오래 걸린 문항 ({slowLaps.length})</Text>
                    </View>
                    <View style={styles.slowList}>
                        {slowLaps.map(lap => renderLapRow(lap))}
                    </View>
                </View>
            )}

            <View style={styles.lapHeader}>
                <Text style={styles.lapTitle}>전체 문항</Text>
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
                sortedLaps.map(lap => renderLapRow(lap, true))
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 8,
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
        fontSize: 22,
        fontWeight: '900',
        color: COLORS.text,
    },
    subtitle: {
        fontSize: 13,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    chartContainer: {
        height: 180,
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 12,
        flexDirection: 'row',
        marginTop: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    yAxis: {
        width: 45,
        justifyContent: 'space-between',
        paddingVertical: 20,
        borderRightWidth: 1,
        borderRightColor: COLORS.border,
    },
    yAxisLabel: {
        fontSize: 10,
        color: COLORS.textMuted,
        fontWeight: '600',
        textAlign: 'right',
        paddingRight: 6,
    },
    chartScroll: {
        flex: 1,
        paddingLeft: 10,
    },
    chartBars: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: '100%',
        paddingBottom: 20,
        paddingTop: 10,
    },
    barItem: {
        width: 30,
        height: '100%',
        alignItems: 'center',
        marginRight: 8,
    },
    barWrapper: {
        flex: 1,
        width: '100%',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    bar: {
        width: 14,
        borderRadius: 4,
    },
    barLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.textMuted,
        marginTop: 6,
        height: 14,
    },
    averageLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: COLORS.accent,
        borderStyle: 'dashed',
        opacity: 0.5,
        zIndex: 5,
    },
    averageLabel: {
        position: 'absolute',
        right: 0,
        top: -18,
        backgroundColor: COLORS.accent,
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
    },
    averageLabelText: {
        color: COLORS.white,
        fontSize: 9,
        fontWeight: '800',
    },
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 8,
    },
    summaryBox: {
        flexBasis: '31%',
        flexGrow: 1,
        borderRadius: 14,
        padding: 10,
        minHeight: 80,
    },
    summaryLabel: {
        fontSize: 11,
        color: COLORS.textMuted,
        fontWeight: '700',
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 15,
        fontWeight: '800',
        color: COLORS.text,
        fontVariant: ['tabular-nums'],
    },
    summaryValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    summaryHelper: {
        marginTop: 4,
        fontSize: 10,
        color: COLORS.textMuted,
    },
    // Slow Section
    slowSection: {
        marginBottom: 16,
        backgroundColor: '#FFF5F5',
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: '#FECACA'
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10
    },
    slowTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.accent
    },
    slowList: {
        gap: 6
    },

    // Lap List
    lapHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
        marginBottom: 8
    },
    lapTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.text,
    },
    sortToggle: {
        flexDirection: 'row',
        backgroundColor: COLORS.border,
        padding: 2,
        borderRadius: 8,
    },
    sortToggleItem: {
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 6,
    },
    sortToggleItemActive: {
        backgroundColor: COLORS.surface,
    },
    sortToggleText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    sortToggleTextActive: {
        color: COLORS.text,
    },
    lapRowContainer: {
        marginBottom: 8,
    },
    lapRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 10,
    },
    lapNumber: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    lapNumberText: {
        fontSize: 13,
        fontWeight: '800',
        color: COLORS.text,
    },
    lapContent: {
        flex: 1,
        justifyContent: 'center',
    },
    lapMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        zIndex: 2,
    },
    lapTime: {
        fontSize: 14,
        fontWeight: '800',
        color: COLORS.text,
        fontVariant: ['tabular-nums'],
    },
    lapBadge: {
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
    },
    lapBadgeText: {
        fontSize: 10,
        fontWeight: '800',
    },
    lapBarContainer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: 'flex-end',
        opacity: 0.12,
        height: '100%',
        zIndex: 1,
    },
    lapBar: {
        height: '100%',
        borderRadius: 4,
    },
    emptyLaps: {
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    emptyText: {
        color: COLORS.textMuted,
        fontWeight: '700',
    },
});
