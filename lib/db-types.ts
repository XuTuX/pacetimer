export type RoomMemberRole = "participant" | "host";

export type Database = {
    public: {
        Tables: {
            rooms: {
                Row: {
                    id: string;
                    created_at: string;
                    updated_at: string;
                    name: string;
                    description: string | null;
                    code: string;
                    owner_id: string;
                };
                Insert: {
                    id?: string;
                    created_at?: string;
                    updated_at?: string;
                    name: string;
                    description?: string | null;
                    code?: string;
                    owner_id: string;
                };
                Update: {
                    name?: string;
                    description?: string | null;
                    updated_at?: string;
                };
                Relationships: [];
            };
            room_members: {
                Row: {
                    id: string;
                    created_at: string;
                    room_id: string;
                    user_id: string;
                };
                Insert: {
                    id?: string;
                    created_at?: string;
                    room_id: string;
                    user_id: string;
                };
                Update: {
                    room_id?: string;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "room_members_room_id_fkey";
                        columns: ["room_id"];
                        referencedRelation: "rooms";
                        referencedColumns: ["id"];
                    }
                ];
            };
            room_exams: {
                Row: {
                    id: string;
                    created_at: string;
                    room_id: string;
                    title: string;
                    total_questions: number;
                    total_minutes: number;
                    is_active: boolean;
                };
                Insert: {
                    id?: string;
                    created_at?: string;
                    room_id: string;
                    title: string;
                    total_questions: number;
                    total_minutes: number;
                    is_active?: boolean;
                };
                Update: {
                    title?: string;
                    total_questions?: number;
                    total_minutes?: number;
                    is_active?: boolean;
                };
                Relationships: [
                    {
                        foreignKeyName: "room_exams_room_id_fkey";
                        columns: ["room_id"];
                        referencedRelation: "rooms";
                        referencedColumns: ["id"];
                    }
                ];
            };
            attempts: {
                Row: {
                    id: string;
                    created_at: string;
                    exam_id: string;
                    user_id: string;
                    started_at: string;
                    ended_at: string | null;
                    total_solved: number;
                    total_elapsed_seconds: number;
                    is_completed: boolean;
                };
                Insert: {
                    id?: string;
                    created_at?: string;
                    exam_id: string;
                    user_id: string;
                    started_at?: string;
                    ended_at?: string | null;
                    total_solved?: number;
                    total_elapsed_seconds?: number;
                    is_completed?: boolean;
                };
                Update: {
                    ended_at?: string | null;
                    total_solved?: number;
                    total_elapsed_seconds?: number;
                    is_completed?: boolean;
                };
                Relationships: [
                    {
                        foreignKeyName: "attempts_exam_id_fkey";
                        columns: ["exam_id"];
                        referencedRelation: "room_exams";
                        referencedColumns: ["id"];
                    }
                ];
            };
            exam_attempt_records: {
                Row: {
                    id: string;
                    created_at: string;
                    attempt_id: string;
                    question_index: number;
                    elapsed_seconds: number;
                    timestamp_at: string;
                };
                Insert: {
                    id?: string;
                    created_at?: string;
                    attempt_id: string;
                    question_index: number;
                    elapsed_seconds: number;
                    timestamp_at?: string;
                };
                Update: {
                    elapsed_seconds?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: "exam_attempt_records_attempt_id_fkey";
                        columns: ["attempt_id"];
                        referencedRelation: "attempts";
                        referencedColumns: ["id"];
                    }
                ];
            };
        };
        Views: { [_ in never]: never };
        Functions: {
            [_ in never]: never;
        };
        Enums: { [_ in never]: never };
        CompositeTypes: { [_ in never]: never };
    };
};
