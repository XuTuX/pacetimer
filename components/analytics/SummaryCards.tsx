import React from 'react';
import { StyleSheet, View } from 'react-native';
import { formatHMS } from '../../lib/studyDate';
import { COLORS, SPACING } from '../../lib/theme';
import { Card } from '../ui/Card';
import { ThemedText } from '../ui/ThemedText';

interface Props {
    totalDurationMs: number;
    totalQuestionCount: number;
    averageQuestionDurationMs: number;
}

function formatMMSS(ms: number) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const SummaryCards: React.FC<Props> = ({
    totalDurationMs,
    totalQuestionCount,
    averageQuestionDurationMs,
}) => {
    return (
        <View style={styles.container}>
            <Card variant="elevated" padding="xl" radius="xxl" style={styles.mainCard}>
                {/* 상단: 총 공부시간 섹션 */}
                <View style={styles.primaryRow}>
                    <ThemedText style={styles.primaryValue}>{formatHMS(totalDurationMs)}</ThemedText>
                </View>

                <View style={styles.horizontalDivider} />

                {/* 하단: 문항 수 & 평균 (중앙으로 모음) */}
                <View style={styles.secondaryRow}>
                    <View style={styles.statItem}>
                        <ThemedText style={styles.secondaryValue}>
                            {totalQuestionCount.toLocaleString('ko-KR')}
                        </ThemedText>
                        <ThemedText style={styles.unitText}> 문제</ThemedText>
                    </View>

                    <View style={styles.verticalDivider} />

                    <View style={styles.statItem}>
                        <ThemedText style={styles.unitText}>문제당 </ThemedText>
                        <ThemedText style={styles.secondaryValue}>
                            {formatMMSS(averageQuestionDurationMs)}
                        </ThemedText>
                    </View>
                </View>
            </Card>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: SPACING.xxl,
    },
    mainCard: {
        backgroundColor: COLORS.white,
        alignItems: 'center', // 카드 전체 내용 중앙 정렬
        paddingVertical: 24,
    },
    primaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    totalLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: COLORS.textMuted,
        marginTop: 6, // 숫자 높이와 맞추기 위한 미세 조정
    },
    primaryValue: {
        fontSize: 38,
        fontWeight: '900',
        color: COLORS.text,
        letterSpacing: -1,
    },
    horizontalDivider: {
        width: '100%',
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 20,
        opacity: 0.3,
    },
    secondaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center', // 양 끝으로 벌리지 않고 중앙으로 모음
        gap: 24, // 두 정보 사이의 간격 (원하는 만큼 조절 가능)
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    secondaryValue: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
    },
    unitText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    verticalDivider: {
        width: 1,
        height: 14,
        backgroundColor: COLORS.border,
        opacity: 0.5,
    },
});