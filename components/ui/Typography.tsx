import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';
import { COLORS, TYPOGRAPHY } from '../../lib/design-system';

interface TypographyProps extends TextProps {
    children: React.ReactNode;
    color?: string;
    align?: 'left' | 'center' | 'right';
    bold?: boolean;
}

export const Typography = {
    H1: ({ children, style, color, align, bold, ...props }: TypographyProps) => (
        <Text
            style={[
                styles.h1,
                { color: color || COLORS.text, textAlign: align || 'left' },
                bold && { fontWeight: '900' },
                style
            ]}
            {...props}
        >
            {children}
        </Text>
    ),
    H2: ({ children, style, color, align, bold, ...props }: TypographyProps) => (
        <Text
            style={[
                styles.h2,
                { color: color || COLORS.text, textAlign: align || 'left' },
                bold && { fontWeight: '900' },
                style
            ]}
            {...props}
        >
            {children}
        </Text>
    ),
    H3: ({ children, style, color, align, bold, ...props }: TypographyProps) => (
        <Text
            style={[
                styles.h3,
                { color: color || COLORS.text, textAlign: align || 'left' },
                bold && { fontWeight: '900' },
                style
            ]}
            {...props}
        >
            {children}
        </Text>
    ),
    Subtitle1: ({ children, style, color, align, bold, ...props }: TypographyProps) => (
        <Text
            style={[
                styles.subtitle1,
                { color: color || COLORS.text, textAlign: align || 'left' },
                bold && { fontWeight: '800' },
                style
            ]}
            {...props}
        >
            {children}
        </Text>
    ),
    Subtitle2: ({ children, style, color, align, bold, ...props }: TypographyProps) => (
        <Text
            style={[
                styles.subtitle2,
                { color: color || COLORS.text, textAlign: align || 'left' },
                bold && { fontWeight: '800' },
                style
            ]}
            {...props}
        >
            {children}
        </Text>
    ),
    Body1: ({ children, style, color, align, bold, ...props }: TypographyProps) => (
        <Text
            style={[
                styles.body1,
                { color: color || COLORS.text, textAlign: align || 'left' },
                bold && { fontWeight: '700' },
                style
            ]}
            {...props}
        >
            {children}
        </Text>
    ),
    Body2: ({ children, style, color, align, bold, ...props }: TypographyProps) => (
        <Text
            style={[
                styles.body2,
                { color: color || COLORS.text, textAlign: align || 'left' },
                bold && { fontWeight: '700' },
                style
            ]}
            {...props}
        >
            {children}
        </Text>
    ),
    Caption: ({ children, style, color, align, bold, ...props }: TypographyProps) => (
        <Text
            style={[
                styles.caption,
                { color: color || COLORS.textMuted, textAlign: align || 'left' },
                bold && { fontWeight: '700' },
                style
            ]}
            {...props}
        >
            {children}
        </Text>
    ),
    Label: ({ children, style, color, align, bold, ...props }: TypographyProps) => (
        <Text
            style={[
                styles.label,
                { color: color || COLORS.textMuted, textAlign: align || 'left' },
                bold && { fontWeight: '900' },
                style
            ]}
            {...props}
        >
            {children}
        </Text>
    ),
};

const styles = StyleSheet.create({
    h1: TYPOGRAPHY.h1,
    h2: TYPOGRAPHY.h2,
    h3: TYPOGRAPHY.h3,
    subtitle1: TYPOGRAPHY.subtitle1,
    subtitle2: TYPOGRAPHY.subtitle2,
    body1: TYPOGRAPHY.body1,
    body2: TYPOGRAPHY.body2,
    caption: TYPOGRAPHY.caption,
    label: TYPOGRAPHY.label,
});
