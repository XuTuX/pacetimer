export function requireEnv(key: string): string {
    const value = process.env[key];
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`Missing ${key}. Add it to .env.local (EXPO_PUBLIC_*) and restart Expo.`);
    }
    return value;
}

