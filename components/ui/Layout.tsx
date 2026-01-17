import React from 'react';
import { View, ViewStyle, useWindowDimensions } from 'react-native';
import { BREAKPOINTS, LAYOUT, SPACING } from '../../lib/theme';

/**
 * Hook to detect current breakpoint
 */
export const useBreakpoint = () => {
    const { width } = useWindowDimensions();

    const isPhone = width < BREAKPOINTS.tablet;
    const isTablet = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.largeTablet;
    const isLargeTablet = width >= BREAKPOINTS.largeTablet;

    return {
        width,
        isPhone,
        isTablet,
        isLargeTablet,
        isAtLeastTablet: width >= BREAKPOINTS.tablet,
        isAtLeastLargeTablet: width >= BREAKPOINTS.largeTablet,
    };
};

interface ContainerProps {
    children: React.ReactNode;
    style?: ViewStyle;
    contentContainerStyle?: ViewStyle;
    maxWidth?: number;
    withPadding?: boolean;
}

/**
 * A container that limits the width on tablet/desktop and centers content
 */
export const ResponsiveContainer: React.FC<ContainerProps> = ({
    children,
    style,
    contentContainerStyle,
    maxWidth = LAYOUT.maxWidth,
    withPadding = true
}) => {
    const { isAtLeastTablet } = useBreakpoint();

    return (
        <View style={[{
            flex: 1,
            alignItems: 'center',
            width: '100%',
        }, style]}>
            <View style={[{
                width: '100%',
                maxWidth: isAtLeastTablet ? maxWidth : undefined,
                paddingHorizontal: isAtLeastTablet && withPadding ? LAYOUT.tabletPadding : (withPadding ? SPACING.lg : 0),
                flex: 1,
            }, contentContainerStyle]}>
                {children}
            </View>
        </View>
    );
};

interface GridProps {
    children: React.ReactNode;
    style?: ViewStyle;
    columns?: {
        phone?: number;
        tablet?: number;
        largeTablet?: number;
    };
    gap?: number;
}

/**
 * A simple grid layout helper
 */
export const Grid: React.FC<GridProps> = ({
    children,
    style,
    columns = { phone: 1, tablet: 2, largeTablet: 2 },
    gap = SPACING.lg
}) => {
    const { isPhone, isTablet, isLargeTablet } = useBreakpoint();

    let numColumns = columns.phone || 1;
    if (isLargeTablet && columns.largeTablet) numColumns = columns.largeTablet;
    else if (isTablet && columns.tablet) numColumns = columns.tablet;

    return (
        <View style={[{
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginHorizontal: -gap / 2
        }, style]}>
            {React.Children.map(children, (child) => (
                <View style={{
                    width: `${100 / numColumns}%`,
                    padding: gap / 2
                }}>
                    {child}
                </View>
            ))}
        </View>
    );
};
