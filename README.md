# MoneyMate

Premium personal expense tracker with offline-first sync via Supabase.

## Quick start

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go on your Android device.

## Tech

- **React Native** (Expo SDK 51, expo-router file-based routing)
- **Supabase** for auth + cloud sync (`ronshlkujncivanmvbdz.supabase.co`)
- **AsyncStorage** offline-first cache; queue-based sync
- **Reanimated 3** for spring animations & gestures
- **react-native-svg** for custom pie/bar/line charts (no chart-kit dependency at runtime)

## Folder map

```
app/                 — expo-router screens
  (auth)/            — welcome, signup, verify, login
  (tabs)/            — index (dashboard), history, analytics, categories, settings
  add-transaction.js — modal sheet
  transaction/[id].js
components/          — UI primitives + feature components
context/             — AuthContext, DataContext (single source of truth)
lib/                 — supabase client, syncManager, notifications, recurring, export
utils/               — currency, date, haptics, uuid
constants/           — theme, default categories, icon picker set
```

## Design system

See `constants/theme.js` — Midnight Purple aesthetic with 1px white-opacity borders, restrained purple glows, diagonal gradients on the hero card and FAB only.

## Build APK

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview
```

## Supabase tables (already provisioned server-side)

- `transactions` (id, user_id, type, amount, title, note, category_id, date, recurring_id, updated_at)
- `categories` (id, user_id, name, icon, color, type, is_default, updated_at)
- `recurring_transactions` (id, user_id, type, amount, title, note, category_id, frequency, start_date, next_due_date, end_date, is_active, updated_at)
- `user_settings` (id, user_id, currency, monthly_budget, alert_threshold, notifications_enabled, updated_at)

RLS policies and the auto-default-categories trigger run server-side.

## Offline behavior

Every write hits AsyncStorage first, then enqueues a sync action. Reads come from local cache. When network returns, the queue drains automatically. App-foreground & 5-minute interval also trigger `fullSync`.
