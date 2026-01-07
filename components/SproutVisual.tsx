import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { COLORS } from '../lib/theme';

interface SproutVisualProps {
    totalMinutes: number;
}

export default function SproutVisual({ totalMinutes }: SproutVisualProps) {
    const [currentHour, setCurrentHour] = useState(new Date().getHours());

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentHour(new Date().getHours());
        }, 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    // Growth by study time (milestones: 1h, 5h, 9h+):
    // < 1h: stage 0 (seedling)
    // 1h - 4h59: stage 1 (sprout)
    // 5h - 8h59: stage 2 (growing)
    // 9h+: stage 3 (flower)
    let stage = 0;
    if (totalMinutes >= 540) stage = 3;
    else if (totalMinutes >= 300) stage = 2;
    else if (totalMinutes >= 60) stage = 1;

    const getStageImage = (s: number) => {
        switch (s) {
            case 3: return require('../assets/images/sprout_stage_3.png');
            case 2: return require('../assets/images/sprout_stage_2.png');
            case 1: return require('../assets/images/sprout_stage_1.png');
            default: return require('../assets/images/sprout_stage_0.png');
        }
    };

    const getTimeVibe = () => {
        if (currentHour >= 5 && currentHour < 11) {
            return { bg: '#FFF9EB', border: '#FFE4A1', mood: 'morning' }; // Morning: Soft Golden
        } else if (currentHour >= 11 && currentHour < 17) {
            return { bg: '#F0F9FF', border: '#BAE6FD', mood: 'afternoon' }; // Afternoon: Sky Blue
        } else if (currentHour >= 17 && currentHour < 21) {
            return { bg: '#FFF1F2', border: '#FECDD3', mood: 'evening' }; // Evening: Soft Rose
        } else {
            return { bg: '#F5F3FF', border: '#DDD6FE', mood: 'night' }; // Night: Soft Lavender
        }
    };

    const vibe = getTimeVibe();

    const animatedStyle = useAnimatedStyle(() => {
        const scale = 1 + (stage % 4) * 0.05;
        const translateY = -(stage % 4) * 4;
        return {
            transform: [
                { scale: withSpring(scale) },
                { translateY: withSpring(translateY) },
            ],
            backgroundColor: withTiming(vibe.bg),
            borderColor: withTiming(vibe.border),
        };
    });

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.imageWrapper, animatedStyle]}>
                <Image
                    source={getStageImage(stage)}
                    style={styles.image}
                    contentFit="contain"
                    transition={500}
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
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
        backgroundColor: COLORS.white,
    },
    image: {
        width: '90%',
        height: '90%',
    },
});
