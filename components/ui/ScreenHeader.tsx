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
    align?: 'left' | 'center';
}

export function ScreenHeader({
    title,
    subtitle,
    showBack = true,
    rightElement,
    onBack,
    style,
    align = 'center'
}: ScreenHeaderProps) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const isLeft = align === 'left';

    return (
        <View style={[styles.container, { paddingTop: insets.top }, style]}>
            <View style={[styles.headerContent, isLeft && styles.headerContentLeft]}>
                {!isLeft && (
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
                )}

                <View style={[styles.centerContainer, isLeft && styles.centerContainerLeft]}>
                    <Typography.H2 bold align={isLeft ? 'left' : 'center'} numberOfLines={1}>
                        {title}
                    </Typography.H2>
                    {subtitle && (
                        <Typography.Caption
                            align={isLeft ? 'left' : 'center'}
                            numberOfLines={1}
                            color={COLORS.textMuted}
                            style={styles.subtitle}
                        >
                            {subtitle}
                        </Typography.Caption>
                    )}
                </View>

                <View style={[styles.rightContainer, isLeft && styles.rightContainerLeft]}>
                    {rightElement || (!isLeft && <View style={{ width: 40 }} />)}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.bg,
    },
    headerContent: {
        height: 80,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.xxl, // 24
    },
    headerContentLeft: {
        justifyContent: 'space-between',
        height: 90,
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
    centerContainerLeft: {
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    rightContainer: {
        width: 60,
        alignItems: 'flex-end',
    },
    rightContainerLeft: {
        width: 'auto',
        minWidth: 44,
        alignItems: 'flex-end',
    },
    subtitle: {
        marginTop: 2,
        fontWeight: '600',
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

