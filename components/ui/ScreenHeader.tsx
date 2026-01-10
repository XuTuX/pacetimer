import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../lib/theme';

interface ScreenHeaderProps {
    title: string;
    showBack?: boolean;
    rightElement?: React.ReactNode;
    onBack?: () => void;
}

export function ScreenHeader({ title, showBack = true, rightElement, onBack }: ScreenHeaderProps) {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.content}>
                <View style={styles.left}>
                    {showBack && (
                        <Pressable
                            onPress={onBack || (() => router.back())}
                            style={({ pressed }) => [
                                styles.backButton,
                                pressed && { opacity: 0.7 }
                            ]}
                        >
                            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
                        </Pressable>
                    )}
                </View>

                <View style={styles.center}>
                    <Text style={styles.title} numberOfLines={1}>{title}</Text>
                </View>

                <View style={styles.right}>
                    {rightElement}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.bg,
    },
    content: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    left: {
        width: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    right: {
        width: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        letterSpacing: -0.5,
    },
    backButton: {
        padding: 4,
    }
});
