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
-- Guarded so re-running this file doesn't error if it's already added.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'signups'
  ) then
    alter publication supabase_realtime add table public.signups;
  end if;
end $$;

-- This is a friends-only app with no login, so we open access via the anon key.
alter table public.signups enable row level security;

drop policy if exists "public read"   on public.signups;
drop policy if exists "public insert" on public.signups;
drop policy if exists "public update" on public.signups;
drop policy if exists "public delete" on public.signups;
create policy "public read"   on public.signups for select using (true);
create policy "public insert" on public.signups for insert with check (true);
create policy "public update" on public.signups for update using (true) with check (true);
create policy "public delete" on public.signups for delete using (true);

-- ---------------------------------------------------------------------------
-- Web Push: one row per browser/device that opted in to notifications.
-- `endpoint` is the unique "mailbox" the browser's push service handed us.
-- ---------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  subscription jsonb not null,   -- full PushSubscription (endpoint + keys)
  name text,                     -- who subscribed, so we can skip notifying them
  created_at timestamptz not null default now()
);

-- Same friends-only, no-login model as signups: open via the anon key.
alter table public.push_subscriptions enable row level security;

drop policy if exists "public read"   on public.push_subscriptions;
drop policy if exists "public insert" on public.push_subscriptions;
drop policy if exists "public update" on public.push_subscriptions;
drop policy if exists "public delete" on public.push_subscriptions;
create policy "public read"   on public.push_subscriptions for select using (true);
create policy "public insert" on public.push_subscriptions for insert with check (true);
create policy "public update" on public.push_subscriptions for update using (true) with check (true);
create policy "public delete" on public.push_subscriptions for delete using (true);
