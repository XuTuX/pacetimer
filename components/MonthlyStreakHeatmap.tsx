import React, { useMemo } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { COLORS } from '../lib/theme';

interface HeatmapData {
    date: string; // YYYY-MM-DD
    count: number;
}

interface MonthlyStreakHeatmapProps {
    data: HeatmapData[];
    currentStreak: number;
}

const ENERGY_COLORS = {
    EMPTY: '#F2F2F7',   // 기록 없는 날
    LEVEL1: '#E6F9F4',  // 가벼운 학습
    LEVEL2: '#A3EDD6',  // 꾸준한 학습
    LEVEL3: '#4ADEB3',  // 몰입
    LEVEL4: '#00D094',  // 완벽한 하루 (COLORS.primary)
};

const MonthlyStreakHeatmap: React.FC<MonthlyStreakHeatmapProps> = ({
    data,
    currentStreak,
}) => {
    const allHeatmapDays = useMemo(() => {
        if (data.length === 0) return [];

        const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date));
        const earliestDate = new Date(sortedData[0].date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const days = [];
        let curr = new Date(earliestDate);
        const dataMap = new Map(data.map(d => [d.date, d.count]));

        while (curr <= today) {
            const dateStr = curr.toISOString().split('T')[0];
            days.push({
                date: dateStr,
                count: dataMap.get(dateStr) || 0,
            });
            curr.setDate(curr.getDate() + 1);
        }

        const columns = [];
        for (let i = 0; i < days.length; i += 3) {
            columns.push(days.slice(i, i + 3));
        }
        return columns.reverse(); // 최신 데이터가 왼쪽으로 오게 하거나, 아니면 그냥 유지. 원래는 오른쪽으로 쌓임. 여기서는 그냥 유지하되 스타일만 변경.
    }, [data]);

    const maxCount = useMemo(() => {
        const counts = data.map(d => d.count);
        return Math.max(...counts, 1);
    }, [data]);

    const getSeedStyle = (count: number) => {
        if (count === 0) return { color: ENERGY_COLORS.EMPTY, size: 6, isEmpty: true };

        const ratio = count / maxCount;
        if (ratio < 0.25) return { color: ENERGY_COLORS.LEVEL1, size: 12, isEmpty: false };
        if (ratio < 0.5) return { color: ENERGY_COLORS.LEVEL2, size: 16, isEmpty: false };
        if (ratio < 0.75) return { color: ENERGY_COLORS.LEVEL3, size: 20, isEmpty: false };
        return { color: ENERGY_COLORS.LEVEL4, size: 24, isEmpty: false };
    };

    return (
        <View style={styles.container}>
            <View style={styles.gridContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    <View style={styles.beadWrapper}>
                        {allHeatmapDays.map((col, cIdx) => (
                            <View key={cIdx} style={styles.column}>
                                {col.map((day) => {
                                    const { color, size } = getSeedStyle(day.count);
                                    return (
                                        <View key={day.date} style={styles.cellContainer}>
                                            <View
                                                style={[
                                                    styles.seed,
                                                    {
                                                        backgroundColor: color,
                                                        width: size,
                                                        height: size,
                                                        borderRadius: size / 2
                                                    }
                                                ]}
                                            />
                                        </View>
                                    );
                                })}
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </View>

            <View style={styles.footer}>
                <Text style={styles.legendText}>LESS</Text>
                <View style={styles.legendDots}>
                    {[ENERGY_COLORS.LEVEL1, ENERGY_COLORS.LEVEL2, ENERGY_COLORS.LEVEL3, ENERGY_COLORS.LEVEL4].map((c, i) => (
                        <View key={i} style={[styles.tinyDot, { backgroundColor: c }]} />
                    ))}
                </View>
                <Text style={styles.legendText}>MORE</Text>
            </View>
        </View>
    );
};

export default MonthlyStreakHeatmap;

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.white,
    },
    gridContainer: {
        height: 110,
        justifyContent: 'center',
    },
    scrollContent: {
        paddingRight: 24,
    },
    beadWrapper: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    column: {
        gap: 12,
        alignItems: 'center',
    },
    cellContainer: {
        width: 26,
        height: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    seed: {
        // dynamic
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        gap: 12,
    },
    legendDots: {
        flexDirection: 'row',
        gap: 6,
    },
    legendText: {
        fontSize: 10,
        color: COLORS.textMuted,
        fontWeight: '700',
        letterSpacing: 1,
    },
    tinyDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
});