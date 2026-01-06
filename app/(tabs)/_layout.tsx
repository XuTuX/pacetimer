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
                        backgroundColor: "#FFFFFF",
                        borderTopColor: "#EEEEEE",
                        height: Platform.OS === "ios" ? 88 : 68,
                        paddingBottom: Platform.OS === "ios" ? 30 : 12,
                        paddingTop: 12,
                        borderTopWidth: 1,
                        elevation: 0,
                        shadowOpacity: 0,
                    },
                ],
                tabBarActiveTintColor: COLORS.point,
                tabBarInactiveTintColor: "#CCCCCC",
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: "800",
                    marginTop: 4,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "시험",
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "timer" : "timer-outline"} size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="stats"
                options={{
                    title: "분석",
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "stats-chart" : "stats-chart-outline"} size={24} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
