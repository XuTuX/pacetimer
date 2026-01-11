import React from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../lib/design-system';
import { Typography } from './Typography';

export type StatusType = 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED' | 'ABANDONED';

interface StatusBadgeProps {
    status: StatusType;
}

export function StatusBadge({ status }: StatusBadgeProps) {
    const statusLabels: Record<StatusType, string> = {
        COMPLETED: '완료',
        IN_PROGRESS: '진행 중',
        NOT_STARTED: '시작 전',
        ABANDONED: '중단',
    };

    const getStyles = () => {
        switch (status) {
            case 'COMPLETED':
                return { bg: COLORS.primaryLight, text: COLORS.primary };
            case 'IN_PROGRESS':
                return { bg: COLORS.warningLight, text: COLORS.warning };
            case 'ABANDONED':
                return { bg: COLORS.errorLight, text: COLORS.error };
            default:
                return { bg: COLORS.surfaceVariant, text: COLORS.textMuted };
        }
    };

    const { bg, text } = getStyles();

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <Typography.Label bold style={[styles.text, { color: text }]}>
                {statusLabels[status]}
            </Typography.Label>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
        alignSelf: 'flex-start',
    },
    text: {
        fontSize: 10,
        letterSpacing: 0.2,
    },
});
