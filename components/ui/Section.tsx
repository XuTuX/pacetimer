import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { COLORS, SPACING } from '../../lib/theme';
import { Typography } from './Typography';

interface SectionProps {
    title?: string;
    description?: string;
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    contentStyle?: StyleProp<ViewStyle>;
    rightElement?: React.ReactNode;
    noPadding?: boolean;
}

export function Section({
    title,
    description,
    children,
    style,
    contentStyle,
    rightElement,
    noPadding = false,
}: SectionProps) {
    return (
        <View style={[styles.container, style]}>
            {(title || rightElement) && (
                <View style={styles.header}>
                    <View style={styles.titleContainer}>
                        {title && (
                            <Typography.H3 bold style={styles.title}>
                                {title}
                            </Typography.H3>
                        )}
                        {description && (
                            <Typography.Caption style={styles.description}>
                                {description}
                            </Typography.Caption>
                        )}
                    </View>
                    {rightElement}
                </View>
            )}
            <View style={[!noPadding && styles.content, contentStyle]}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.huge,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.xl,
        marginBottom: SPACING.md,
    },
    titleContainer: {
        flex: 1,
    },
    title: {
        color: COLORS.text,
    },
    description: {
        marginTop: 2,
    },
    content: {
        paddingHorizontal: SPACING.xl,
    },
});
