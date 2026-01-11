import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { useAppStore } from '../lib/store';
import { COLORS } from '../lib/theme';

const CHART_SIZE = 160;
const STROKE_WIDTH = 20;
const RADIUS = (CHART_SIZE - STROKE_WIDTH) / 2;
const CENTER = CHART_SIZE / 2;

export interface SubjectAnalysisData {
    name: string;
    color: string;
    totalMs: number;
    count: number;
    records: any[];
}

type Props = {
    selectedDate: string | null;
    onDateChange: (date: string | null) => void;
    onSubjectSelect: (data: SubjectAnalysisData) => void;
};

const SUBJECT_COLORS = [
    COLORS.primary,
    '#60A5FA', // Blue
    '#A78BFA', // Violet
    '#F472B6', // Pink
    '#FB923C', // Orange
    '#4ADE80', // Green
];

export function DailyAnalysis({ selectedDate, onDateChange, onSubjectSelect }: Props) {
    const { questionRecords, subjects } = useAppStore();

    // 1. All-time analysis for averages
    const statsByDate = useMemo(() => {
        const dateMap: Record<string, {
            totalMs: number,
            count: number,
            bySubject: Record<string, { count: number, totalMs: number, records: typeof questionRecords }>
        }> = {};

        questionRecords.forEach(r => {
            const d = new Date(r.startedAt);
            const shifted = new Date(d.getTime() - 21600000);
            const date = shifted.toISOString().split('T')[0];

            if (!dateMap[date]) {
                dateMap[date] = { totalMs: 0, count: 0, bySubject: {} };
            }
            dateMap[date].totalMs += r.durationMs;
            dateMap[date].count += 1;

            const subject = subjects.find(s => s.id === r.subjectId);
            const subjectName = subject?.name ||
                (r.subjectId === '__review__' ? '검토' :
                    r.subjectId === '__room_exam__' ? '룸 모의고사' : '기타');

            if (!dateMap[date].bySubject[subjectName]) {
                dateMap[date].bySubject[subjectName] = { count: 0, totalMs: 0, records: [] };
            }
            dateMap[date].bySubject[subjectName].count += 1;
            dateMap[date].bySubject[subjectName].totalMs += r.durationMs;
            dateMap[date].bySubject[subjectName].records.push(r);
        });

        return dateMap;
    }, [questionRecords, subjects]);

    // 2. Calculate Averages
    const averages = useMemo(() => {
        const dates = Object.keys(statsByDate);
        if (dates.length === 0) return { ms: 0, count: 0 };
        const totalMs = dates.reduce((acc, d) => acc + statsByDate[d].totalMs, 0);
        const totalCount = dates.reduce((acc, d) => acc + statsByDate[d].count, 0);
        return {
            ms: totalMs / dates.length,
            count: totalCount / dates.length,
        };
    }, [statsByDate]);

    const formatTime = (ms: number) => {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        if (h > 0) return `${h}시간 ${m}분 ${s}초`;
        return m > 0 ? `${m}분 ${s}초` : `${s}초`;
    };

    const dayData = selectedDate ? statsByDate[selectedDate] : null;

    // 3. Prepare Chart Data
    const chartData = useMemo(() => {
        if (!dayData) return [];
        const entries = Object.entries(dayData.bySubject).sort((a, b) => b[1].totalMs - a[1].totalMs);
        let currentAngle = 0;
        return entries.map(([name, data], index) => {
            const percentage = data.totalMs / dayData.totalMs;
            const angle = percentage * 360;
            const startAngle = currentAngle;
            currentAngle += angle;
            return {
                name,
                percentage,
                angle,
                startAngle,
                color: SUBJECT_COLORS[index % SUBJECT_COLORS.length],
                totalMs: data.totalMs,
                count: data.count,
                records: data.records
            };
        });
    }, [dayData]);

    if (!dayData) {
        return (
            <View style={styles.empty}>
                <Ionicons name="analytics-outline" size={48} color={COLORS.border} />
                <Text style={styles.emptyText}>데이터가 충분하지 않습니다.</Text>
                <TouchableOpacity onPress={() => onDateChange(null)} style={styles.backLink}>
                    <Text style={[styles.backLinkText, { marginTop: 16 }]}>전체 기록 보러가기</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const timeDiff = dayData.totalMs - averages.ms;
    const countDiff = dayData.count - averages.count;
    const timeStatus = timeDiff >= 0 ? 'increased' : 'decreased';
    const countStatus = countDiff >= 0 ? 'increased' : 'decreased';

    const getArcPath = (startAngle: number, endAngle: number) => {
        const start = polarToCartesian(CENTER, CENTER, RADIUS, endAngle);
        const end = polarToCartesian(CENTER, CENTER, RADIUS, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
        return [
            "M", start.x, start.y,
            "A", RADIUS, RADIUS, 0, largeArcFlag, 0, end.x, end.y
        ].join(" ");
    };

    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    };

    return (
        <View style={styles.container}>
            <View style={styles.analysisContent}>
                {/* 1. Summary Card */}
                <View style={styles.summaryGrid}>
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryLabel}>총 학습 시간</Text>
                        <Text style={styles.summaryValue}>{formatTime(dayData.totalMs)}</Text>
                        <View style={[styles.diffBadge, timeStatus === 'increased' ? styles.upBadge : styles.downBadge]}>
                            <Ionicons name={timeStatus === 'increased' ? 'trending-up' : 'trending-down'} size={12} color={timeStatus === 'increased' ? '#059669' : '#DC2626'} />
                            <Text style={[styles.diffText, { color: timeStatus === 'increased' ? '#059669' : '#DC2626' }]}>
                                평균 대비 {formatTime(Math.abs(timeDiff))} {timeStatus === 'increased' ? '증가' : '감소'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryLabel}>풀이 문항 수</Text>
                        <Text style={styles.summaryValue}>{dayData.count}문항</Text>
                        <View style={[styles.diffBadge, countStatus === 'increased' ? styles.upBadge : styles.downBadge]}>
                            <Ionicons name={countStatus === 'increased' ? 'trending-up' : 'trending-down'} size={12} color={countStatus === 'increased' ? '#059669' : '#DC2626'} />
                            <Text style={[styles.diffText, { color: countStatus === 'increased' ? '#059669' : '#DC2626' }]}>
                                평균 대비 {Math.abs(Math.round(countDiff))}개 {countStatus === 'increased' ? '증가' : '감소'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* 2. Donut Chart Section */}
                <View style={styles.chartSection}>
                    <View style={styles.chartWrapper}>
                        <Svg width={CHART_SIZE} height={CHART_SIZE}>
                            <G transform={`rotate(-90 ${CENTER} ${CENTER})`}>
                                <Circle
                                    cx={CENTER}
                                    cy={CENTER}
                                    r={RADIUS}
                                    stroke={COLORS.bg}
                                    strokeWidth={STROKE_WIDTH}
                                    fill="none"
                                />
                                {chartData.map((d, i) => (
                                    <Path
                                        key={i}
                                        d={getArcPath(d.startAngle, d.startAngle + d.angle)}
                                        stroke={d.color}
                                        strokeWidth={STROKE_WIDTH}
                                        fill="none"
                                        strokeLinecap="round"
                                    />
                                ))}
                            </G>
                        </Svg>
                        <View style={styles.chartCenterInfo}>
                            <Text style={styles.centerLabel}>과목 수</Text>
                            <Text style={styles.centerValue}>{chartData.length}</Text>
                        </View>
                    </View>

                    <View style={styles.legendContainer}>
                        {chartData.map((d, i) => (
                            <View key={i} style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                                <View style={styles.legendContent}>
                                    <Text style={styles.legendName} numberOfLines={1}>{d.name}</Text>
                                    <Text style={styles.legendPercent}>{Math.round(d.percentage * 100)}% ({d.count}문항)</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* 3. Subject List */}
                <View style={styles.subjectListContainer}>
                    <Text style={styles.sectionTitle}>과목별 분석 결과</Text>
                    {chartData.map((d, i) => (
                        <TouchableOpacity
                            key={i}
                            onPress={() => onSubjectSelect(d)}
                            style={styles.overviewItem}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.overviewIcon, { backgroundColor: d.color + '20' }]}>
                                <Ionicons name="book" size={16} color={d.color} />
                            </View>
                            <View style={styles.overviewBody}>
                                <Text style={styles.overviewName}>{d.name}</Text>
                                <Text style={styles.overviewMeta}>{d.count}문항 · {formatTime(d.totalMs)}</Text>
                            </View>
                            <Ionicons
                                name="chevron-forward"
                                size={20}
                                color={COLORS.textMuted}
                            />
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { gap: 24 },
    detailHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    detailDate: {
        fontSize: 28,
        fontWeight: '900',
        color: COLORS.text,
        letterSpacing: -1,
    },
    analysisSubtitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textMuted,
        marginTop: 2,
    },
    modeToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    modeToggleText: {
        fontSize: 13,
        fontWeight: '800',
        color: COLORS.primary,
    },
    analysisContent: { gap: 20 },
    summaryGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: 28,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 3,
    },
    summaryLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textMuted,
        marginBottom: 6,
    },
    summaryValue: {
        fontSize: 22,
        fontWeight: '900',
        color: COLORS.text,
        marginBottom: 10,
    },
    diffBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        gap: 4,
        alignSelf: 'flex-start',
    },
    upBadge: { backgroundColor: '#ECFDF5' },
    downBadge: { backgroundColor: '#FEF2F2' },
    diffText: {
        fontSize: 11,
        fontWeight: '700',
    },
    chartSection: {
        backgroundColor: COLORS.white,
        borderRadius: 32,
        padding: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.04,
        shadowRadius: 20,
        elevation: 5,
    },
    chartWrapper: {
        width: CHART_SIZE,
        height: CHART_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chartCenterInfo: {
        position: 'absolute',
        alignItems: 'center',
    },
    centerLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    centerValue: {
        fontSize: 32,
        fontWeight: '900',
        color: COLORS.text,
    },
    legendContainer: {
        flex: 1,
        gap: 14,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    legendContent: {
        flex: 1,
    },
    legendName: {
        fontSize: 15,
        fontWeight: '800',
        color: COLORS.text,
    },
    legendPercent: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.textMuted,
        marginTop: 2,
    },
    sectionTitle: {
        fontSize: 19,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 16,
        paddingLeft: 4,
    },
    subjectListContainer: {
        marginTop: 12,
    },
    subjectExpandableWrapper: {
        marginBottom: 12,
    },
    overviewItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: 18,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 16,
    },
    overviewItemExpanded: {
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        backgroundColor: COLORS.bg,
    },
    overviewIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    overviewBody: {
        flex: 1,
    },
    overviewName: {
        fontSize: 17,
        fontWeight: '800',
        color: COLORS.text,
    },
    overviewMeta: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textMuted,
        marginTop: 2,
    },
    subjectDetailSection: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderTopWidth: 0,
        borderColor: COLORS.border,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        padding: 20,
        paddingTop: 8,
    },
    questionList: { gap: 14 },
    qItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    qTimeColumn: {
        width: 44,
    },
    qStartTime: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    qInfoContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    qLabel: {
        fontSize: 14,
        fontWeight: '800',
        color: COLORS.text,
        minWidth: 36,
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
        minWidth: 70,
        textAlign: 'right',
    },
    empty: {
        alignItems: 'center',
        padding: 80,
        gap: 20,
    },
    emptyText: {
        color: COLORS.textMuted,
        fontSize: 16,
        fontWeight: '600',
    },
    backLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    backLinkText: {
        fontSize: 15,
        fontWeight: '800',
        color: COLORS.primary,
    },
});
