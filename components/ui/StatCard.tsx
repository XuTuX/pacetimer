import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../lib/theme';

interface StatCardProps {
    label: string;
    value: string | number;
    subValue?: string;
    color?: string;
}

export function StatCard({ label, value, subValue, color = COLORS.text }: StatCardProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            <Text style={[styles.value, { color }]}>{value}</Text>
            {subValue && <Text style={styles.subValue}>{subValue}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.surface,
        padding: 16,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 1,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textMuted,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    value: {
        fontSize: 24,
        fontWeight: '800',
    },
    subValue: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 2,
    }
});
