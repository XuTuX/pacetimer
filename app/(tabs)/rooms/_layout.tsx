import { Stack } from "expo-router";
import { COLORS } from "../../../lib/theme";

export default function RoomsLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: COLORS.bg },
                headerTintColor: COLORS.text,
                headerShadowVisible: false,
                contentStyle: { backgroundColor: COLORS.bg },
            }}
        >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="create" options={{ title: "룸 만들기" }} />
            <Stack.Screen name="[id]" options={{ headerShown: false }} />
        </Stack>
    );
}
