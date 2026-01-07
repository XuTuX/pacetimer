import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { COLORS } from '../lib/theme';

interface SproutVisualProps {
    totalMinutes: number;
}

export default function SproutVisual({ totalMinutes }: SproutVisualProps) {
    // Growth by study time (milestones: 1h, 3h, 5h, 9h+):
    // < 1h: first sprout (0)
    // 1h-<5h: second sprout (1) - includes the 3h mark
    // 5h-<9h: third sprout (2)
    // 9h+: flower (3)
    let stage = 0;
    if (totalMinutes >= 540) stage = 3;
    else if (totalMinutes >= 300) stage = 2;
    else if (totalMinutes >= 60) stage = 1;

    const animatedStyle = useAnimatedStyle(() => {
        const scale = 1 + stage * 0.05;
        const translateY = -stage * 4;
        return {
            transform: [
                { scale: withSpring(scale) },
                { translateY: withSpring(translateY) },
            ],
        };
    });

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.imageWrapper, animatedStyle]}>
                <Image
                    source={require('../assets/images/sprout_evolution.png')}
                    style={styles.image}
                    contentFit="contain"
                />
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 220,
        width: '100%',
    },
    imageWrapper: {
        width: 220,
        height: 220,
        backgroundColor: COLORS.white,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    image: {
        width: '80%',
        height: '80%',
    },
});
