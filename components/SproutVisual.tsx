import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

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

    // Growth by daily study time:
    // 0-3h: Stage 1
    // 3h-6h: Stage 2
    // 6h-10h: Stage 4
    // 10h+: Stage 5 (Tree)
    let stage = 1;
    if (totalMinutes >= 600) stage = 5;
    else if (totalMinutes >= 360) stage = 4;
    else if (totalMinutes >= 180) stage = 2;

    const getStageImage = (s: number) => {
        switch (s) {
            case 5: return require('../assets/images/sprout_stage_5.png');
            case 4: return require('../assets/images/sprout_stage_4.png');
            case 2: return require('../assets/images/sprout_stage_2.png');
            default: return require('../assets/images/sprout_stage_1.png');
        }
    };

    const animatedStyle = useAnimatedStyle(() => {
        const scale = 1 + (stage % 6) * 0.05;
        const translateY = -(stage % 6) * 2;
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
        height: 200,
        width: '100%',
    },
    imageWrapper: {
        width: 200,
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
    },
});
