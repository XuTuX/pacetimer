import React from 'react';
import { StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../../lib/theme';
import { Card } from './Card';
import { Typography } from './Typography';

interface StatCardProps {
    label: string;
    value: string | number;
    subValue?: string;
    color?: string;
}

export function StatCard({ label, value, subValue, color = COLORS.text }: StatCardProps) {
    return (
        <Card variant="flat" padding="md" radius="xl" style={styles.container}>
            <Typography.Label color={COLORS.textMuted} bold style={styles.label}>{label}</Typography.Label>
            <Typography.H2 color={color} bold>{value}</Typography.H2>
            {subValue && (
                <Typography.Caption color={COLORS.textMuted} style={styles.subValue}>
                    {subValue}
                </Typography.Caption>
            )}
        </Card>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    label: {
        marginBottom: SPACING.xs,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    subValue: {
        marginTop: 2,
    }
});
