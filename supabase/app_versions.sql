
create table if not exists public.app_versions (
  platform       text primary key,
  version_name   text        not null,
  version_code   int         not null,
  apk_url        text,
  release_notes  text,
  mandatory      boolean     not null default false,
  released_at    timestamptz not null default now()
);

-- Anyone (even unauthenticated / offline-mode users) can read this; nothing
-- secret here, just the latest published version. Writes are restricted to
-- service-role / dashboard.
alter table public.app_versions enable row level security;

drop policy if exists "anyone reads app_versions" on public.app_versions;
create policy "anyone reads app_versions"
  on public.app_versions for select
  using (true);

-- Seed the current Android release so the feature works immediately after
-- the app is rebuilt. Use upsert so re-running the script is safe.
insert into public.app_versions (platform, version_name, version_code, apk_url, release_notes, mandatory)
values (
  'android',
  '1.5.0',
  8,
  'https://github.com/kamruj-akash/moneyMate-Cross-platform-app/releases/download/v1.5.0/app-release.apk',
  E'• History tab now opens to This Month by default\n• New "Custom range" filter — pick any from–to date span\n• Download monthly PDF directly from History — only months with transactions are shown\n• PDF now saves straight to device (Android folder picker / iOS Files) — no more share-only\n• Better PDF rendering — proper Bengali ৳ symbol, clean print layout\n• Sync efficiency fix — no more spurious "N pending" on every cold start\n• Removed redundant Export/Backup/Restore rows from Settings',
  false
)
on conflict (platform) do update
  set version_name  = excluded.version_name,
      version_code  = excluded.version_code,
      apk_url       = excluded.apk_url,
      release_notes = excluded.release_notes,
      mandatory     = excluded.mandatory,
      released_at   = excluded.released_at;
