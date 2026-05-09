
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
  '1.4.0',
  6,
  'https://github.com/kamruj-akash/moneyMate-Cross-platform-app/releases/download/v1.4.0/app-release.apk',
  E'• New "Expense Tracking" profile mode — track only what you spend, no income\n• Unified profile switcher on Home + Settings (switch, edit, create — all in one place)\n• 60% smaller download (~95MB → ~35MB) with per-architecture APK splits\n• Dropped unused libraries to slim the bundle further',
  false
)
on conflict (platform) do update
  set version_name  = excluded.version_name,
      version_code  = excluded.version_code,
      apk_url       = excluded.apk_url,
      release_notes = excluded.release_notes,
      mandatory     = excluded.mandatory,
      released_at   = excluded.released_at;
