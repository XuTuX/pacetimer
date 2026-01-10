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
                tabBarInactiveTintColor: COLORS.gray,
                tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
                tabBarStyle: {
                    backgroundColor: COLORS.bg,
                    borderTopColor: COLORS.border,
                    borderTopWidth: 1,
                    paddingTop: 12,
                    height: Platform.OS === "ios" ? 88 : 68,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Lobby",
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="race"
                options={{
                    title: "Race",
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name={focused ? "stopwatch" : "stopwatch-outline"} size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="rank"
                options={{
                    title: "Rank",
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name={focused ? "ribbon" : "ribbon-outline"} size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
