-- Create attempt_records table for per-question tracking
CREATE TABLE IF NOT EXISTS public.attempt_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
    question_no INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.attempt_records ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow members to view attempt records"
ON public.attempt_records FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.attempts a
        JOIN public.room_members rm ON a.room_id = rm.room_id
        WHERE a.id = attempt_records.attempt_id
        AND rm.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Allow users to insert their own records"
ON public.attempt_records FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.attempts a
        WHERE a.id = attempt_records.attempt_id
        AND a.user_id = (SELECT auth.uid())
    )
);
