-- Enforce one attempt per user per exam per room
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'attempts_room_exam_user_unique'
        AND conrelid = 'public.attempts'::regclass
    ) THEN
        ALTER TABLE public.attempts
            ADD CONSTRAINT attempts_room_exam_user_unique
            UNIQUE (room_id, exam_id, user_id);
    END IF;
END $$;
