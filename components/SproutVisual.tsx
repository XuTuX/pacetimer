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
    // < 1h (60 min): Seed
    // < 3h (180 min): Sprout
    // < 10h (600 min): Advanced (covers < 6h and up to 10h)
    // >= 10h (600 min): Flower
    let stage = 'seed';
    if (totalMinutes >= 600) stage = 'flower';
    else if (totalMinutes >= 180) stage = 'advanced';
    else if (totalMinutes >= 60) stage = 'sprout';
    else stage = 'seed';

    const getStageImage = (s: string) => {
        switch (s) {
            case 'flower': return require('../assets/images/growth_flower.png');
            case 'advanced': return require('../assets/images/growth_advanced.png');
            case 'sprout': return require('../assets/images/growth_sprout.png');
            default: return require('../assets/images/growth_seed.png');
        }
    };

    const animatedStyle = useAnimatedStyle(() => {
        // Adjust scale/position based on stage
        let scaleFactor = 1;
        if (stage === 'sprout') scaleFactor = 1.05;
        if (stage === 'advanced') scaleFactor = 1.1;
        if (stage === 'flower') scaleFactor = 1.15;

        return {
            transform: [
                { scale: withSpring(scaleFactor) },
                { translateY: withSpring(0) },
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
