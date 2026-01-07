import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { COLORS } from "../../lib/theme";

export default function TabLayout() {

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: [
                    {
                        backgroundColor: COLORS.bg,
                        borderTopColor: COLORS.border,
                        height: Platform.OS === "ios" ? 88 : 68,
                        paddingBottom: Platform.OS === "ios" ? 30 : 12,
                        paddingTop: 12,
                        borderTopWidth: 1,
                        elevation: 0,
                        shadowOpacity: 0,
                    },
                ],
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.gray,
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: "600",
                    marginTop: 4,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "홈",
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="stats"
                options={{
                    title: "리포트",
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "analytics" : "analytics-outline"} size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="my-page"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen name="explore" options={{ href: null }} />
            <Tabs.Screen name="shop" options={{ href: null }} />
            <Tabs.Screen name="my-rooms" options={{ href: null }} />
        </Tabs>
    );
}
