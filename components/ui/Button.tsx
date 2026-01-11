import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../lib/design-system';
import { Typography } from './Typography';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'error' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
    label?: string;
    onPress: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    disabled?: boolean;
    leftIcon?: keyof typeof Ionicons.glyphMap;
    rightIcon?: keyof typeof Ionicons.glyphMap;
    style?: StyleProp<ViewStyle>;
    fullWidth?: boolean;
}

export function Button({
    label,
    onPress,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    leftIcon,
    rightIcon,
    style,
    fullWidth = true,
}: ButtonProps) {
    const handlePress = () => {
        if (!loading && !disabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onPress();
        }
    };

    const isPrimary = variant === 'primary';
    const isSecondary = variant === 'secondary';
    const isGhost = variant === 'ghost';
    const isError = variant === 'error';
    const isOutline = variant === 'outline';

    const getTextColor = () => {
        if (disabled) return COLORS.textMuted;
        if (isPrimary || isError) return COLORS.white;
        if (isSecondary) return COLORS.primary;
        if (isOutline) return COLORS.primary;
        return COLORS.text;
    };

    return (
        <Pressable
            onPress={handlePress}
            disabled={loading || disabled}
            style={({ pressed }) => [
                styles.base,
                styles[variant],
                styles[size],
                fullWidth && styles.fullWidth,
                pressed && styles.pressed,
                disabled && styles.disabled,
                isPrimary && !disabled && !pressed && SHADOWS.medium,
                style
            ]}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <>
                    {leftIcon && (
                        <Ionicons
                            name={leftIcon}
                            size={size === 'sm' ? 16 : 20}
                            color={getTextColor()}
                            style={styles.leftIcon}
                        />
                    )}
                    {label && (
                        <Typography.Subtitle2
                            color={getTextColor()}
                            bold={size !== 'sm'}
                            style={size === 'sm' ? { fontSize: 14 } : undefined}
                        >
                            {label}
                        </Typography.Subtitle2>
                    )}
                    {rightIcon && (
                        <Ionicons
                            name={rightIcon}
                            size={size === 'sm' ? 16 : 20}
                            color={getTextColor()}
                            style={styles.rightIcon}
                        />
                    )}
                </>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: RADIUS.lg,
    },
    fullWidth: {
        width: '100%',
    },
    pressed: {
        opacity: 0.85,
        transform: [{ scale: 0.98 }],
    },
    disabled: {
        backgroundColor: COLORS.border,
        borderColor: COLORS.border,
    },

    // Variants
    primary: {
        backgroundColor: COLORS.primary,
    },
    secondary: {
        backgroundColor: COLORS.primaryLight,
    },
    ghost: {
        backgroundColor: 'transparent',
    },
    error: {
        backgroundColor: COLORS.error,
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: COLORS.primary,
    },

    // Sizes
    sm: {
        height: 40,
        paddingHorizontal: SPACING.md,
        borderRadius: RADIUS.md,
    },
    md: {
        height: 52,
        paddingHorizontal: SPACING.xl,
    },
    lg: {
        height: 60,
        paddingHorizontal: SPACING.xxl,
        borderRadius: RADIUS.xl,
    },

    // Icons
    leftIcon: {
        marginRight: SPACING.sm,
    },
    rightIcon: {
        marginLeft: SPACING.sm,
    },
});
