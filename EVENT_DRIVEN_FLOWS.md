# QR-ATT - Event-Driven Flows, Database & Security (Final Exam Notes)

## 1. Event -> Handler -> Action -> Result

| # | Event | Handler (file) | Action | Result |
|---|---|---|---|---|
| 1 | User presses **Sign In** | `handleLogin` (`app/login.tsx`) | validate input, `signIn()` (`lib/auth.ts`) | Supabase auth event `SIGNED_IN` fires, session + profile load, route guard opens the app |
| 2 | Supabase **auth event** (`INITIAL_SESSION`, `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`) | `onAuthStateChange` in `initAuth()` (`lib/auth.ts`) | update the shared auth state, load profile/role | `Stack.Protected` in `app/_layout.tsx` switches between login and app; tabs change by role |
| 3 | User presses **Sign Up** | `handleRegister` (`app/register.tsx`) | validate fields, `signUp()` | DB trigger `on_auth_user_created` creates a **student** profile |
| 4 | Teacher presses **Create Event & QR** | `handleSave` (`app/event/form.tsx`) | `validateEventForm`, `createEvent()` -> INSERT | event saved with DB-generated code, screen opens with the QR |
| 5 | **Event status changes** (teacher presses Close / Reopen) | `changeStatus` (`app/event/[id].tsx`) | `setEventStatus()` -> UPDATE | QR is no longer accepted (status `closed`) |
| 6 | **QR scanner detects a QR code** | `handleBarcodeScanned` (`app/(tabs)/scan.tsx`) | `recordAttendance()` -> RPC `record_attendance` | "Attendance Recorded" confirmation card |
| 7 | **Invalid QR code detected** | `parseQRPayload` (`lib/qr.ts`) or DB code `INVALID_QR` | scan is rejected | red "Invalid QR Code" card |
| 8 | **Duplicate attendance detected** | unique index + `ON CONFLICT` in `record_attendance` | insert skipped | orange "Already Recorded" card |
| 9 | **Database record inserted** | `record_attendance()` returns `ok: true` | row added to `attendance` | appears in the student's history and the teacher's list on next refresh |
| 10 | Screen gets **focus / pull-to-refresh** | `useFocusEffect` + `RefreshControl` (events, history, event detail) | `load()` re-queries Supabase | **data is refreshed** |
| 11 | Admin taps a user | `changeRole` (`app/(tabs)/admin.tsx`) | `setUserRole()` | role updated; trigger lets only admins do this |
| 12 | Admin taps an attendance record | `correctRecord` (`app/event/[id].tsx`) | `updateAttendanceStatus()` / `deleteAttendance()` | record corrected or removed |
| 13 | User presses **Sign Out** | `handleSignOut` (`app/(tabs)/profile.tsx`) | `signOut()` | `SIGNED_OUT` event, session cleared, back to login |

## 2. Database & relationships

```
auth.users (Supabase) 1 --- 1 profiles (id, email, full_name, role, id_number)
profiles 1 --- * events      (events.created_by -> profiles.id)
profiles 1 --- * attendance  (attendance.student_id -> profiles.id)
events   1 --- * attendance  (attendance.event_id -> events.id)
UNIQUE (attendance.student_id, attendance.event_id)   <- no duplicate attendance
```

Events: name (`title`), date + time (`start_time`, `end_time`), `venue`, `description`, `status` (`open` / `closed`).
Attendance: student, event, date + time (`scanned_at`), `status` (`present` / `excused` / `absent`).

## 3. Authentication & authorization

- **Authentication:** Supabase email + password (hashed by Supabase, never stored in the app). Session is stored with `expo-secure-store` (encrypted device storage) and restored on app start.
- **Session handling / logout:** `onAuthStateChange` keeps state in sync; `Stack.Protected` blocks app screens when signed out; sign out clears the session.
- **Role-based access (3 layers):** hidden tabs per role -> each screen checks the role and shows "Access Denied" -> **Row Level Security** in the database is the real enforcement.
- **Roles can't be self-assigned:** sign-ups are always `student` (trigger) and only an admin can change a role (trigger + policy).

## 4. Validation & security checklist

| Requirement | Where |
|---|---|
| Input validation | `lib/validation.ts` (email, password >= 8 with letter + number, names, ID number, event fields); DB CHECK constraints |
| Duplicate attendance | unique index + `ON CONFLICT DO NOTHING` |
| Closed event / not started / ended | checked inside `record_attendance()` |
| Invalid QR | `parseQRPayload` + event lookup in the database |
| Unauthorized recording | `record_attendance()` only accepts the `student` role; no INSERT policy on `attendance` |
| Database protection | RLS on `profiles`, `events`, `attendance` (see `supabase/schema.sql`) |
| No secrets in source | `.env` is git-ignored; `.env.example` has placeholders; only the public anon key is used in the app |

## 5. Demo script (about 5 minutes)

1. Register a student -> show it is a student; sign in on a second device as teacher/admin.
2. Teacher: create event -> QR appears -> show summary.
3. Student: scan -> confirmation. Scan again -> **duplicate**. Scan a random QR -> **invalid**.
4. Teacher: close the event -> student scans -> **closed event**.
5. Student opens History; teacher opens the event to see the record; admin corrects a record and changes a role.
6. Sign out -> back at login.

## 6. Likely exam questions

- *Why is `record_attendance()` a database function?* So the rules can't be bypassed by editing the app; it runs with the server's authority and checks role, event status and time.
- *What does the QR contain?* Only `{"v":1,"event":"EVT-XXXXXXXX"}`; title/time/status are always read from the database.
- *How do you stop a student from becoming an admin?* Trigger forces `student` on insert; only admins may update `role` (trigger + RLS).
- *Which table relationships exist?* See section 2.
