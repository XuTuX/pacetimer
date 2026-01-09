import "react-native-url-polyfill/auto";

import { useAuth } from "@clerk/clerk-expo";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useMemo } from "react";
import type { Database } from "./db-types";
import { requireEnv } from "./env";

export type ClerkGetTokenFn = () => Promise<string | null>;

const supabaseUrl = requireEnv("EXPO_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = requireEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY");

let didWarnJwtRejected = false;

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
                    console.warn("Failed to get Clerk JWT for Supabase request", err);
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
                    console.warn(
                        "Supabase rejected the Clerk JWT (PGRST301). Falling back to the anon key; " +
                            "make sure your Clerk JWT template is HS256 and signed with your Supabase JWT secret (not the anon key).",
                    );
                }

                return fetch(anonInput, { ...init, headers: originalHeaders });
            },
        },
    });
}

export function useSupabase(): SupabaseClient<Database> {
    const { getToken } = useAuth();

    return useMemo(() => {
        return createClerkSupabaseClient(() => getToken({ template: "supabase" }));
    }, [getToken]);
}
