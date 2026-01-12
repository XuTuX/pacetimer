import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter, useSegments } from "expo-router";
import { useEffect, useRef } from "react";
import { useAppStore } from "../lib/store";
import { useSupabase } from "../lib/supabase";
import { formatSupabaseError } from "../lib/supabaseError";

const warnDevOnly = (...args: unknown[]) => {
    if (__DEV__) {
        console.warn(...args);
    }
};

export default function AuthBootstrap() {
    const { isLoaded: authLoaded, userId } = useAuth();
    const { isLoaded: userLoaded, user } = useUser();
    const supabase = useSupabase();
    const router = useRouter();
    const segments = useSegments();

    const upsertedForUserIdRef = useRef<string | null>(null);
    const inFlightRef = useRef(false);

    useEffect(() => {
        if (!authLoaded || !userLoaded) return;

        if (!userId || !user) {
            upsertedForUserIdRef.current = null;
            inFlightRef.current = false;
            return;
        }

        if (upsertedForUserIdRef.current === userId) return;
        if (inFlightRef.current) return;
        inFlightRef.current = true;

        const avatarUrl = user.imageUrl ?? null;

        (async () => {
            // Check if profile exists
            const { data: existingProfile, error: fetchError } = await supabase
                .from("profiles")
                .select("display_name")
                .eq("id", userId)
                .single();

            const profileData = existingProfile as any;

            if (fetchError || !profileData) {
                // New user: Create profile but leave display_name null to trigger setup screen
                const { error } = await supabase
                    .from("profiles")
                    .upsert(
                        { id: userId, avatar_url: avatarUrl },
                        { onConflict: "id" },
                    );
                if (error) warnDevOnly("profiles.upsert 실패", formatSupabaseError(error));
            } else {
                // Existing user: Sync avatar only
                await supabase
                    .from("profiles")
                    .update({ avatar_url: avatarUrl } as any)
                    .eq("id", userId);
            }

            upsertedForUserIdRef.current = userId;

            // ---------------------------------------------------------
            // 닉네임(display_name) 설정 여부 확인
            // ---------------------------------------------------------
            const inSetup = segments[0] === "setup";
            if (inSetup) return;

            // If display_name is missing, redirect to setup
            if (!profileData?.display_name) {
                router.replace("/setup/profile" as any);
            } else {
                useAppStore.getState().setNickname(profileData.display_name);
            }

        })().catch((err) => {
            warnDevOnly("AuthBootstrap 실패", formatSupabaseError(err));
        }).finally(() => {
            inFlightRef.current = false;
        });
    }, [authLoaded, userLoaded, userId, user, supabase, segments]);

    return null;
}
