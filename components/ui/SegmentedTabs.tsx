import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../lib/design-system';
import { Typography } from './Typography';

interface SegmentedTabsProps {
    tabs: string[];
    activeTab: number;
    onChange: (index: number) => void;
}

export function SegmentedTabs({ tabs, activeTab, onChange }: SegmentedTabsProps) {
    const handlePress = (index: number) => {
        if (index !== activeTab) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChange(index);
        }
    };

    return (
        <View style={styles.container}>
            {tabs.map((tab, index) => {
                const isActive = activeTab === index;
                return (
                    <Pressable
                        key={tab}
                        onPress={() => handlePress(index)}
                        style={[
                            styles.tab,
                            isActive && styles.activeTab
                        ]}
                    >
                        <Typography.Label
                            bold={isActive}
                            color={isActive ? COLORS.text : COLORS.textMuted}
                        >
                            {tab}
                        </Typography.Label>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: COLORS.surfaceVariant,
        borderRadius: RADIUS.md,
        padding: 4,
        marginHorizontal: SPACING.xl,
        marginVertical: SPACING.sm,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: RADIUS.sm,
    },
    activeTab: {
        backgroundColor: COLORS.surface,
        ...SHADOWS.small,
    },
});
