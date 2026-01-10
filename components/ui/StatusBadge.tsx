import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../lib/theme';

export type StatusType = 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED' | 'ABANDONED';

interface StatusBadgeProps {
    status: StatusType;
}

export function StatusBadge({ status }: StatusBadgeProps) {
    const getStyles = () => {
        switch (status) {
            case 'COMPLETED':
                return { bg: '#E6F9F4', text: '#00D094' }; // Using primary colors
            case 'IN_PROGRESS':
                return { bg: '#FFF9E5', text: '#FFCC00' }; // Warning colors
            case 'ABANDONED':
                return { bg: '#FFE9E8', text: '#FF3B30' }; // Error colors
            default:
                return { bg: COLORS.surfaceVariant, text: COLORS.textMuted };
        }
    };

    const { bg, text } = getStyles();

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <Text style={[styles.text, { color: text }]}>{status.replace('_', ' ')}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    text: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
});
