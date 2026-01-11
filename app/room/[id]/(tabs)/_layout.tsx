import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useGlobalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { useSupabase } from "../../../../lib/supabase";
import { COLORS } from "../../../../lib/theme";

export default function RoomTabsLayout() {
    const { id: roomId } = useGlobalSearchParams();
    const { userId } = useAuth();
    const supabase = useSupabase();
    const [unsolvedCount, setUnsolvedCount] = useState(0);

    useEffect(() => {
        if (!roomId || !userId) return;

        const fetchUnsolvedCount = async () => {
            try {
                const { data: exams } = await supabase
                    .from('room_exams')
                    .select('id')
                    .eq('room_id', roomId as string);

                if (!exams || exams.length === 0) {
                    setUnsolvedCount(0);
                    return;
                }

                const examIds = exams.map(e => e.id);

                // Fetch user's completed attempts for these exams
                const { data: attempts } = await supabase
                    .from('attempts')
                    .select('exam_id')
                    .eq('user_id', userId)
                    .in('exam_id', examIds)
                    .not('ended_at', 'is', null);

                const completedExamIds = new Set(attempts?.map(a => a.exam_id) || []);
                const unsolved = examIds.filter(id => !completedExamIds.has(id));
                setUnsolvedCount(unsolved.length);
            } catch (error) {
                console.error("Error fetching unsolved count:", error);
            }
        };

        fetchUnsolvedCount();

        // Subscribe to new exams
        const examChannel = supabase
            .channel(`room-exams-${roomId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'room_exams',
                filter: `room_id=eq.${roomId}`
            }, () => {
                fetchUnsolvedCount();
            })
            .subscribe();

        // Subscribe to attempt changes to update badge when user finishes an exam
        const attemptChannel = supabase
            .channel(`user-attempts-${userId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'attempts',
                filter: `user_id=eq.${userId}`
            }, () => {
                fetchUnsolvedCount();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(examChannel);
            supabase.removeChannel(attemptChannel);
        };
    }, [roomId, userId, supabase]);
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
                    borderTopColor: 'transparent',
                    elevation: 0,
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
                    tabBarBadge: unsolvedCount > 0 ? unsolvedCount : undefined,
                    tabBarBadgeStyle: {
                        backgroundColor: COLORS.primary,
                        color: COLORS.white,
                        fontSize: 10,
                        fontWeight: '900',
                    },
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
