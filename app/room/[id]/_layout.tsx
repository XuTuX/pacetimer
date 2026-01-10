import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { COLORS } from "../../../lib/theme";

export default function RoomTabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textMuted,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: "600",
                    marginBottom: Platform.OS === "ios" ? 0 : 4,
                },
                tabBarStyle: {
                    backgroundColor: COLORS.surface,
                    borderTopColor: 'transparent', // Cleaner look without hard border
                    elevation: 0, // Remove Android shadow for flatter look or keep it subtle
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 10,
                    height: Platform.OS === "ios" ? 88 : 68,
                    paddingTop: 8,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "로비",
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name={focused ? "home" : "home-outline"} size={26} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="race"
                options={{
                    title: "모의고사",
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name={focused ? "document-text" : "document-text-outline"} size={26} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="analysis"
                options={{
                    title: "분석",
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name={focused ? "analytics" : "analytics-outline"} size={26} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
