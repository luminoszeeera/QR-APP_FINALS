# SETUP COMMANDS — QR Attendance App

> **Target:** First-year students | **Expo SDK:** 54 | **Expo Go:** 54.0.8

---

## PREREQUISITES

| Tool | Download | Verify |
|---|---|---|
| Node.js (LTS) | https://nodejs.org/en | `node --version` |
| VS Code | https://code.visualstudio.com | (open it) |
| Expo Go 54.0.8 | Play Store → "Expo Go" | (version in app settings) |

---

## STEP 1 — Create the App

```powershell
cd D:\QR-ATT
npx create-expo-app@latest qr-att

# When prompted, select "SDK 54"
# Wait for npm install (~2 min)
```

---

## STEP 2 — Install Matching Versions

The default install may need these fixed versions that match Expo Go 54.0.8:

```powershell
npm install expo@~54.0.35 react@19.1.0 react-native@0.81.5 expo-router@~6.0.24 @expo/vector-icons@^15.0.3 expo-linking@~8.0.12 expo-constants@~18.0.13 expo-font@~14.0.12 expo-status-bar@~3.0.9 expo-splash-screen@~31.0.13 react-native-screens@~4.16.0 react-native-safe-area-context@~5.6.0 react-native-gesture-handler@~2.28.0 react-native-reanimated@~4.1.1 react-dom@19.1.0 react-native-web@~0.21.0 @types/react@~19.1.0 typescript@~5.9.2 --legacy-peer-deps
```

---

## STEP 3 — Start

```powershell
npx expo start
```

Scan QR code with Expo Go. Or press `W` for web.

---

## TROUBLESHOOTING

| Problem | Solution |
|---|---|
| npm install fails | Use `npm install --legacy-peer-deps` |
| App crashes in Expo Go | Make sure all versions match STEP 2 exactly |
| QR won't scan | Phone + computer on same WiFi |
| White screen | Wait 10s, or shake → Reload |
| TypeScript errors | Run `npx tsc --noEmit` |

---

## SUPABASE SETUP (Part I - Final Project)

1. Create a Supabase project, then copy `.env.example` to `.env` and fill in
   `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
2. Open **SQL Editor** in Supabase and run all of `supabase/schema.sql`
   (tables, relationships, Row Level Security, `record_attendance()` function).
3. Run the app, register an account, then promote it in the SQL Editor:

```sql
update public.profiles set role = 'admin'   where email = 'your.admin@school.edu';
update public.profiles set role = 'teacher' where email = 'your.teacher@school.edu';
```

After that, the admin can promote other users from the **Users** tab.

## ROLES

| Role | Can do |
|---|---|
| Student | Register/login, view profile, view events, scan QR, view own attendance history |
| Teacher | Create/edit/close own events, show event QR, view attendance + summaries for own events |
| Administrator | Manage users (roles), manage all events, view overall attendance, correct/remove attendance records |

New sign-ups are always students. Only an administrator can change roles.

See `EVENT_DRIVEN_FLOWS.md` for the event -> handler -> action -> result table
used in the final exam defense.

