import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";
import { COLORS, RADIUS, SPACING } from "../../lib/theme";
import { Card } from "../ui/Card";
import { Typography } from "../ui/Typography";

interface InsightCardProps {
    type: 'positive' | 'warning' | 'trend' | 'strength' | 'pattern';
    icon: string;
    title: string;
    subtitle?: string;
    body: string;
    tip?: string;
    color: string;
}

const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    'checkmark-circle': 'checkmark-circle',
    'analytics': 'analytics',
    'trending-up': 'trending-up',
    'trending-down': 'trending-down',
    'star': 'star',
    'alert-circle': 'alert-circle',
    'people': 'people',
    'flash': 'flash',
    'time': 'time-outline',
    'ribbon': 'ribbon',
};

export function InsightCard({ type, icon, title, subtitle, body, tip, color }: InsightCardProps) {
    const iconName = iconMap[icon] || 'information-circle';

    const getBackgroundColor = () => {
        switch (type) {
            case 'positive':
            case 'strength':
                return `${color}15`;
            case 'warning':
                return `${color}10`;
            default:
                return COLORS.surface;
        }
    };

    return (
        <Card
            padding="lg"
            radius="xl"
            style={[styles.card, { backgroundColor: getBackgroundColor() }]}
        >
            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
                    <Ionicons name={iconName} size={20} color={color} />
                </View>
                {subtitle && (
                    <View style={styles.subtitleBadge}>
                        <Typography.Label color={COLORS.textMuted}>{subtitle}</Typography.Label>
                    </View>
                )}
            </View>

            <Typography.Subtitle1 bold color={COLORS.text} style={styles.title}>
                {title}
            </Typography.Subtitle1>

            <Typography.Body2 color={COLORS.textMuted} style={styles.body}>
                {body}
            </Typography.Body2>

            {tip && (
                <View style={styles.tipContainer}>
                    <Ionicons name="bulb-outline" size={14} color={color} />
                    <Typography.Caption color={color} style={styles.tipText}>
                        {tip}
                    </Typography.Caption>
                </View>
            )}
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.sm,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    subtitleBadge: {
        backgroundColor: COLORS.surfaceVariant,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
    },
    title: {
        marginBottom: SPACING.xs,
    },
    body: {
        lineHeight: 20,
    },
    tipContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: SPACING.md,
        paddingTop: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    tipText: {
        flex: 1,
    },
});
