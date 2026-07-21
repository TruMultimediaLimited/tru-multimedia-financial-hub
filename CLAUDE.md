# Tru ERP — Tru Multimedia Limited

## Project
Centralized accounting & client management for Tru Multimedia Limited
(parent) with 4 concerns: 4R Studio, Truphoto Studio, Uthshob Mukhor,
Tru Studios.

## Owner Context
- Owner (Ifthaker) works MOBILE-ONLY: Claude Code (mobile) + Vercel + Supabase
- NO local dev environment. Never require local CLI steps from the owner.
- All SQL must be copy-paste runnable in Supabase SQL Editor.
- All code must be complete files, never partial snippets.

## Tech Stack (FIXED — do not change)
- React + Vite (NOT Next.js)
- Tailwind CSS
- Supabase (Postgres + supabase-js client, plain SQL — NO ORM/Drizzle)
- Deploy: Vercel (auto-deploy on push to main)
- State: React hooks/context only (no Redux/Zustand)
- UI: lightweight, dark mode, mobile-responsive

## Core Domain Rules
- Transaction ≠ Payment. A transaction (income/expense) has total_amount;
  payments are separate rows linked to it. Due = total − sum(payments).
- Payments: multiple channels (bKash, Nagad, Bank, Cash), handled by
  multiple persons — both must be recorded per payment.
- Every transaction belongs to one concern; dashboard shows both
  consolidated and per-concern views.
- Employees: fixed / remote / project-based.
- Modules planned: Ledger, Clients, Vendors, Invoices, Employees,
  Projects, Reports, Audit Log.

## Build Phases (one at a time, wait for approval)
1. Architecture doc (docs/architecture.md) — no code
2. Supabase SQL schema (sql/schema.sql)
3. UI spec (docs/ui-spec.md) — no code
4. Project scaffold (Vite + Tailwind + Supabase client)
5. Module: Ledger (transactions + payments)
6. Module: Dashboard (income/expense/profit cards, due list)
7. Modules: Clients/Vendors → Employees → Reports → Audit log

## Conventions
- Env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
- Bengali labels OK in UI where natural; code/comments in English
- Keep bundle small; no heavy component libraries
