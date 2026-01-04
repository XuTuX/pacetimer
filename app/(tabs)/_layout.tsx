import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#FFFFFF',
                    borderTopColor: '#F1F5F9',
                    height: Platform.OS === 'ios' ? 88 : 68,
                    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    elevation: 0,
                    shadowOpacity: 0,
                },
                tabBarActiveTintColor: '#6366F1',
                tabBarInactiveTintColor: '#94A3B8',
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '700',
                    marginTop: 4,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: '시험',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "timer" : "timer-outline"} size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="stats"
                options={{
                    title: '분석',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "stats-chart" : "stats-chart-outline"} size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="store"
                options={{
                    title: '상점',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "cart" : "cart-outline"} size={24} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
