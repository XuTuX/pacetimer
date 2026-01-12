import React from 'react';
import { Pressable, StyleProp, View, ViewProps, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../lib/theme';

interface CardProps extends ViewProps {
    variant?: 'flat' | 'elevated' | 'outlined';
    padding?: keyof typeof SPACING;
    radius?: keyof typeof RADIUS;
    onPress?: () => void;
}

export function Card({
    children,
    style,
    variant = 'elevated',
    padding = 'lg',
    radius = 'xl',
    onPress,
    ...rest
}: CardProps) {

    const getStyle = (): StyleProp<ViewStyle> => {
        const base: ViewStyle = {
            backgroundColor: COLORS.surface,
            borderRadius: RADIUS[radius],
            padding: SPACING[padding],
        };

        switch (variant) {
            case 'elevated':
                return [base, SHADOWS.medium, style];
            case 'outlined':
                return [base, { borderWidth: 1, borderColor: COLORS.border }, style];
            case 'flat':
            default:
                return [base, style];
        }
    };

    if (onPress) {
        return (
            <Pressable
                onPress={onPress}
                style={({ pressed }) => [
                    getStyle(),
                    pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                ]}
                {...rest}
            >
                {children}
            </Pressable>
        );
    }

    return (
        <View style={getStyle()} {...rest}>
            {children}
        </View>
    );
}
