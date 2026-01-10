import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../lib/theme';

interface RankBadgeProps {
    rank: number;
    size?: number;
}

export function RankBadge({ rank, size = 24 }: RankBadgeProps) {
    const getStyle = () => {
        switch (rank) {
            case 1: return { bg: '#FFD700', text: '#FFFFFF', border: '#E6C200' }; // Gold
            case 2: return { bg: '#C0C0C0', text: '#FFFFFF', border: '#A9A9A9' }; // Silver
            case 3: return { bg: '#CD7F32', text: '#FFFFFF', border: '#8B4513' }; // Bronze
            default: return { bg: COLORS.surfaceVariant, text: COLORS.textMuted, border: 'transparent' };
        }
    };

    const { bg, text, border } = getStyle();
    const isTop3 = rank <= 3;

    return (
        <View style={[
            styles.container,
            {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: bg,
                borderColor: border,
                borderWidth: isTop3 ? 1 : 0
            }
        ]}>
            <Text style={[
                styles.text,
                {
                    fontSize: size * 0.5,
                    color: text,
                    fontWeight: isTop3 ? '900' : '700'
                }
            ]}>
                {rank}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    text: {
        textAlign: 'center',
    },
});
