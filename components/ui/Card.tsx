import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../lib/design-system';

interface CardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    onPress?: () => void;
    padding?: keyof typeof SPACING;
    radius?: keyof typeof RADIUS;
    variant?: 'elevated' | 'flat' | 'outline';
    backgroundColor?: string;
}

export function Card({
    children,
    style,
    onPress,
    padding = 'lg',
    radius = 'lg',
    variant = 'elevated',
    backgroundColor = COLORS.surface,
}: CardProps) {
    const Component = onPress ? Pressable : View;

    return (
        <Component
            onPress={onPress}
            style={({ pressed }: any) => [
                styles.base,
                {
                    padding: SPACING[padding],
                    borderRadius: RADIUS[radius],
                    backgroundColor
                },
                variant === 'elevated' && SHADOWS.medium,
                variant === 'outline' && styles.outline,
                onPress && pressed && styles.pressed,
                style,
            ]}
        >
            {children}
        </Component>
    );
}

const styles = StyleSheet.create({
    base: {
        width: '100%',
    },
    outline: {
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    pressed: {
        opacity: 0.95,
        transform: [{ scale: 0.99 }],
    },
});
