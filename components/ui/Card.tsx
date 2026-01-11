import React from 'react';
import { StyleProp, View, ViewProps, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../lib/theme';

interface CardProps extends ViewProps {
    variant?: 'flat' | 'elevated' | 'outlined';
    padding?: keyof typeof SPACING;
}

export function Card({
    children,
    style,
    variant = 'elevated',
    padding = 'lg',
    ...rest
}: CardProps) {

    const getStyle = (): StyleProp<ViewStyle> => {
        const base: ViewStyle = {
            backgroundColor: COLORS.surface,
            borderRadius: RADIUS.xl, // Default to XL for cards (modern look)
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

    return (
        <View style={getStyle()} {...rest}>
            {children}
        </View>
    );
}
