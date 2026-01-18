import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import React from 'react';
import { LayoutAnimation, Platform, StyleSheet, TouchableOpacity, UIManager, View } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../lib/theme';
import { ThemedText } from './ThemedText';

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

export const SIDEBAR_WIDTH = 260;
export const SIDEBAR_COLLAPSED_WIDTH = 88;

interface MenuItemProps {
    name: string;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    active: boolean;
    isCollapsed: boolean;
    onPress: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, active, isCollapsed, onPress }) => (
    <TouchableOpacity
        style={[styles.menuItem, active && styles.menuItemActive, isCollapsed && styles.menuItemCollapsed]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <Ionicons
            name={active ? icon : `${icon}-outline` as any}
            size={24}
            color={active ? COLORS.primary : COLORS.textMuted}
        />
        {!isCollapsed && (
            <ThemedText
                style={[styles.menuLabel, active && styles.menuLabelActive]}
            >
                {label}
            </ThemedText>
        )}
        {active && !isCollapsed && <View style={styles.activeIndicator} />}
    </TouchableOpacity>
);

interface SidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
    const router = useRouter();
    const segments = useSegments();

    // Check current active tab
    const lastSegment = segments[segments.length - 1];
    const currentTab = lastSegment === '(tabs)' || !lastSegment ? 'index' : lastSegment;

    const menuItems = [
        { name: 'index', icon: 'home', label: '홈' },
        { name: 'analysis', icon: 'analytics', label: '분석' },
        { name: 'history', icon: 'calendar', label: '기록' },
        { name: 'rooms', icon: 'people', label: '스터디' },
    ];

    const handlePress = (name: string) => {
        if (name === 'index') {
            router.push('/(tabs)' as any);
        } else {
            router.push(`/(tabs)/${name}` as any);
        }
    };

    const handleToggle = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        onToggle();
    };

    return (
        <View style={[styles.container, isCollapsed && styles.containerCollapsed]}>
            <View style={[styles.header, isCollapsed && styles.headerCollapsed]}>
                {!isCollapsed && <ThemedText style={styles.logoText}>11:57</ThemedText>}
                <TouchableOpacity
                    onPress={handleToggle}
                    style={styles.toggleBtn}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={isCollapsed ? "menu-outline" : "chevron-back-outline"}
                        size={26}
                        color={COLORS.text}
                    />
                </TouchableOpacity>
            </View>

            <View style={styles.menu}>
                {menuItems.map((item) => (
                    <MenuItem
                        key={item.name}
                        name={item.name}
                        icon={item.icon as any}
                        label={item.label}
                        isCollapsed={isCollapsed}
                        active={currentTab === item.name}
                        onPress={() => handlePress(item.name)}
                    />
                ))}
            </View>

            <View style={styles.footer}>
                {/* Profile or Settings link could go here */}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: SIDEBAR_WIDTH,
        height: '100%',
        backgroundColor: COLORS.surface,
        borderRightWidth: 1,
        borderRightColor: COLORS.border,
        paddingTop: 80,
    },
    containerCollapsed: {
        width: SIDEBAR_COLLAPSED_WIDTH,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.xl,
        marginBottom: SPACING.massive,
        height: 50,
    },
    headerCollapsed: {
        justifyContent: 'center',
        paddingHorizontal: 0,
    },
    logoText: {
        color: COLORS.primary,
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -1.2,
    },
    toggleBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.bg,
    },
    menu: {
        flex: 1,
        paddingHorizontal: SPACING.lg,
        gap: SPACING.md,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: SPACING.xl,
        borderRadius: RADIUS.lg,
        position: 'relative',
    },
    menuItemCollapsed: {
        justifyContent: 'center',
        paddingHorizontal: 0,
    },
    menuItemActive: {
        backgroundColor: COLORS.primaryLight,
    },
    activeIndicator: {
        position: 'absolute',
        right: 0,
        width: 4,
        height: 24,
        backgroundColor: COLORS.primary,
        borderTopLeftRadius: 3,
        borderBottomLeftRadius: 3,
    },
    menuLabel: {
        marginLeft: SPACING.lg,
        fontSize: 17,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    menuLabelActive: {
        color: COLORS.primaryDark,
    },
    footer: {
        padding: SPACING.xl,
    },
});
