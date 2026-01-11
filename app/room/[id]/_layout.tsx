import { Stack } from "expo-router";
import React from "react";
import { COLORS } from "../../../lib/theme";

export default function RoomRootLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: COLORS.bg },
                animation: "slide_from_right",
            }}
        >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="add-exam" options={{ presentation: "modal" }} />
            <Stack.Screen name="exam/[examId]/index" />
            <Stack.Screen name="exam/[examId]/run" />
        </Stack>
    );
}
