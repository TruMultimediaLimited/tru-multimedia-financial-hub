-- ============================================================================
-- Tru ERP — Automatic daily backup snapshots (pg_cron)
--
-- HOW TO RUN:
-- 1. In the Supabase Dashboard, go to Database -> Extensions, search for
--    "pg_cron", and toggle it ON. (This must be done from the Dashboard —
--    "create extension" for pg_cron will fail from SQL Editor otherwise.)
-- 2. Paste this entire file into the Supabase SQL Editor and run it once.
--
-- SAFE TO RE-RUN: uses "create or replace" / "create table if not exists"
-- and re-schedules the cron job cleanly each time this is run again.
--
-- WHAT THIS DOES: every day at 02:00 UTC, copies every business table's
-- current rows into a same-day snapshot table inside a separate "backups"
-- schema, then drops any snapshot set older than 30 days. Pure SQL, runs
-- entirely inside Postgres — no secrets, no external HTTP calls.
--
-- This is one layer of a two-layer backup approach: single deleted rows
-- can already be restored instantly from the Audit Log page (uses data
-- already captured by the existing audit trigger); this snapshot system
-- is the safety net for bulk/accidental changes across many rows, kept
-- for 30 days. Neither of these protects against the Supabase project
-- itself being deleted — for that, use the "Download all my data (JSON)"
-- button on the Audit Log page periodically and save it somewhere else
-- (email, Google Drive, phone storage).
-- ============================================================================

create extension if not exists pg_cron with schema extensions;

create schema if not exists backups;

create table if not exists backups.snapshot_log (
  id uuid primary key default gen_random_uuid(),
  run_date date not null,
  table_name text not null,
  row_count integer not null,
  created_at timestamptz not null default now(),
  unique (run_date, table_name)
);

create or replace function backups.snapshot_all_tables()
returns void
language plpgsql
security definer
set search_path = public, backups
as $$
declare
  tbl text;
  snap_name text;
  today text := to_char(now(), 'YYYYMMDD');
  cutoff date := (now() - interval '30 days')::date;
  tables text[] := array[
    'concerns', 'clients', 'client_concerns', 'employees', 'owners',
    'owner_investments', 'loans', 'projects', 'project_categories',
    'transactions', 'payments', 'invoices', 'opening_dues', 'opening_due_payments'
  ];
  rc integer;
  old_snap record;
begin
  foreach tbl in array tables loop
    snap_name := format('backups.%I', tbl || '_' || today);

    execute format('drop table if exists %s', snap_name);
    execute format('create table %s as table public.%I', snap_name, tbl);

    execute format('select count(*) from %s', snap_name) into rc;

    insert into backups.snapshot_log (run_date, table_name, row_count)
    values (current_date, tbl, rc)
    on conflict (run_date, table_name) do update set row_count = excluded.row_count, created_at = now();
  end loop;

  -- Prune snapshot tables older than the retention window (30 days).
  for old_snap in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'backups'
      and c.relkind = 'r'
      and c.relname ~ '_[0-9]{8}$'
      and to_date(right(c.relname, 8), 'YYYYMMDD') < cutoff
  loop
    execute format('drop table if exists backups.%I', old_snap.relname);
  end loop;

  delete from backups.snapshot_log where run_date < cutoff;
end;
$$;

-- Re-scheduling block: drop any previous job with this name, then create
-- it fresh — keeps this script safe to paste again after edits.
select cron.unschedule(jobid) from cron.job where jobname = 'tru_erp_daily_snapshot';
select cron.schedule('tru_erp_daily_snapshot', '0 2 * * *', $$select backups.snapshot_all_tables();$$);

-- Run once immediately so today's snapshot exists right away instead of
-- waiting for the first 02:00 UTC tick.
select backups.snapshot_all_tables();

-- ============================================================================
-- Verify anytime with these two queries:
--
-- select * from backups.snapshot_log order by run_date desc, table_name;
--
-- select j.jobname, j.schedule, r.status, r.start_time
-- from cron.job j
-- left join cron.job_run_details r on r.jobid = j.jobid
-- where j.jobname = 'tru_erp_daily_snapshot'
-- order by r.start_time desc
-- limit 5;
-- ============================================================================
