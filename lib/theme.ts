/**
 * Design System Tokens for 11:57
 * This file centralizes all visual constants to ensure UI consistency.
 */

export const COLORS = {
    // Backgrounds & Layout
    dot: '#f92174e8',
    bg: "#F8F9FA",           // Main screen background
    surface: "#FFFFFF",      // Cards, modals, white surfaces
    surfaceVariant: "#F2F2F7", // Secondary background / input background

    // Core Brand Colors (Mint Green Theme)
    primary: "#00D094",      // Primary action color
    primaryLight: "#E6F9F4", // Light primary background
    primaryDark: "#00B380",  // Darker primary for active states

    // Gradients
    gradientDark: ['#1a1a1a', '#2d2d2d'] as const,
    gradientPrimary: ['#00D094', '#00C88C'] as const,

    // Status & Feedback
    success: "#34C759",
    warning: "#FFCC00",
    warningLight: "#FFF9E5",
    error: "#FF3B30",
    errorLight: "#FFE9E8",
    accent: "#FF3B30",
    accentLight: "#FFE9E8",

    // Text
    text: "#1C1C1E",         // Primary text
    textMuted: "#8E8E93",    // Secondary / muted text
    white: "#FFFFFF",

    // Borders & Dividers
    border: "#F2F2F7",
    borderDark: "#E5E5EA",

    // Compatibility
    gray: "#8E8E93",
    point: "#00D094",
    pointLight: "#E6F9F4",
};

export const SPACING = {
    none: 0,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    huge: 32,
    massive: 48,
};

export const RADIUS = {
    none: 0,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    full: 9999,
};


export const TYPOGRAPHY = {
    h1: {
        fontSize: 32,
        fontWeight: '800' as const,
        letterSpacing: -1,
    },
    h2: {
        fontSize: 24,
        fontWeight: '800' as const,
        letterSpacing: -0.5,
    },
    h3: {
        fontSize: 18,
        fontWeight: '800' as const,
        letterSpacing: -0.3,
    },
    subtitle1: {
        fontSize: 18,
        fontWeight: '600' as const,
        letterSpacing: -0.2,
    },
    subtitle2: {
        fontSize: 16,
        fontWeight: '600' as const,
        letterSpacing: -0.2,
    },
    body1: {
        fontSize: 16,
        fontWeight: '400' as const,
    },
    body2: {
        fontSize: 14,
        fontWeight: '400' as const,
    },
    caption: {
        fontSize: 12,
        fontWeight: '500' as const,
    },
    label: {
        fontSize: 10,
        fontWeight: '800' as const,
        letterSpacing: 0.5,
    },
};

export const SHADOWS = {
    small: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    medium: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
    },
    heavy: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
    },
};

export const DESIGN_SYSTEM = {
    COLORS,
    SPACING,
    RADIUS,
    TYPOGRAPHY,
    SHADOWS,
};
