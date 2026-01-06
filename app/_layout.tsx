import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { COLORS } from "../lib/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack
        initialRouteName="(tabs)"
        screenOptions={{
          // 1. 기본 헤더를 숨김 (우리가 만든 UI가 헤더 역할을 대신함)
          headerShown: false,
          // 2. 기본 배경을 테마 bg로 통일
          contentStyle: { backgroundColor: COLORS.bg },
          // 3. 화면 전환 애니메이션 (iOS 스타일로 부드럽게)
          animation: "fade_from_bottom",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="focus/exam" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
