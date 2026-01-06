import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { ExamSession } from '../lib/storage';
import { COLORS } from '../lib/theme';

export type LapSortMode = 'number' | 'slowest' | 'fastest';

type Props = {
    session: ExamSession;
    initialSortMode?: LapSortMode;
    style?: StyleProp<ViewStyle>;
    showDate?: boolean;
    onBack?: () => void;
};

const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}분 ${s}초`;
};

const formatTimeShort = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
};

const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

const formatDateFull = (dateString: string) => {
    const d = new Date(dateString);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `${d.getMonth() + 1}/${d.getDate()} ${days[d.getDay()]}`;
};

export default function SessionDetail({ session, initialSortMode = 'number', style, showDate = true, onBack }: Props) {
    const [lapSortMode, setLapSortMode] = useState<LapSortMode>(initialSortMode);
    const [activeTab, setActiveTab] = useState<'summary' | 'all'>('summary');
    const viewShotRef = useRef<View>(null);

    useEffect(() => {
        setLapSortMode(initialSortMode);
    }, [session.id, initialSortMode]);

    const analysis = useMemo(() => {
        const targetPaceSec = session.targetSeconds / session.totalQuestions;
        const efficientLaps = session.laps.filter(l => l.duration <= targetPaceSec).length;
        const average = session.totalQuestions ? Math.floor(session.totalSeconds / session.totalQuestions) : 0;
        const maxDuration = Math.max(...session.laps.map(l => l.duration), average * 2);

        return { targetPaceSec, efficientLaps, average, maxDuration };
    }, [session]);

    const sortedLaps = useMemo(() => {
        const copy = [...session.laps];
        if (lapSortMode === 'slowest') return copy.sort((a, b) => b.duration - a.duration);
        if (lapSortMode === 'fastest') return copy.sort((a, b) => a.duration - b.duration);
        return copy.sort((a, b) => a.questionNo - b.questionNo);
    }, [session.laps, lapSortMode]);

    const slowLaps = useMemo(() => {
        return [...session.laps].filter(l => l.duration > analysis.average).sort((a, b) => b.duration - a.duration);
    }, [session.laps, analysis.average]);

    const handleShare = async () => {
        try {
            if (viewShotRef.current) {
                const uri = await captureRef(viewShotRef, {
                    format: 'png',
                    quality: 1,
                    result: 'tmpfile'
                });
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(uri);
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const renderLapRow = (lap: any, showBadge = true, isCompact = false) => {
        const isEfficient = lap.duration <= analysis.targetPaceSec;
        const isTimeSink = lap.duration > analysis.average;
        const barWidth = `${Math.min((lap.duration / analysis.maxDuration) * 100, 100)}%`;

        return (
            <View key={lap.questionNo} style={[styles.lapRowContainer, isCompact && { marginBottom: 8 }]}>
                <View style={[styles.lapRow, isCompact && styles.lapRowCompact]}>
                    <View style={[styles.lapNumber, isCompact && styles.lapNumberCompact]}>
                        <Text style={[styles.lapNumberText, isCompact && { fontSize: 11 }]}>{lap.questionNo}</Text>
                    </View>

                    <View style={styles.lapContent}>
                        <View style={styles.lapBarContainer}>
                            <View style={[styles.lapBar, { width: barWidth as any, backgroundColor: isTimeSink ? COLORS.accent : COLORS.primary }]} />
                        </View>
                        <View style={styles.lapMeta}>
                            <Text style={styles.lapTime}>{formatTime(lap.duration)}</Text>
                            {showBadge && (
                                isTimeSink ? (
                                    <View style={[styles.lapBadge, { backgroundColor: '#F1F5F9' }]}>
                                        <Text style={[styles.lapBadgeText, { color: COLORS.text }]}>+{Math.round(lap.duration - analysis.average)}s</Text>
                                    </View>
                                ) : isEfficient ? (
                                    <View style={[styles.lapBadge, { backgroundColor: COLORS.point }]}>
                                        <Text style={[styles.lapBadgeText, { color: COLORS.white }]}>Good</Text>
                                    </View>
                                ) : null
                            )}
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    const ChartView = ({ height = 150, showYAxis = true }: { height?: number, showYAxis?: boolean }) => (
        <View style={[styles.chartContainer, { height }]}>
            {showYAxis && (
                <View style={styles.yAxis}>
                    <Text style={styles.yAxisLabel}>{formatTimeShort(analysis.maxDuration)}</Text>
                    <Text style={styles.yAxisLabel}>{formatTimeShort(Math.round(analysis.maxDuration / 2))}</Text>
                    <Text style={styles.yAxisLabel}>0</Text>
                </View>
            )}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
                <View style={styles.chartBars}>
                    {/* Average Line */}
                    <View
                        style={[
                            styles.averageLine,
                            { bottom: `${(analysis.average / analysis.maxDuration) * 100 + 5}%` }
                        ]}
                    >
                        <View style={styles.averageLabel}>
                            <Text style={styles.averageLabelText}>AVG</Text>
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
    );

    const SummaryGrid = () => (
        <View style={styles.summaryGrid}>
            <View style={[styles.summaryBox, { backgroundColor: COLORS.surfaceVariant }]}>
                <Text style={styles.summaryLabel}>Total Time</Text>
                <Text style={styles.summaryValue}>{formatTime(session.totalSeconds)}</Text>
            </View>
            <View style={[styles.summaryBox, { backgroundColor: COLORS.surfaceVariant }]}>
                <Text style={styles.summaryLabel}>Avg Pace</Text>
                <Text style={styles.summaryValue}>{formatTime(analysis.average)}</Text>
            </View>
            <View style={[styles.summaryBox, { backgroundColor: COLORS.point }]}>
                <Text style={[styles.summaryLabel, { color: 'rgba(255,255,255,0.8)' }]}>On Target</Text>
                <Text style={[styles.summaryValue, { color: '#FFFFFF' }]}>{Math.round((analysis.efficientLaps / session.totalQuestions) * 100)}%</Text>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, style]}>
            {/* Header Area */}
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1 }}>
                    {onBack && (
                        <TouchableOpacity
                            onPress={onBack}
                            style={{ marginRight: 12, marginTop: 4, marginLeft: -4 }}
                        >
                            <Ionicons name="chevron-back" size={28} color={COLORS.text} />
                        </TouchableOpacity>
                    )}
                    <View style={{ flex: 1 }}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{session.categoryName}</Text>
                        </View>
                        <Text style={styles.title} numberOfLines={1}>{session.title}</Text>
                        {showDate && <Text style={styles.dateText}>{formatDate(session.date)}</Text>}
                    </View>
                </View>
                <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                    <Ionicons name="share-outline" size={20} color={COLORS.point} />
                    <Text style={styles.shareBtnText}>Share</Text>
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'summary' && styles.tabActive]}
                    onPress={() => setActiveTab('summary')}
                >
                    <Text style={[styles.tabText, activeTab === 'summary' && styles.tabTextActive]}>분석 요약</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'all' && styles.tabActive]}
                    onPress={() => setActiveTab('all')}
                >
                    <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>전체 문항</Text>
                    <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{session.totalQuestions}</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Content */}
            {activeTab === 'summary' ? (
                <View style={styles.tabContent}>
                    <SummaryGrid />
                    <ChartView height={160} />

                    {slowLaps.length > 0 ? (
                        <View style={styles.analysisModule}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="alert-circle" size={20} color={COLORS.accent} />
                                <Text style={styles.sectionTitle}>주의가 필요한 문항</Text>
                                <View style={styles.badgeSmall}>
                                    <Text style={styles.badgeSmallText}>{slowLaps.length}</Text>
                                </View>
                            </View>
                            <View style={styles.slowList}>
                                {slowLaps.slice(0, 3).map(lap => (
                                    <View key={lap.questionNo} style={styles.simpleLapRow}>
                                        <Text style={styles.simpleLapNo}>Q{lap.questionNo}</Text>
                                        <View style={styles.simpleLapBarBg}>
                                            <View style={[styles.simpleLapBar, { width: `${Math.min((lap.duration / analysis.maxDuration) * 100, 100)}%` as any }]} />
                                        </View>
                                        <Text style={styles.simpleLapTime}>{formatTime(lap.duration)}</Text>
                                        <Text style={[styles.simpleLapDiff, { color: COLORS.accent }]}>+{Math.round(lap.duration - analysis.average)}s</Text>
                                    </View>
                                ))}
                                {slowLaps.length > 3 && (
                                    <TouchableOpacity onPress={() => setActiveTab('all')} style={styles.viewMoreBtn}>
                                        <Text style={styles.viewMoreBtnText}>모두 보기 ({slowLaps.length})</Text>
                                        <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    ) : (
                        <View style={styles.goodJobBox}>
                            <View style={styles.goodJobIconContainer}>
                                <Ionicons name="sparkles" size={28} color={COLORS.point} />
                            </View>
                            <Text style={styles.goodJobTitle}>Perfect Pace!</Text>
                            <Text style={styles.goodJobText}>모든 문항을 평균 시간 내에 해결했습니다.</Text>
                        </View>
                    )}
                </View>
            ) : (
                <View style={styles.tabContent}>
                    <View style={styles.lapHeader}>
                        <View style={styles.sortToggle}>
                            <TouchableOpacity onPress={() => setLapSortMode('number')} style={[styles.sortBtn, lapSortMode === 'number' && styles.sortBtnActive]}>
                                <Text style={[styles.sortBtnText, lapSortMode === 'number' && styles.sortBtnTextActive]}>번호순</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setLapSortMode('slowest')} style={[styles.sortBtn, lapSortMode === 'slowest' && styles.sortBtnActive]}>
                                <Text style={[styles.sortBtnText, lapSortMode === 'slowest' && styles.sortBtnTextActive]}>느린순</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setLapSortMode('fastest')} style={[styles.sortBtn, lapSortMode === 'fastest' && styles.sortBtnActive]}>
                                <Text style={[styles.sortBtnText, lapSortMode === 'fastest' && styles.sortBtnTextActive]}>빠른순</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    {sortedLaps.map(lap => renderLapRow(lap, true))}
                </View>
            )}

            {/* Hidden Share Card (Rendered Off-Screen) */}
            <View
                collapsable={false}
                ref={viewShotRef}
                style={styles.shareCardContainer}
                pointerEvents="none"
            >
                <LinearGradient
                    colors={['#000000', '#333333']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.shareCardGradient}
                >
                    <View style={styles.shareCardContent}>
                        <View style={styles.shareHeader}>
                            <Text style={styles.shareTitle}>PACETIME</Text>
                            <Text style={styles.shareDate}>{formatDateFull(session.date)}</Text>
                        </View>

                        <View style={styles.shareBody}>
                            <Text style={styles.shareSessionTitle}>{session.title}</Text>
                            <View style={styles.shareBadge}>
                                <Text style={styles.shareBadgeText}>{session.categoryName}</Text>
                            </View>

                            <View style={styles.shareChartWrapper}>
                                <ChartView height={180} showYAxis={false} />
                            </View>
                        </View>

                        <View style={styles.shareFooter}>
                            <View style={styles.shareStat}>
                                <Text style={styles.shareStatLabel}>Total Time</Text>
                                <Text style={styles.shareStatValue}>{formatTime(session.totalSeconds)}</Text>
                            </View>
                            <View style={styles.shareDivider} />
                            <View style={styles.shareStat}>
                                <Text style={styles.shareStatLabel}>Questions</Text>
                                <Text style={styles.shareStatValue}>{session.totalQuestions}</Text>
                            </View>
                            <View style={styles.shareDivider} />
                            <View style={styles.shareStat}>
                                <Text style={styles.shareStatLabel}>Avg Pace</Text>
                                <Text style={styles.shareStatValue}>{formatTime(analysis.average)}</Text>
                            </View>
                        </View>
                    </View>
                </LinearGradient>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { gap: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
    badge: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 6 },
    badgeText: { color: COLORS.primary, fontSize: 10, fontWeight: '800' },
    title: { fontSize: 22, fontWeight: '900', color: COLORS.text, marginBottom: 2, marginRight: 16, flex: 1 },
    dateText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },

    shareBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4, borderWidth: 1, borderColor: COLORS.border },
    shareBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.text },

    tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 8 },
    tab: { paddingVertical: 12, marginRight: 24, flexDirection: 'row', alignItems: 'center', gap: 6 },
    tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
    tabText: { fontSize: 15, fontWeight: '600', color: COLORS.textMuted },
    tabTextActive: { color: COLORS.primary, fontWeight: '800' },
    countBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 },
    countBadgeText: { fontSize: 10, color: '#64748B', fontWeight: '700' },

    tabContent: { gap: 16 },

    // Chart
    chartContainer: { height: 150, backgroundColor: COLORS.surface, borderRadius: 16, padding: 12, flexDirection: 'row', borderWidth: 1, borderColor: COLORS.border },
    yAxis: { width: 36, justifyContent: 'space-between', paddingVertical: 10, borderRightWidth: 1, borderRightColor: '#E2E8F0', marginRight: 8 },
    yAxisLabel: { fontSize: 9, color: '#94A3B8', textAlign: 'right', paddingRight: 4, fontWeight: '600' },
    chartScroll: { flex: 1 },
    chartBars: { flexDirection: 'row', alignItems: 'flex-end', height: '100%', paddingBottom: 10, paddingTop: 10, paddingRight: 20 },
    barItem: { width: 14, height: '100%', alignItems: 'center', marginRight: 4 },
    barWrapper: { flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
    bar: { width: 6, borderRadius: 3, minHeight: 4 },
    barLabel: { fontSize: 8, fontWeight: '700', color: '#94A3B8', marginTop: 4 },
    averageLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: COLORS.accent, borderStyle: 'dashed', opacity: 0.5, zIndex: 10 },
    averageLabel: { position: 'absolute', right: -20, top: -10, backgroundColor: COLORS.accent, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
    averageLabelText: { color: 'white', fontSize: 7, fontWeight: '800' },

    // Summary Grid
    summaryGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    summaryBox: { flex: 1, borderRadius: 24, padding: 14, alignItems: 'center', justifyContent: 'center', gap: 4, height: 80 },
    summaryLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '700' },
    summaryValue: { fontSize: 16, fontWeight: '900', color: COLORS.text },
    summaryValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },

    // Analysis Module
    analysisModule: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: COLORS.border },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
    badgeSmall: { backgroundColor: COLORS.accent, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 },
    badgeSmallText: { fontSize: 10, color: 'white', fontWeight: '800' },
    slowList: { gap: 12 },
    simpleLapRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    simpleLapNo: { fontSize: 12, fontWeight: '800', color: COLORS.textMuted, width: 30 },
    simpleLapBarBg: { flex: 1, height: 6, backgroundColor: COLORS.surfaceVariant, borderRadius: 3, overflow: 'hidden' },
    simpleLapBar: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 3 },
    simpleLapTime: { fontSize: 13, fontWeight: '700', color: COLORS.text, fontVariant: ['tabular-nums'] },
    simpleLapDiff: { fontSize: 11, fontWeight: '700', width: 40, textAlign: 'right' },
    viewMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
    viewMoreBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },

    goodJobBox: { alignItems: 'center', padding: 32, backgroundColor: COLORS.white, borderRadius: 24, borderWidth: 1, borderColor: COLORS.border },
    goodJobIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.pointLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    goodJobTitle: { fontSize: 18, fontWeight: '900', color: COLORS.text, marginBottom: 4 },
    goodJobText: { color: COLORS.textMuted, fontWeight: '600', fontSize: 14, textAlign: 'center' },

    // All Laps Header
    lapHeader: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 },
    sortToggle: { flexDirection: 'row', backgroundColor: '#F1F5F9', padding: 3, borderRadius: 8 },
    sortBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    sortBtnActive: { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    sortBtnText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
    sortBtnTextActive: { color: COLORS.text, fontWeight: '700' },

    // Lap Row
    lapRowContainer: { marginBottom: 8 },
    lapRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 14, padding: 10, borderWidth: 1, borderColor: '#F1F5F9' },
    lapRowCompact: { padding: 8, borderRadius: 10 },
    lapNumber: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    lapNumberCompact: { width: 24, height: 24, borderRadius: 8, marginRight: 8 },
    lapNumberText: { fontSize: 13, fontWeight: '800', color: COLORS.text },
    lapContent: { flex: 1 },
    lapBarContainer: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', opacity: 0.08 },
    lapBar: { height: '80%', borderRadius: 4 },
    lapMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    lapTime: { fontSize: 14, fontWeight: '700', color: COLORS.text, fontVariant: ['tabular-nums'] },
    lapBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    lapBadgeText: { fontSize: 10, fontWeight: '700' },

    // Share Card (Hidden)
    shareCardContainer: {
        position: 'absolute',
        top: 0,
        left: -10000, // Move off-screen
        width: 375, // Fixed width for consistent image
        height: 600, // Fixed aspect ratio ~9:16 approx or just tall
    },
    shareCardGradient: {
        flex: 1,
        padding: 32,
        justifyContent: 'center',
        alignItems: 'center'
    },
    shareCardContent: {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 24,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.3,
        shadowRadius: 30,
        elevation: 20,
    },
    shareHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    shareTitle: { fontSize: 14, fontWeight: '900', color: COLORS.primary, letterSpacing: 1 },
    shareDate: { fontSize: 14, color: '#64748B', fontWeight: '600' },

    shareBody: { alignItems: 'center', marginBottom: 32 },
    shareSessionTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 8 },
    shareBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 24 },
    shareBadgeText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
    shareChartWrapper: { width: '100%', height: 180 },

    shareFooter: { flexDirection: 'row', alignItems: 'center', paddingTop: 24, borderTopWidth: 1, borderTopColor: '#EEEEEE' },
    shareStat: { flex: 1, alignItems: 'center' },
    shareStatLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' },
    shareStatValue: { fontSize: 18, color: '#0F172A', fontWeight: '800' },
    shareDivider: { width: 1, height: 30, backgroundColor: '#E2E8F0' },
});
