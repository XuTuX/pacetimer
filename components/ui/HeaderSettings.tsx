import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../lib/theme';
import { ThemedText } from './ThemedText';

export function HeaderSettings() {
    const [isOpen, setIsOpen] = useState(false);
    const { signOut } = useAuth();
    const router = useRouter();

    const handleSignOut = async () => {
        try {
            await signOut();
            router.replace('/auth/login');
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <View style={styles.container}>
            {isOpen && (
                <Pressable
                    style={styles.backdrop}
                    onPress={() => setIsOpen(false)}
                />
            )}
            <TouchableOpacity
                style={styles.button}
                onPress={() => setIsOpen(!isOpen)}
                activeOpacity={0.7}
            >
                <Ionicons name="settings-outline" size={22} color={COLORS.white} />
            </TouchableOpacity>

            {isOpen && (
                <View style={styles.dropdown}>
                    <TouchableOpacity
                        style={styles.item}
                        onPress={() => {
                            setIsOpen(false);
                            router.push('/subjects/manage');
                        }}
                    >
                        <Ionicons name="book-outline" size={18} color={COLORS.text} />
                        <ThemedText style={styles.text}>과목 관리</ThemedText>
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <TouchableOpacity
                        style={styles.item}
                        onPress={() => {
                            setIsOpen(false);
                            handleSignOut();
                        }}
                    >
                        <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
                        <ThemedText style={[styles.text, { color: COLORS.error }]}>로그아웃</ThemedText>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        zIndex: 1000,
    },
    backdrop: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 1000,
        height: 2000,
    },
    button: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.text,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.small,
    },
    dropdown: {
        position: 'absolute',
        top: 48,
        right: 0,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.xs,
        minWidth: 160,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.medium,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        gap: 12,
    },
    text: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginHorizontal: SPACING.sm,
    },
});
