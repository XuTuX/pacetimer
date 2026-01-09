import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../lib/theme';

interface Props {
    data: number[]; // 24 values
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 48; // padding

export const HourlyDistributionChart: React.FC<Props> = ({ data }) => {
    const max = Math.max(...data, 1); // avoid division by zero

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>시간대별 분포</Text>
            </View>
            <View style={styles.chartContainer}>
                <View style={styles.bars}>
                    {data.map((val, i) => (
                        <View key={i} style={styles.barWrapper}>
                            <View
                                style={[
                                    styles.bar,
                                    { height: `${(val / max) * 100}%` },
                                    val > 0 && { backgroundColor: COLORS.primary }
                                ]}
                            />
                        </View>
                    ))}
                </View>
                <View style={styles.labels}>
                    {[0, 6, 12, 18, 23].map((h) => (
                        <Text key={h} style={styles.label}>
                            {h}시
                        </Text>
                    ))}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 24,
        padding: 20,
        backgroundColor: COLORS.white,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    header: {
        marginBottom: 16,
    },
    title: {
        fontSize: 16,
        fontWeight: '900',
        color: COLORS.text,
    },
    chartContainer: {
        height: 120,
        justifyContent: 'flex-end',
    },
    bars: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingBottom: 8,
    },
    barWrapper: {
        flex: 1,
        height: '100%',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: 1,
    },
    bar: {
        width: '100%',
        backgroundColor: COLORS.surfaceVariant,
        borderRadius: 2,
        minHeight: 1,
    },
    labels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 4,
    },
    label: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
});
