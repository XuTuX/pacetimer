import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import React, { useRef, useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import PagerView from "react-native-pager-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../lib/theme";
import AnalysisScreen from "./analysis";
import HistoryScreen from "./history";
import HomeScreen from "./index";

export default function TabLayout() {
    const [activeIndex, setActiveIndex] = useState(0);
    const pagerRef = useRef<PagerView>(null);
    const insets = useSafeAreaInsets();

    const handleTabPress = (index: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveIndex(index);
        pagerRef.current?.setPage(index);
    };

    return (
        <View style={styles.container}>
            <PagerView
                ref={pagerRef}
                style={styles.pager}
                initialPage={0}
                onPageSelected={(e) => {
                    setActiveIndex(e.nativeEvent.position);
                    Haptics.selectionAsync();
                }}
            >
                <View key="0" style={styles.page}>
                    <HomeScreen />
                </View>
                <View key="1" style={styles.page}>
                    <AnalysisScreen />
                </View>
                <View key="2" style={styles.page}>
                    <HistoryScreen />
                </View>
            </PagerView>

            <View style={[styles.tabBar, { paddingBottom: insets.bottom || 20 }]}>
                <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => handleTabPress(0)}
                >
                    <Ionicons
                        name={activeIndex === 0 ? "home" : "home-outline"}
                        size={22}
                        color={activeIndex === 0 ? COLORS.primary : COLORS.gray}
                    />
                    <Text style={[styles.tabLabel, { color: activeIndex === 0 ? COLORS.primary : COLORS.gray }]}>홈</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => handleTabPress(1)}
                >
                    <Ionicons
                        name={activeIndex === 1 ? "analytics" : "analytics-outline"}
                        size={22}
                        color={activeIndex === 1 ? COLORS.primary : COLORS.gray}
                    />
                    <Text style={[styles.tabLabel, { color: activeIndex === 1 ? COLORS.primary : COLORS.gray }]}>분석</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => handleTabPress(2)}
                >
                    <Ionicons
                        name={activeIndex === 2 ? "calendar" : "calendar-outline"}
                        size={22}
                        color={activeIndex === 2 ? COLORS.primary : COLORS.gray}
                    />
                    <Text style={[styles.tabLabel, { color: activeIndex === 2 ? COLORS.primary : COLORS.gray }]}>기록</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    pager: {
        flex: 1,
    },
    page: {
        flex: 1,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: COLORS.bg,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 12,
        height: Platform.OS === "ios" ? 88 : 68,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: "600",
        marginTop: 4,
    },
});
