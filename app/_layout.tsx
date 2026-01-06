import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack
        initialRouteName="(tabs)"
        screenOptions={{
          // 1. 기본 헤더를 숨김 (우리가 만든 UI가 헤더 역할을 대신함)
          headerShown: false,
          // 2. 배경색을 화이트로 통일 (디자인 일체감)
          contentStyle: { backgroundColor: "#FFFFFF" },
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
