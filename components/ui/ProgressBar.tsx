import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { COLORS, RADIUS } from '../../lib/theme';

interface ProgressBarProps {
    progress: number; // 0 to 1
    color?: string;
    height?: number;
}

export function ProgressBar({ progress, color = COLORS.primary, height = 6 }: ProgressBarProps) {
    const width = useSharedValue(0);

    useEffect(() => {
        width.value = withTiming(Math.max(0, Math.min(progress, 1)) * 100, { duration: 1000 });
    }, [progress]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            width: `${width.value}%`,
        };
    });

    return (
        <View style={[styles.container, { height }]}>
            <Animated.View style={[styles.bar, { backgroundColor: color }, animatedStyle]} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: COLORS.surfaceVariant,
        borderRadius: RADIUS.full,
        overflow: 'hidden',
    },
    bar: {
        height: '100%',
        borderRadius: RADIUS.full,
    },
});
