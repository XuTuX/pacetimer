import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SHADOWS } from '../../lib/theme';

export function HeaderSettings() {
    const router = useRouter();

    return (
        <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/settings')}
            activeOpacity={0.7}
        >
            <Ionicons name="settings-outline" size={22} color={COLORS.white} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.text,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.small,
    },
});

