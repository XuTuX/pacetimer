import React from 'react';
import { Text, TextProps } from 'react-native';
import { COLORS, TYPOGRAPHY } from '../../lib/theme';

export interface ThemedTextProps extends TextProps {
    variant?: keyof typeof TYPOGRAPHY;
    color?: string;
    align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export function ThemedText({
    style,
    variant = 'body1',
    color = COLORS.text,
    align = 'left',
    ...rest
}: ThemedTextProps) {
    return (
        <Text
            style={[
                TYPOGRAPHY[variant],
                { color, textAlign: align },
                style
            ]}
            {...rest}
        />
    );
}
