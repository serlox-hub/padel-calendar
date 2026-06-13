-- Padel calendar — run this in the Supabase SQL editor once.

create table if not exists public.signups (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  period text not null check (period in ('morning', 'afternoon')),
  name text not null,
  match_time text not null,
  created_at timestamptz not null default now()
);

create index if not exists signups_date_idx on public.signups (date);

-- Stop the same name signing up twice to the same slot.
create unique index if not exists signups_unique_person
  on public.signups (date, period, lower(name));

-- Realtime: broadcast inserts/updates/deletes to the browser.
alter publication supabase_realtime add table public.signups;

-- This is a friends-only app with no login, so we open access via the anon key.
alter table public.signups enable row level security;

create policy "public read"   on public.signups for select using (true);
create policy "public insert" on public.signups for insert with check (true);
create policy "public update" on public.signups for update using (true) with check (true);
create policy "public delete" on public.signups for delete using (true);
