import { Stack } from "expo-router";
import { COLORS } from "../../../lib/theme";

export default function DebugLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: COLORS.bg },
                headerTintColor: COLORS.text,
                headerShadowVisible: false,
                contentStyle: { backgroundColor: COLORS.bg },
            }}
        >
            <Stack.Screen name="index" options={{ title: "Supabase RLS Test" }} />
            <Stack.Screen name="supabase-rls" options={{ title: "Supabase RLS Test" }} />
        </Stack>
    );
}

