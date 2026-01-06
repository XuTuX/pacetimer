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

// 공부 에너지 색상 팔레트
const ENERGY_COLORS = {
    EMPTY: '#CBD5E1',   // 기록 없는 날 (점)
    LEVEL1: '#D1FAE5',  // 가벼운 학습
    LEVEL2: '#6EE7B7',  // 꾸준한 학습
    LEVEL3: '#10B981',  // 몰입
    LEVEL4: '#059669',  // 완벽한 하루 (가장 큼)
};

const MonthlyStreakHeatmap: React.FC<MonthlyStreakHeatmapProps> = ({
    data,
    currentStreak,
}) => {
    // 1. 데이터 가공: 시작일부터 오늘까지 3행 단위 컬럼 생성
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
        return columns;
    }, [data]);

    // 2. 최대 공부량 기준 (크기 및 색상 동적 결정용)
    const maxCount = useMemo(() => {
        const counts = data.map(d => d.count);
        return Math.max(...counts, 1);
    }, [data]);

    // 3. 학습량에 따른 스타일 결정 (색상 + 크기)
    const getSeedStyle = (count: number) => {
        if (count === 0) return { color: ENERGY_COLORS.EMPTY, size: 4, isEmpty: true };

        const ratio = count / maxCount;
        if (ratio < 0.25) return { color: ENERGY_COLORS.LEVEL1, size: 10, isEmpty: false };
        if (ratio < 0.5) return { color: ENERGY_COLORS.LEVEL2, size: 14, isEmpty: false };
        if (ratio < 0.75) return { color: ENERGY_COLORS.LEVEL3, size: 18, isEmpty: false };
        return { color: ENERGY_COLORS.LEVEL4, size: 22, isEmpty: false };
    };

    return (
        <View style={styles.container}>
            {/* 상단: 스트릭 카드 배지 */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>오늘까지 기록된</Text>
                    <View style={styles.streakRow}>
                        <Text style={styles.streakValue}>{currentStreak}</Text>
                        <Text style={styles.streakUnit}>일째 성장 중</Text>
                    </View>
                </View>
                <View style={styles.iconBadge}>
                    <Text style={styles.iconEmoji}>🌱</Text>
                </View>
            </View>

            {/* 히트맵 영역: 씨앗들이 자라나는 느낌 */}
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
                                    const { color, size, isEmpty } = getSeedStyle(day.count);
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

            {/* 하단 범례 */}
            <View style={styles.footer}>
                <Text style={styles.legendText}>가벼운 학습</Text>
                <View style={styles.legendDots}>
                    {[ENERGY_COLORS.LEVEL1, ENERGY_COLORS.LEVEL2, ENERGY_COLORS.LEVEL3, ENERGY_COLORS.LEVEL4].map((c, i) => (
                        <View key={i} style={[styles.tinyDot, { backgroundColor: c }]} />
                    ))}
                </View>
                <Text style={styles.legendText}>깊은 몰입</Text>
            </View>
        </View>
    );
};

export default MonthlyStreakHeatmap;

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        padding: 20,
        marginHorizontal: 16,
        marginVertical: 10,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
        // 은은한 섀도우
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 13,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    streakRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
        marginTop: 2,
    },
    streakValue: {
        fontSize: 32,
        fontWeight: '900',
        color: ENERGY_COLORS.LEVEL4,
    },
    streakUnit: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    iconBadge: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F0FDFA',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#CCFBF1',
    },
    iconEmoji: {
        fontSize: 20,
    },
    gridContainer: {
        height: 100, // 씨앗 크기 변화를 수용할 충분한 높이
        justifyContent: 'center',
    },
    scrollContent: {
        paddingRight: 20,
    },
    beadWrapper: {
        flexDirection: 'row',
        gap: 12, // 컬럼 간 간격
        alignItems: 'center',
    },
    column: {
        gap: 12, // 씨앗 간 세로 간격
        alignItems: 'center',
    },
    cellContainer: {
        width: 24, // 각 씨앗의 고정 영역
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    seed: {
        // 동적 스타일 적용
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        gap: 10,
    },
    legendDots: {
        flexDirection: 'row',
        gap: 4,
    },
    legendText: {
        fontSize: 11,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    tinyDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
});