import "react-native-url-polyfill/auto";

import { useAuth } from "@clerk/clerk-expo";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useRef } from "react";
import type { Database } from "./db-types";
import { requireEnv } from "./env";

export type ClerkGetTokenFn = () => Promise<string | null>;

const supabaseUrl = requireEnv("EXPO_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = requireEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY");

let didWarnJwtRejected = false;

const warnDevOnly = (...args: unknown[]) => {
    if (__DEV__) {
        console.warn(...args);
    }
};

export function createClerkSupabaseClient(getToken: ClerkGetTokenFn): SupabaseClient<Database> {
    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
        global: {
            fetch: async (input, init = {}) => {
                const anonInput =
                    typeof Request !== "undefined" && input instanceof Request ? input.clone() : input;

                let token: string | null = null;
                try {
                    token = await getToken();
                } catch (err) {
                    warnDevOnly("Supabase 요청용 Clerk JWT 가져오기 실패", err);
                }

                const originalHeaders = new Headers(init.headers ?? {});
                const headers = new Headers(originalHeaders);
                if (token) headers.set("Authorization", `Bearer ${token}`);

                const response = await fetch(input, { ...init, headers });
                if (!token || response.status !== 401) return response;

                const body = await response.clone().text().catch(() => "");
                if (
                    !body.includes("PGRST301") &&
                    !body.includes("No suitable key") &&
                    !body.includes("wrong key type")
                ) {
                    return response;
                }

                if (!didWarnJwtRejected) {
                    didWarnJwtRejected = true;
                    warnDevOnly(
                        "Supabase가 Clerk JWT(PGRST301)를 거절했습니다. anon 키로 대체합니다. " +
                            "Clerk JWT 템플릿이 HS256이며 Supabase JWT 시크릿으로 서명됐는지 확인하세요.",
                    );
                }

                return fetch(anonInput, { ...init, headers: originalHeaders });
            },
        },
    });
}

export function useSupabase(): SupabaseClient<Database> {
    const { getToken } = useAuth();
    const getTokenRef = useRef(getToken);

    useEffect(() => {
        getTokenRef.current = getToken;
    }, [getToken]);

    return useMemo(() => {
        return createClerkSupabaseClient(() => getTokenRef.current({ template: "supabase" }));
    }, []);
}
