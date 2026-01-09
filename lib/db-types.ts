export type RoomMemberRole = "member" | "owner";

export type Database = {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    created_at: string;
                    updated_at: string;
                    display_name: string | null;
                    avatar_url: string | null;
                };
                Insert: {
                    id: string;
                    display_name?: string | null;
                    avatar_url?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    display_name?: string | null;
                    avatar_url?: string | null;
                    updated_at?: string;
                };
                Relationships: [];
            };
            rooms: {
                Row: {
                    id: string;
                    created_at: string;
                    updated_at: string;
                    name: string;
                    owner_id: string;
                };
                Insert: {
                    name: string;
                    id?: string;
                    owner_id?: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    name?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            room_members: {
                Row: {
                    room_id: string;
                    user_id: string;
                    role: RoomMemberRole;
                    created_at: string;
                };
                Insert: {
                    room_id: string;
                    user_id?: string;
                    role?: RoomMemberRole;
                    created_at?: string;
                };
                Update: {
                    role?: RoomMemberRole;
                };
                Relationships: [];
            };
            attempts: {
                Row: {
                    id: string;
                    room_id: string;
                    user_id: string;
                    created_at: string;
                    started_at: string | null;
                    ended_at: string | null;
                    duration_ms: number;
                };
                Insert: {
                    room_id: string;
                    duration_ms: number;
                    id?: string;
                    user_id?: string;
                    created_at?: string;
                    started_at?: string | null;
                    ended_at?: string | null;
                };
                Update: {
                    started_at?: string | null;
                    ended_at?: string | null;
                    duration_ms?: number;
                };
                Relationships: [];
            };
        };
        Views: { [_ in never]: never };
        Functions: {
            debug_jwt: {
                Args: Record<string, never>;
                Returns: unknown;
            };
        };

        Enums: { [_ in never]: never };
        CompositeTypes: { [_ in never]: never };
    };
};
