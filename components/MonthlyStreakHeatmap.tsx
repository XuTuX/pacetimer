import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { COLORS } from '../lib/theme';

interface HeatmapData {
    date: string; // YYYY-MM-DD
    count: number;
}

interface MonthlyStreakHeatmapProps {
    month: string; // YYYY-MM
    data: HeatmapData[];
    currentStreak: number;
    bestStreak: number;
    onMonthChange?: (month: string) => void;
}

const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// GitHub-style Green Palette
const LEVEL_COLORS = {
    EMPTY: '#F1F5F9', // 연한 회색 (bg-slate-100)
    LEVEL1: '#D1FAE5', // 초록 1단계
    LEVEL2: '#6EE7B7', // 초록 2단계
    LEVEL3: '#10B981', // 초록 3단계
    LEVEL4: '#047857', // 초록 4단계
};

const MonthlyStreakHeatmap: React.FC<MonthlyStreakHeatmapProps> = ({
    month: initialMonth,
    data,
    currentStreak,
    bestStreak,
    onMonthChange,
}) => {
    const [currentMonthStr, setCurrentMonthStr] = useState(initialMonth); // YYYY-MM
    const [tooltip, setTooltip] = useState<{ date: string; count: number } | null>(null);

    const { year, month } = useMemo(() => {
        const [y, m] = currentMonthStr.split('-').map(Number);
        return { year: y, month: m - 1 };
    }, [currentMonthStr]);

    const gridDays = useMemo(() => {
        if (data.length === 0) return [];

        // 데이터 중 가장 빠른 날짜 찾기 (맨 처음 시작점)
        const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date));
        const startDate = new Date(sortedData[0].date);
        const today = new Date();

        const days = [];
        let current = new Date(startDate);

        while (current <= today) {
            const dateStr = current.toISOString().split('T')[0];
            const dayData = data.find((d) => d.date === dateStr);

            days.push({
                date: dateStr,
                count: dayData?.count || 0,
            });
            current.setDate(current.getDate() + 1);
        }

        // 3행 구성 (Vertical stack per column)
        const columns = [];
        for (let i = 0; i < days.length; i += 3) {
            columns.push(days.slice(i, i + 3));
        }
        return columns;
    }, [data]);

    // 동적 색상 (Max 대비 확률적 농도)
    const maxCount = useMemo(() => {
        const counts = data.map(d => d.count);
        return Math.max(...counts, 1);
    }, [data]);

    const getIntensityColor = (count: number) => {
        if (count === 0) return LEVEL_COLORS.EMPTY;

        const intensity = Math.min(count / maxCount, 1);

        if (intensity < 0.25) return LEVEL_COLORS.LEVEL1;
        if (intensity < 0.5) return LEVEL_COLORS.LEVEL2;
        if (intensity < 0.75) return LEVEL_COLORS.LEVEL3;
        return LEVEL_COLORS.LEVEL4;
    };

    const changeMonth = (offset: number) => {
        const newDate = new Date(year, month + offset, 1);
        const newMonthStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
        setCurrentMonthStr(newMonthStr);
        onMonthChange?.(newMonthStr);
        setTooltip(null);
    };

    return (
        <View style={styles.container}>
            {/* Header: More compact horizontally */}
            <View style={styles.header}>
                <View style={styles.streakInfo}>
                    <Text style={styles.streakLabel}>전체 학습 스트릭</Text>
                    <View style={styles.streakValueRow}>
                        <Text style={styles.streakCount}>{currentStreak}</Text>
                        <Text style={styles.streakUnit}>일 연속</Text>
                    </View>
                </View>
                <Ionicons name="calendar-outline" size={24} color={COLORS.border} />
            </View>

            {/* Horizontally Scrollable 3-Row Strip: Starts from minDate */}
            <View style={styles.gridWrapper}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    <View style={styles.heatmapWrapper}>
                        {gridDays.map((col, colIdx) => (
                            <View key={colIdx} style={styles.column}>
                                {col.map((day) => (
                                    <TouchableOpacity
                                        key={day.date}
                                        onPress={() => setTooltip({ date: day.date, count: day.count })}
                                        style={[
                                            styles.cell,
                                            { backgroundColor: getIntensityColor(day.count) }
                                        ]}
                                    />
                                ))}
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </View>

            {/* Footer: Compact row linking best streak and legend */}
            <View style={styles.footer}>
                <View style={styles.footerStats}>
                    <Ionicons name="trophy-outline" size={12} color={COLORS.textMuted} />
                    <Text style={styles.bestStreakText}>최장 {bestStreak}일 연속</Text>
                </View>

                <View style={styles.legendContainer}>
                    {[LEVEL_COLORS.LEVEL1, LEVEL_COLORS.LEVEL2, LEVEL_COLORS.LEVEL3, LEVEL_COLORS.LEVEL4].map((color, i) => (
                        <View key={i} style={[styles.cellTiny, { backgroundColor: color }]} />
                    ))}
                    <Text style={styles.legendRangeText}>20+</Text>
                </View>
            </View>

            {/* Subtle Info Text */}
            <Text style={styles.infoText}>
                날짜는 매일 오전 6:00(UTC+9)에 변경됩니다.
            </Text>

            {/* Tooltip Overlay */}
            {tooltip && (
                <Modal transparent visible animationType="fade">
                    <TouchableWithoutFeedback onPress={() => setTooltip(null)}>
                        <View style={styles.tooltipOverlay}>
                            <View style={styles.tooltipBox}>
                                <Text style={styles.tooltipText}>{tooltip.date}</Text>
                                <Text style={styles.tooltipCount}>{tooltip.count}회 학습</Text>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>
            )}
        </View>
    );
};

export default MonthlyStreakHeatmap;

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.surface,
        borderRadius: 28,
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderWidth: 1,
        borderColor: 'rgba(226, 232, 240, 0.8)',
        marginBottom: 20,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    streakInfo: {},
    streakLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginBottom: 2 },
    streakValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
    streakCount: { fontSize: 22, fontWeight: '900', color: COLORS.text },
    streakUnit: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },

    monthNav: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    navBtn: { padding: 2 },
    monthLabel: { fontSize: 13, fontWeight: '800', color: COLORS.text, marginHorizontal: 8, width: 60, textAlign: 'center' },

    gridWrapper: {
        marginVertical: 10,
        height: 76,
    },
    scrollContent: {
        paddingHorizontal: 2,
    },
    heatmapWrapper: {
        flexDirection: 'row',
        gap: 6,
    },
    column: { gap: 6 },
    cell: { width: 18, height: 18, borderRadius: 5 },

    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9'
    },
    footerStats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    bestStreakText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },

    legendContainer: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    cellTiny: { width: 8, height: 8, borderRadius: 2 },
    legendRangeText: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted, marginLeft: 2 },

    infoText: {
        marginTop: 12,
        fontSize: 10,
        color: COLORS.textMuted,
        opacity: 0.6,
        textAlign: 'center',
        fontWeight: '500'
    },

    tooltipOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)', justifyContent: 'center', alignItems: 'center' },
    tooltipBox: {
        backgroundColor: COLORS.text,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20
    },
    tooltipText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
    tooltipCount: { color: COLORS.white, fontSize: 12, opacity: 0.8, marginTop: 2, fontWeight: '500' },
});
