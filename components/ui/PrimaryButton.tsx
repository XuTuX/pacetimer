import * as Haptics from 'expo-haptics';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { COLORS } from '../../lib/theme';

interface PrimaryButtonProps {
    label: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    style?: any;
}

export function PrimaryButton({ label, onPress, loading, disabled, style }: PrimaryButtonProps) {
    const handlePress = () => {
        if (!loading && !disabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onPress();
        }
    };

    return (
        <Pressable
            onPress={handlePress}
            disabled={loading || disabled}
            style={({ pressed }) => [
                styles.container,
                pressed && styles.pressed,
                (disabled || loading) && styles.disabled,
                style
            ]}
        >
            {loading ? (
                <ActivityIndicator color={COLORS.white} />
            ) : (
                <Text style={styles.label}>{label}</Text>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.primary,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 4,
    },
    pressed: {
        opacity: 0.9,
        transform: [{ scale: 0.98 }],
    },
    disabled: {
        backgroundColor: COLORS.border,
        shadowOpacity: 0,
        elevation: 0,
    },
    label: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
});
