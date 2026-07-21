-- ============================================================================
-- Tru ERP — Full database schema (Phase 2)
-- Tru Multimedia Limited + 4 concerns: 4R Studio, Truphoto Studio,
-- Uthshob Mukhor, Tru Studios.
--
-- HOW TO RUN: paste this entire file into the Supabase SQL Editor and
-- run it once, top to bottom, in one go.
--
-- SAFE TO RE-RUN: this script starts by dropping every table/view/type
-- it creates, so running it again gives you a clean slate. Do NOT run
-- this against a database that already has real data you want to keep.
--
-- Design notes (see docs/architecture.md for full reasoning):
--   * Transaction != Payment. transactions.total_amount is fixed; how
--     much of it has actually been paid is derived from the payments
--     table via the transaction_balances view below, never stored on
--     the transaction row itself. This avoids a status column drifting
--     out of sync with reality.
--   * payments.transaction_id cascades on delete: deleting a
--     transaction removes its payments with it, rather than blocking
--     the delete with a foreign key error.
--   * RLS is intentionally left disabled here — it gets layered in
--     once the core modules are built and stable (see architecture
--     doc, "Future scalability").
-- ============================================================================


-- ============================================================================
-- 0. CLEAN SLATE
-- ============================================================================

drop table if exists audit_log cascade;
drop table if exists invoices cascade;
drop table if exists work_logs cascade;
drop table if exists payments cascade;
drop table if exists transactions cascade;
drop table if exists projects cascade;
drop table if exists employees cascade;
drop table if exists owner_investments cascade;
drop table if exists owners cascade;
drop table if exists clients cascade;
drop table if exists concerns cascade;

-- leftover tables from the pre-reset version of this project (not part of
-- the current schema) — dropped here so the database matches the fresh
-- start, not just the repo.
drop table if exists partner_ledger cascade;
drop table if exists partners cascade;
drop table if exists payroll_runs cascade;
drop table if exists staff_work_log cascade;
drop table if exists project_payments cascade;
drop table if exists staff cascade;

drop view if exists audit_log_with_user;
drop view if exists transaction_balances;
drop view if exists project_balances;
drop view if exists concern_pl_view;
drop view if exists client_balances;
drop view if exists owner_balances;

drop function if exists log_audit_event() cascade;

drop type if exists transaction_type cascade;
drop type if exists payment_channel cascade;
drop type if exists employee_type cascade;
drop type if exists project_status cascade;
drop type if exists audit_action cascade;

create extension if not exists pgcrypto;


-- ============================================================================
-- 1. ENUMS
-- ============================================================================

create type transaction_type as enum ('income', 'expense');
create type payment_channel as enum ('bkash', 'nagad', 'bank', 'cash', 'other');
create type employee_type as enum ('fixed', 'remote', 'project_based');
create type project_status as enum ('active', 'completed', 'stalled');
create type audit_action as enum ('insert', 'update', 'delete');


-- ============================================================================
-- 2. CONCERNS
-- Tru Multimedia Limited is the parent (parent_concern_id null); the 4
-- concerns reference it. Nothing elsewhere is hardcoded to "4 concerns" —
-- adding a 5th later is just another row here. is_active hides a concern
-- from every switcher/dropdown app-wide (all sourced from one context,
-- see src/context/ConcernContext.jsx) without deleting its history —
-- e.g. a studio that's currently paused. display_order fixes a manual
-- display order, overriding alphabetical.
-- ============================================================================

create table concerns (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  parent_concern_id uuid references concerns(id),
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into concerns (name, parent_concern_id, display_order) values
  ('Tru Multimedia Limited', null, 1);

insert into concerns (name, parent_concern_id, display_order, is_active)
select v.name, p.id, v.display_order, v.is_active
from (values
  ('Truphoto Studio', 2, true),
  ('4R Studio', 3, true),
  ('Tru Studios', 4, false),
  ('Uthshob Mukhor', 5, false)
) as v(name, display_order, is_active)
cross join (select id from concerns where name = 'Tru Multimedia Limited') as p;


-- ============================================================================
-- 3. CLIENTS
-- Global (not concern-scoped) — the same client can engage with more than
-- one concern; individual transactions carry the concern.
-- ============================================================================

create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now()
);


-- ============================================================================
-- 4. EMPLOYEES
-- ============================================================================

create table employees (
  id uuid primary key default gen_random_uuid(),
  concern_id uuid not null references concerns(id),
  name text not null,
  role text,
  type employee_type not null default 'fixed',
  monthly_salary numeric,
  status text not null default 'active' check (status in ('active', 'on_leave', 'inactive')),
  auth_user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index idx_employees_concern on employees(concern_id);


-- ============================================================================
-- 4b. OWNERS
-- The partners of Tru Multimedia Limited. Distinct from employees/auth
-- users: the company currently runs at a loss, so partners routinely pay
-- company dues/expenses out of pocket and need their own running balance
-- (see payments.handled_by_owner_id, section 7, and owner_balances view,
-- section 10) — how much each has personally received vs. given on the
-- company's behalf, plus a separate record of straight capital they've
-- invested (owner_investments, not tied to any transaction).
-- ============================================================================

create table owners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  company_share_percent numeric check (company_share_percent >= 0 and company_share_percent <= 100),
  created_at timestamptz not null default now()
);

insert into owners (name, role, company_share_percent) values
  ('Rezwan Kobir Zoha', 'Partner', 33),
  ('Ifthaker Hossain Radone', 'Partner', 34),
  ('Md Rasel Ahmed', 'Partner', 33);

create table owner_investments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references owners(id),
  amount numeric not null check (amount > 0),
  investment_date date not null default current_date,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index idx_owner_investments_owner on owner_investments(owner_id);


-- ============================================================================
-- 5. PROJECTS
-- ============================================================================

create table projects (
  id uuid primary key default gen_random_uuid(),
  concern_id uuid not null references concerns(id),
  client_id uuid references clients(id),
  title text not null,
  contract_value numeric not null default 0 check (contract_value >= 0),
  status project_status not null default 'active',
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

create index idx_projects_concern on projects(concern_id);
create index idx_projects_client on projects(client_id);


-- ============================================================================
-- 6. TRANSACTIONS
-- The claim: "this concern earned/owes this much." Never carries a paid
-- amount or status column — see transaction_balances view (section 9).
-- ============================================================================

create table transactions (
  id uuid primary key default gen_random_uuid(),
  concern_id uuid not null references concerns(id),
  project_id uuid references projects(id),
  client_id uuid references clients(id),
  employee_id uuid references employees(id),
  type transaction_type not null,
  category text,
  total_amount numeric not null check (total_amount > 0),
  description text,
  transaction_date date not null default current_date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint transactions_party_check check (
    (type = 'income' and employee_id is null)
    or (type = 'expense' and client_id is null)
  )
);

create index idx_transactions_concern on transactions(concern_id);
create index idx_transactions_project on transactions(project_id);
create index idx_transactions_client on transactions(client_id);
create index idx_transactions_employee on transactions(employee_id);
create index idx_transactions_date on transactions(transaction_date);


-- ============================================================================
-- 7. PAYMENTS
-- Real money movement against a transaction. handled_by is at most one of
-- an employee, a logged-in user, or an owner/partner (see owner_balances,
-- section 10, for the running "who gave/received how much" tally this
-- feeds — e.g. an owner paying a salary out of pocket).
-- ============================================================================

create table payments (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  amount numeric not null check (amount > 0),
  channel payment_channel not null,
  handled_by_employee_id uuid references employees(id),
  handled_by_user_id uuid references auth.users(id),
  handled_by_owner_id uuid references owners(id),
  payment_date date not null default current_date,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint payments_handler_check check (
    (case when handled_by_employee_id is not null then 1 else 0 end)
    + (case when handled_by_user_id is not null then 1 else 0 end)
    + (case when handled_by_owner_id is not null then 1 else 0 end) <= 1
  )
);

create index idx_payments_transaction on payments(transaction_id);


-- ============================================================================
-- 8. INVOICES
-- Presentational layer over a transaction or project — never itself a
-- source of due-amount truth (that always comes from payments).
-- ============================================================================

create table invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  client_id uuid not null references clients(id),
  transaction_id uuid references transactions(id),
  project_id uuid references projects(id),
  issued_date date not null default current_date,
  due_date date,
  notes text,
  created_at timestamptz not null default now(),
  constraint invoices_reference_check check (transaction_id is not null or project_id is not null)
);

create index idx_invoices_client on invoices(client_id);


-- ============================================================================
-- 8b. RLS — explicitly OFF for now
-- Supabase enables Row Level Security by default on some project setups;
-- since no policies exist yet, that silently blocks every read/write from
-- the anon key ("new row violates row-level security policy"). RLS is a
-- deliberate later phase (see docs/architecture.md, "Future scalability"),
-- not skipped — turned off explicitly here rather than left to whatever
-- the project default happens to be.
-- ============================================================================

alter table concerns disable row level security;
alter table clients disable row level security;
alter table employees disable row level security;
alter table owners disable row level security;
alter table owner_investments disable row level security;
alter table projects disable row level security;
alter table transactions disable row level security;
alter table payments disable row level security;
alter table invoices disable row level security;


-- ============================================================================
-- 9. AUDIT LOG — generic, trigger-populated
-- Logging happens at the database level (not app code), so it can't be
-- silently skipped by a missed call site as a new module is added.
-- ============================================================================

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid,
  action audit_action not null,
  changed_by uuid references auth.users(id),
  old_data jsonb,
  new_data jsonb,
  changed_at timestamptz not null default now()
);

create index idx_audit_log_table_record on audit_log(table_name, record_id);

alter table audit_log disable row level security;

create or replace function log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_log (table_name, record_id, action, changed_by, old_data, new_data, changed_at)
  values (
    TG_TABLE_NAME,
    coalesce(NEW.id, OLD.id),
    lower(TG_OP)::audit_action,
    auth.uid(),
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(OLD) else null end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(NEW) else null end,
    now()
  );
  return coalesce(NEW, OLD);
end;
$$;

create trigger audit_concerns after insert or update or delete on concerns for each row execute function log_audit_event();
create trigger audit_clients after insert or update or delete on clients for each row execute function log_audit_event();
create trigger audit_employees after insert or update or delete on employees for each row execute function log_audit_event();
create trigger audit_owners after insert or update or delete on owners for each row execute function log_audit_event();
create trigger audit_owner_investments after insert or update or delete on owner_investments for each row execute function log_audit_event();
create trigger audit_projects after insert or update or delete on projects for each row execute function log_audit_event();
create trigger audit_transactions after insert or update or delete on transactions for each row execute function log_audit_event();
create trigger audit_payments after insert or update or delete on payments for each row execute function log_audit_event();
create trigger audit_invoices after insert or update or delete on invoices for each row execute function log_audit_event();

-- Resolves changed_by to an email without exposing the rest of auth.users.
create or replace view audit_log_with_user as
select a.*, u.email as changed_by_email
from audit_log a
left join auth.users u on u.id = a.changed_by;

grant select on audit_log_with_user to authenticated;


-- ============================================================================
-- 10. REPORTING VIEWS
-- All "how much is due / what's the P&L" logic lives here, computed from
-- transactions + payments, so there is never a cached figure to fall out
-- of sync.
-- ============================================================================

-- Per-transaction paid/due amount and status.
create or replace view transaction_balances as
select
  t.id as transaction_id,
  t.concern_id,
  t.type,
  t.total_amount,
  coalesce(sum(p.amount), 0) as paid_amount,
  t.total_amount - coalesce(sum(p.amount), 0) as due_amount,
  case
    when coalesce(sum(p.amount), 0) <= 0 then 'pending'
    when coalesce(sum(p.amount), 0) >= t.total_amount then 'paid'
    else 'partial'
  end as payment_status
from transactions t
left join payments p on p.transaction_id = t.id
group by t.id, t.concern_id, t.type, t.total_amount;

-- Per-project rollup: received vs. contract value, expenses, due, profit.
-- Contract value is the ceiling on what a project can ever earn — the app
-- blocks income transactions on a project from summing past it. So "due"
-- is contract_value minus what's actually been received (not the sum of
-- individual transaction dues, which would understate due if the full
-- contract hasn't been invoiced as transactions yet), and profit is
-- contract_value minus expense paid — accrual against the committed deal
-- value, not cash-basis, since income/expense on a project routinely
-- settle months apart but the contract value itself doesn't change.
create or replace view project_balances as
select
  pr.id as project_id,
  pr.title,
  pr.concern_id,
  pr.contract_value,
  coalesce(sum(case when t.type = 'income' then tb.paid_amount else 0 end), 0) as total_received,
  greatest(
    pr.contract_value - coalesce(sum(case when t.type = 'income' then tb.paid_amount else 0 end), 0),
    0
  ) as total_due,
  coalesce(sum(case when t.type = 'expense' then tb.paid_amount else 0 end), 0) as total_expense_paid,
  pr.contract_value - coalesce(sum(case when t.type = 'expense' then tb.paid_amount else 0 end), 0) as profit
from projects pr
left join transactions t on t.project_id = pr.id
left join transaction_balances tb on tb.transaction_id = t.id
group by pr.id, pr.title, pr.concern_id, pr.contract_value;

-- Per-concern P&L (query without a concern filter for the consolidated view).
create or replace view concern_pl_view as
select
  c.id as concern_id,
  c.name as concern_name,
  c.parent_concern_id,
  coalesce(sum(case when t.type = 'income' then t.total_amount else 0 end), 0) as total_income,
  coalesce(sum(case when t.type = 'expense' then t.total_amount else 0 end), 0) as total_expense,
  coalesce(sum(case when t.type = 'income' then t.total_amount else -t.total_amount end), 0) as net_pl
from concerns c
left join transactions t on t.concern_id = c.id
group by c.id, c.name, c.parent_concern_id;

-- Running balance owed by each client (across their income transactions).
create or replace view client_balances as
select
  cl.id as client_id,
  cl.name,
  coalesce(sum(tb.due_amount), 0) as total_due
from clients cl
left join transactions t on t.client_id = cl.id and t.type = 'income'
left join transaction_balances tb on tb.transaction_id = t.id
group by cl.id, cl.name;

-- Per-owner running balance: how much they've personally received
-- (collected on income transactions) vs. given (paid company expenses out
-- of pocket). net_owed_to_owner > 0 means the company still owes that
-- owner a reimbursement; < 0 means the owner is holding uncollected
-- company cash. Investments are tracked separately (owner_investments)
-- and are not part of this balance — they're capital put in, not a
-- transaction-linked payment.
create or replace view owner_balances as
select
  o.id as owner_id,
  o.name,
  coalesce(sum(case when t.type = 'income' then p.amount else 0 end), 0) as total_received,
  coalesce(sum(case when t.type = 'expense' then p.amount else 0 end), 0) as total_given,
  coalesce(sum(case when t.type = 'expense' then p.amount else -p.amount end), 0) as net_owed_to_owner
from owners o
left join payments p on p.handled_by_owner_id = o.id
left join transactions t on t.id = p.transaction_id
group by o.id, o.name;
