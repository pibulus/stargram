-- ===================================================================
-- STARGRAM ORACLE — canonical reading store (run once in Supabase SQL editor)
-- ===================================================================
-- The shared notebook: the first reading written for a (period, date, sign)
-- becomes THE reading, served identically by every server instance.
-- Readings are public content: anyone may read, only the service role writes.

create table if not exists stargram_readings (
  period text not null,
  date_key text not null,
  sign text not null,
  reading jsonb not null,
  generated_at timestamptz not null default now(),
  primary key (period, date_key, sign)
);

create table if not exists stargram_journal (
  id int primary key default 1 check (id = 1),
  entries jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table stargram_readings enable row level security;
alter table stargram_journal enable row level security;

-- public read (readings are the product); no public writes — the service
-- role key (server-side only) bypasses RLS for the oracle's inserts
create policy "readings are public" on stargram_readings
  for select using (true);
