import { Stack } from "expo-router";
import React from "react";
import { COLORS } from "../../../../lib/theme";

export default function RoomInsideLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: COLORS.bg },
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="add-exam" options={{ presentation: "modal" }} />
            <Stack.Screen name="exam/[examId]/index" />
            <Stack.Screen name="exam/[examId]/run" />
        </Stack>
    );
}
