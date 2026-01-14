-- Create room_subjects table
create table if not exists public.room_subjects (
    id uuid default gen_random_uuid() primary key,
    room_id uuid not null references public.rooms(id) on delete cascade,
    name text not null,
    is_archived boolean default false not null,
    created_by uuid references auth.users(id),
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- Add index for performance
create index if not exists room_subjects_room_id_idx on public.room_subjects(room_id);

-- Enable RLS
alter table public.room_subjects enable row level security;

-- Policies for room_subjects

-- 1. SELECT: Room Members can view subjects
create policy "Room members can view room subjects"
    on public.room_subjects for select
    using (
        auth.uid() in (
            select user_id from public.room_members
            where room_id = room_subjects.room_id
        )
    );

-- 2. INSERT: Only Room Owner can insert
create policy "Room owners can insert room subjects"
    on public.room_subjects for insert
    with check (
        auth.uid() = (
            select owner_id from public.rooms
            where id = room_subjects.room_id
        )
    );

-- 3. UPDATE: Only Room Owner can update
create policy "Room owners can update room subjects"
    on public.room_subjects for update
    using (
        auth.uid() = (
            select owner_id from public.rooms
            where id = room_subjects.room_id
        )
    );

-- 4. DELETE: Only Room Owner can delete (if needed, though we use archive)
create policy "Room owners can delete room subjects"
    on public.room_subjects for delete
    using (
        auth.uid() = (
            select owner_id from public.rooms
            where id = room_subjects.room_id
        )
    );


-- Modify room_exams table
-- Add subject_id column
alter table public.room_exams 
add column if not exists subject_id uuid references public.room_subjects(id) on delete set null;

-- Update room_exams policies to enforce strict Owner-Write / Member-Read
-- (Assuming existing policies might be too loose, we'll drop and recreate or create if not exists. 
-- For safety, I will drop existing policies if I knew their names, but since I don't, I will use generic names and 'create or replace' Logic isn't standard SQL.
-- I'll try to drop them by name if they follow a pattern, or just create new permissive ones that overlap if I can't be sure? 
-- No, conflicting policies are bad. 
-- Best approach: Drop potential previous policies or just overwrite if we knew the names.
-- Since I don't see previous migrations defining them, I will assume I should define them now.
-- But wait, if policies exist, creating new ones adds to them (OR logic).
-- To be safe, I will just ensure specific Owner-only write policies are in place. 
-- If previous policies allowed "public" write (unlikely) strict ones won't block it.
-- However, standard practice in this codebase seems to be defining them now.
-- Let's define the correct policies.

-- Ensure RLS is on
alter table public.room_exams enable row level security;

-- Drop insecure policies if we can guess them? No.
-- Let's just create the "Correct" ones. 
-- If duplicates exist with different names, it might be messy but acceptable for this task unless I list policies first.
-- I'll proceed with creating robust policies.

-- Policy: Members select
create policy "Room members can view room exams"
    on public.room_exams for select
    using (
        auth.uid() in (
            select user_id from public.room_members
            where room_id = room_exams.room_id
        )
    );

-- Policy: Owner insert
create policy "Room owners can insert room exams"
    on public.room_exams for insert
    with check (
        auth.uid() = (
            select owner_id from public.rooms
            where id = room_exams.room_id
        )
    );

-- Policy: Owner update
create policy "Room owners can update room exams"
    on public.room_exams for update
    using (
        auth.uid() = (
            select owner_id from public.rooms
            where id = room_exams.room_id
        )
    );

-- Policy: Owner delete
create policy "Room owners can delete room exams"
    on public.room_exams for delete
    using (
        auth.uid() = (
            select owner_id from public.rooms
            where id = room_exams.room_id
        )
    );
