# Debug: Supabase RLS (Clerk JWT)

## Prereqs
- Supabase project is DB-only (Postgres + RLS). Do not use Supabase Auth for login.
- Clerk JWT Template named `supabase` is configured (HS256) and signed with the Supabase **JWT secret**.
  - Required claims: `sub` (Clerk userId), `role=authenticated`, `aud=authenticated`.
- Supabase schema + RLS policies are applied (profiles / rooms / room_members / attempts).

## App env
Add these to `.env.local` and restart Expo:

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

## What the app does
- `components/AuthBootstrap.tsx` runs once after Clerk loads and upserts your `profiles` row.
  - This is required because `rooms.owner_id` references `profiles.id` (and the DB uses Clerk userId as the PK).
- `lib/supabase.ts` injects `Authorization: Bearer <ClerkJWT>` on every Supabase request.
  - No `service_role` key is ever used on the client.

## RLS test screen
Open the **Debug** tab → **Supabase RLS Test** (`app/(tabs)/debug/supabase-rls.tsx`).

### Expected success path
1) **Create Room**
   - Returns a `rooms` row and sets `roomId` in the UI.
2) **Join Room**
   - Inserts a `room_members` row for your user (role defaults to `member`).
3) **Insert Attempt**
   - Inserts an `attempts` row for *your* user, scoped to the selected room.
4) **Fetch My Rooms**
   - Returns rooms you own or rooms you’re a member of (RLS enforced).
5) **Fetch Attempts (Current Room)**
   - Returns attempts for the selected room if you’re a member/owner. (Note: These are high-level sessions, individual question records are in `attempt_records` table).

### Expected RLS denial signal
- **Fetch Attempts (Random RoomId)** should return `rows: []` (or a permission error depending on your exact RLS),
  proving you can’t read attempts for rooms you don’t belong to.

## Common failures
- **Room creation fails with FK error**: your `profiles` row wasn’t created yet.
  - Confirm `AuthBootstrap` ran (check Metro logs) and your JWT template is correct.
- **401 / invalid signature**: Clerk JWT template signing secret doesn’t match the Supabase JWT secret.

