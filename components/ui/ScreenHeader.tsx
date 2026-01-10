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
            <View style={styles.headerContent}>
                <View style={styles.leftContainer}>
                    {showBack ? (
                        <Pressable
                            onPress={onBack || (() => router.back())}
                            style={({ pressed }) => [
                                styles.actionButton,
                                pressed && { opacity: 0.6 }
                            ]}
                        >
                            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
                        </Pressable>
                    ) : (
                        <View style={{ width: 40 }} />
                    )}
                </View>

                <View style={styles.titleContainer}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
                </View>

                <View style={styles.rightContainer}>
                    {rightElement ? (
                        <View style={styles.rightContent}>
                            {rightElement}
                        </View>
                    ) : (
                        <View style={{ width: 40 }} />
                    )}
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
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    leftContainer: {
        flex: 1,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    titleContainer: {
        flex: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rightContainer: {
        flex: 1,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
        letterSpacing: -0.5,
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.surface,
        // Subtle shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    rightContent: {
        flexDirection: 'row',
        alignItems: 'center',
    }
});
