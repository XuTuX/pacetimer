import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../lib/theme';

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
                        <Text style={[
                            styles.tabText,
                            isActive && styles.activeTabText
                        ]}>
                            {tab}
                        </Text>
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
        borderRadius: 12,
        padding: 4,
        marginHorizontal: 16,
        marginVertical: 8,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
    },
    activeTab: {
        backgroundColor: COLORS.surface,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    activeTabText: {
        color: COLORS.text,
        fontWeight: '700',
    },
});
