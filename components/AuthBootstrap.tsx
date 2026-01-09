import { useAuth, useUser } from "@clerk/clerk-expo";
import { useEffect, useRef } from "react";
import { formatSupabaseError } from "../lib/supabaseError";
import { useSupabase } from "../lib/supabase";

function toDisplayName(user: ReturnType<typeof useUser>["user"]): string | null {
    if (!user) return null;
    if (user.fullName) return user.fullName;
    if (user.username) return user.username;

    const combined = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    return combined.length > 0 ? combined : null;
}

export default function AuthBootstrap() {
    const { isLoaded: authLoaded, userId } = useAuth();
    const { isLoaded: userLoaded, user } = useUser();
    const supabase = useSupabase();

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

        const displayName = toDisplayName(user);
        const avatarUrl = user.imageUrl ?? null;

        (async () => {
            const { error } = await supabase
                .from("profiles")
                .upsert(
                    { id: userId, display_name: displayName, avatar_url: avatarUrl },
                    { onConflict: "id" },
                );

            if (error) {
                console.warn("profiles.upsert failed", formatSupabaseError(error));
                return;
            }

            upsertedForUserIdRef.current = userId;
        })().catch((err) => {
            console.warn("AuthBootstrap failed", formatSupabaseError(err));
        }).finally(() => {
            inFlightRef.current = false;
        });
    }, [authLoaded, userLoaded, userId, user, supabase]);

    return null;
}
