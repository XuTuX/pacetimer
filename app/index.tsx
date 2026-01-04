import { Redirect } from "expo-router";

// 탭 레이아웃을 기본 화면으로 열어주어 하단 탭이 항상 보이도록 리다이렉트합니다.
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
