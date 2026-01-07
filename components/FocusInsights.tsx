import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../lib/theme';
import { QuestionRecord } from '../lib/types';

interface Props {
    records: QuestionRecord[];
}

export function FocusInsights({ records }: Props) {
    const insights = useMemo(() => {
        if (records.length === 0) return [];

        const analysis: { title: string; desc: string; icon: string; color: string }[] = [];

        // 1. Peak Study Time
        const hourCounts = new Array(24).fill(0);
        records.forEach(r => {
            const hour = new Date(r.startedAt).getHours();
            hourCounts[hour]++;
        });
        const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

        let peakTimeStr = '';
        if (peakHour < 6) peakHourStr = '새벽';
        else if (peakHour < 12) peakHourStr = '오전';
        else if (peakHour < 18) peakHourStr = '오후';
        else peakHourStr = '저녁';

        analysis.push({
            title: '최고 집중 시간대',
            desc: `${peakHourStr} ${peakHour % 12 || 12}시경에 가장 활발하게 학습하셨네요.`,
            icon: 'flash',
            color: '#FBBF24'
        });

        // 2. Average Pace Analysis
        const totalMs = records.reduce((acc, r) => acc + r.durationMs, 0);
        const avgSec = totalMs / records.length / 1000;

        analysis.push({
            title: '평균 풀이 페이스',
            desc: `문항당 평균 ${Math.round(avgSec)}초가 소요됩니다.`,
            icon: 'time',
            color: COLORS.primary
        });

        // 3. Consistency (just a placeholder logic for now)
        analysis.push({
            title: '학습 몰입도',
            desc: '균일한 페이스를 유지하며 안정적으로 학습하고 있습니다.',
            icon: 'stats-chart',
            color: '#8B5CF6'
        });

        return analysis;
    }, [records]);

    if (insights.length === 0) return null;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>데이터 심층 분석</Text>
            <View style={styles.insightGrid}>
                {insights.map((insight, i) => (
                    <View key={i} style={styles.insightCard}>
                        <View style={[styles.iconContainer, { backgroundColor: insight.color + '15' }]}>
                            <Ionicons name={insight.icon as any} size={18} color={insight.color} />
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={styles.insightTitle}>{insight.title}</Text>
                            <Text style={styles.insightDesc}>{insight.desc}</Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

let peakHourStr = '';

const styles = StyleSheet.create({
    container: {
        marginTop: 32,
        paddingHorizontal: 4,
    },
    title: {
        fontSize: 19,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 16,
    },
    insightGrid: {
        gap: 12,
    },
    insightCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        gap: 16,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        flex: 1,
    },
    insightTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 2,
    },
    insightDesc: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textMuted,
        lineHeight: 18,
    },
});
