export function requireEnv(key: string): string {
    const value = process.env[key];
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`${key}가 설정되지 않았습니다. .env.local(EXPO_PUBLIC_*)에 추가한 뒤 Expo를 재시작하세요.`);
    }
    return value;
}
