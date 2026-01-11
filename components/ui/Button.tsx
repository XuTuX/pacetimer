import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    StyleProp,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    TouchableOpacityProps,
    ViewStyle
} from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../lib/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
    label: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
    icon?: keyof typeof Ionicons.glyphMap;
    iconPosition?: 'left' | 'right';
    loading?: boolean;
    fullWidth?: boolean;
}

export function Button({
    label,
    variant = 'primary',
    size = 'md',
    icon,
    iconPosition = 'left',
    loading = false,
    fullWidth = false,
    style,
    disabled,
    ...props
}: ButtonProps) {

    const getBackgroundColor = () => {
        if (disabled) return COLORS.surfaceVariant; // Disabled state often grey
        switch (variant) {
            case 'primary': return COLORS.primary;
            case 'secondary': return COLORS.primaryLight;
            case 'danger': return COLORS.errorLight;
            case 'outline': return 'transparent';
            case 'ghost': return 'transparent';
            default: return COLORS.primary;
        }
    };

    const getTextColor = () => {
        if (disabled) return COLORS.textMuted;
        switch (variant) {
            case 'primary': return COLORS.white;
            case 'secondary': return COLORS.primaryDark;
            case 'danger': return COLORS.error;
            case 'outline': return COLORS.primary;
            case 'ghost': return COLORS.textMuted;
            default: return COLORS.white;
        }
    };

    const getBorderColor = () => {
        if (disabled) return 'transparent';
        if (variant === 'outline') return COLORS.borderDark;
        return 'transparent';
    };

    const getHeight = () => {
        switch (size) {
            case 'sm': return 36;
            case 'md': return 48;
            case 'lg': return 56;
            default: return 48;
        }
    };

    const getFontSize = () => {
        switch (size) {
            case 'sm': return TYPOGRAPHY.body2.fontSize;
            case 'md': return TYPOGRAPHY.body1.fontSize;
            case 'lg': return TYPOGRAPHY.h3.fontSize;
            default: return TYPOGRAPHY.body1.fontSize;
        }
    };

    const containerStyle: StyleProp<ViewStyle> = [
        styles.container,
        {
            backgroundColor: getBackgroundColor(),
            height: getHeight(),
            borderRadius: RADIUS.md, // Consistent medium radius
            borderWidth: variant === 'outline' ? 1 : 0,
            borderColor: getBorderColor(),
            width: fullWidth ? '100%' : undefined,
            paddingHorizontal: SPACING.lg,
        },
        disabled && styles.disabled,
        style,
    ];

    const textStyle: StyleProp<TextStyle> = [
        styles.label,
        {
            color: getTextColor(),
            fontSize: getFontSize(),
            fontWeight: '700', // Buttons usually bold
        },
    ];

    return (
        <TouchableOpacity
            style={containerStyle}
            disabled={disabled || loading}
            activeOpacity={0.7}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <>
                    {icon && iconPosition === 'left' && (
                        <Ionicons name={icon} size={20} color={getTextColor()} style={{ marginRight: SPACING.sm }} />
                    )}
                    <Text style={textStyle}>{label}</Text>
                    {icon && iconPosition === 'right' && (
                        <Ionicons name={icon} size={20} color={getTextColor()} style={{ marginLeft: SPACING.sm }} />
                    )}
                </>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        textAlign: 'center',
    },
    disabled: {
        opacity: 0.8,
    },
});
