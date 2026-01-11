import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../lib/theme';
import { Typography } from './Typography';

interface ScreenHeaderProps {
    title: string;
    subtitle?: string;
    showBack?: boolean;
    rightElement?: React.ReactNode;
    onBack?: () => void;
    style?: ViewStyle;
}

export function ScreenHeader({
    title,
    subtitle,
    showBack = true,
    rightElement,
    onBack,
    style
}: ScreenHeaderProps) {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top }, style]}>
            <View style={styles.headerContent}>
                <View style={styles.leftContainer}>
                    {showBack && (
                        <Pressable
                            onPress={onBack || (() => router.back())}
                            style={({ pressed }) => [
                                styles.backButton,
                                pressed && styles.pressed
                            ]}
                        >
                            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
                        </Pressable>
                    )}
                </View>

                <View style={styles.centerContainer}>
                    <Typography.Subtitle1 bold align="center" numberOfLines={1}>
                        {title}
                    </Typography.Subtitle1>
                    {subtitle && (
                        <Typography.Caption align="center" numberOfLines={1}>
                            {subtitle}
                        </Typography.Caption>
                    )}
                </View>

                <View style={styles.rightContainer}>
                    {rightElement || <View style={{ width: 40 }} />}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.bg,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.03)',
    },
    headerContent: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
    },
    leftContainer: {
        width: 60,
        alignItems: 'flex-start',
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rightContainer: {
        width: 60,
        alignItems: 'flex-end',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.surface,
        ...SHADOWS.small,
    },
    pressed: {
        opacity: 0.7,
        scaleY: 0.95,
        scaleX: 0.95,
    },
});
