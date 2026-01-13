import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { COLORS } from "../../lib/theme";

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.gray,
                tabBarShowLabel: false,
                tabBarStyle: {
                    backgroundColor: COLORS.bg,
                    borderTopColor: COLORS.border,
                    borderTopWidth: 1,
                    height: Platform.OS === "ios" ? 88 : 68,
                    paddingTop: 12,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "홈",
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="analysis"
                options={{
                    title: "분석",
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name={focused ? "analytics" : "analytics-outline"} size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="history"
                options={{
                    title: "기록",
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name={focused ? "calendar" : "calendar-outline"} size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="rooms"
                options={{
                    title: "스터디",
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name={focused ? "people" : "people-outline"} size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
