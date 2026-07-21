# Tru ERP — UI/UX Specification (Phase 3)

Status: draft for owner review. No application code exists yet — this
document defines screens, layout, and behavior before any component is
built. Builds on `docs/architecture.md` (domain model) and `sql/schema.sql`
(data shape).

## 1. Design principles

- **Dark mode is the default and primary theme.** A light theme is not
  required for v1; if added later it's a toggle, not a rebuild.
- **Mobile is the primary device.** The owner operates entirely from a
  phone — every screen is designed mobile-first, then checked that it
  still works comfortably on a wider screen, not the other way around.
- **Lightweight.** No heavy component/UI kit (per CLAUDE.md). Plain
  Tailwind utility classes, a handful of small shared components (button,
  input, select, card, badge, modal/sheet).
- **Numbers before chrome.** Every screen leads with the figures that
  matter (totals, due amounts) rather than decorative elements. Bengali
  labels are used where they read more naturally to the owner (e.g. "বাকি"
  for due, "প্রাপ্ত" for received); code and comments stay in English per
  CLAUDE.md.
- **No hidden primary navigation.** An earlier version of this project
  used a hamburger menu that hid all sections behind one icon, which the
  owner found confusing on mobile. This spec avoids that pattern —
  primary navigation is always at least partially visible (see §2).

## 2. Global layout & navigation

### 2.1 Structure

Two responsive layouts sharing the same route/component tree:

**Desktop / tablet (≥768px): left sidebar**
- Fixed left sidebar, always visible (not collapsible behind an icon).
- Top of sidebar: "Tru Multimedia Limited" wordmark + a concern switcher
  (see §2.2) directly beneath it.
- Below that, one row per module, in this order: Dashboard, Ledger,
  Projects, Clients, Vendors, Employees, Invoices, Reports, Audit Log.
- Active route highlighted; icon + label per row (icons are simple inline
  SVG, not an icon-font library).
- Bottom of sidebar: signed-in user's name/email + sign out.

**Mobile (<768px): bottom tab bar + accordion home**
- A slim top bar: concern switcher (left) + page title (center).
- A bottom tab bar with the 5 most-used destinations: **Dashboard,
  Ledger, Projects, Reports, More**. This keeps primary navigation always
  on-screen, never hidden behind a menu tap.
- **More** opens a full-height sheet listing the remaining modules
  (Clients, Vendors, Employees, Invoices, Audit Log, Sign out) as a
  simple vertical list — one tap to navigate, not a nested menu.
- The Dashboard screen itself uses single-open accordion sections for its
  sub-blocks (see §3), consistent with the pattern the owner asked for
  previously: tapping a section header expands it and collapses whichever
  section was open.

### 2.2 Concern switcher

Present in both layouts, always visible near the top:
- A dropdown/select showing **"সকল (Consolidated)"** by default, plus each
  of the 4 concerns by name.
- Selecting a concern filters every currently-open screen (Dashboard,
  Ledger, Reports, etc.) to that concern's rows; selecting "সকল" removes
  the filter. This is a single global piece of state, not set per-page.
- The selected concern persists across navigation within a session
  (kept in memory via React context — no need to re-pick it on every
  screen).

### 2.3 Route list

| Route | Module |
|---|---|
| `/dashboard` | Dashboard |
| `/ledger` | Ledger (transactions list + entry) |
| `/ledger/:id` | Transaction detail (payments against it) |
| `/projects` | Projects list |
| `/projects/:id` | Project detail |
| `/clients` | Clients list |
| `/clients/:id` | Client detail |
| `/vendors` | Vendors list |
| `/vendors/:id` | Vendor detail |
| `/employees` | Employees list |
| `/employees/:id` | Employee detail |
| `/invoices` | Invoices list (Phase 7, spec deferred — see §10) |
| `/reports` | Reports |
| `/audit-log` | Audit Log (Phase 7, spec deferred — see §10) |

## 3. Dashboard

Landing page after login. Composed of stacked sections (accordion on
mobile, all-expanded in a grid on desktop).

### 3.1 Summary cards (top of page, always visible — not inside an
accordion section, since these are the single most-checked numbers)

Four cards in a row (desktop) / 2×2 grid (mobile), scoped to the current
concern selection (§2.2):
1. **Income** — sum of `type = 'income'` transaction totals in the
   selected date range.
2. **Expense** — sum of `type = 'expense'` transaction totals, same range.
3. **Profit/Loss** — Income − Expense, colored green when ≥0, red when
   negative.
4. **Total Due** — sum of `due_amount` across all transactions with
   `payment_status != 'paid'` (from `transaction_balances`), split as a
   small sub-label into "receivable" (due on income) vs "payable" (due on
   expense) so it's clear which direction the money owes.

A date-range control sits directly above these cards (presets: This
Month, Last Month, This Year, All Time, custom range) — changing it
recomputes all four cards without navigating away.

### 3.2 Due list (accordion section, expanded by default)

A short list (5–10 rows) of the transactions with the largest outstanding
`due_amount`, most-overdue first (oldest `transaction_date` with due > 0
first). Each row: counterparty name (client or vendor), concern badge,
due amount, days since transaction date. Tapping a row goes to
`/ledger/:id`. A "See all" link goes to `/ledger` pre-filtered to
`payment_status != 'paid'`.

### 3.3 Recent activity (accordion section, collapsed by default)

Last 10 transactions across all types, newest first — quick glance at
what was just entered, each row tappable to its detail page.

### 3.4 Per-concern breakdown (accordion section, collapsed by default,
only shown when the concern switcher is set to "সকল")

A small table: one row per concern, columns Income / Expense / Profit /
Due, for the selected date range — the "consolidated vs per-concern in
one glance" view called for in the architecture doc.

## 4. Ledger

### 4.1 Transactions table (`/ledger`)

**Columns** (desktop table / stacked card per row on mobile):
Date · Concern · Type (income/expense badge) · Category · Counterparty
(client or vendor name) · Project (if linked) · Total Amount · Due Amount
(badge, hidden/dashed when 0) · Handled by (from most recent payment, or
blank if unpaid).

**Filters** (a filter bar above the table; on mobile this collapses into
a "Filters" button that opens a sheet, to keep the table itself
uncluttered):
- **Concern** — defaults to the global concern switcher selection but can
  be overridden per-screen (e.g. checking one concern's ledger while the
  dashboard stays consolidated); reset link to re-sync with the global
  switcher.
- **Type** — Income / Expense / Both.
- **Project** — dropdown of projects (searchable), to see only
  transactions linked to a specific engagement.
- **Employee type** — filters transactions whose `handled_by_employee_id`
  points to an employee of the selected type (fixed / remote /
  project_based). Primary use case: isolating payroll-related expense
  transactions by how that staff member is employed (e.g. "show me
  everything paid to project-based staff this month").
- **Payment status** — Pending / Partial / Paid / All.
- **Date range** — same presets as the dashboard.
- Filters combine (AND), and the current filter state is reflected in the
  URL query string so a filtered view can be reloaded/shared.

A prominent **"+ Add Income" / "+ Add Expense"** pair of buttons sits
above the table (two distinct buttons, not one generic "Add
transaction" + a type toggle buried inside — matches how the owner
thinks about entering data).

### 4.2 Ledger entry form (opens as a full-screen sheet on mobile, a
modal on desktop — not a separate route, so the table stays underneath)

Fields, in order:
1. **Concern** (select, required) — pre-filled from the global switcher
   if one concern is selected, otherwise must be chosen.
2. **Type** — Income / Expense (segmented control, required; determines
   which of the next two fields shows).
3. **Client** (if Income) or **Vendor** (if Expense) — searchable
   select with an inline "+ New client/vendor" option that opens a tiny
   sub-form (name, phone) without leaving the sheet.
4. **Project** (optional select, searchable) — only lists projects
   belonging to the chosen concern.
5. **Category** — free-text with autocomplete suggestions drawn from
   this concern's previously-used categories (schema deliberately leaves
   this as text, not an enum, for flexibility).
6. **Total amount** (required, numeric, > 0).
7. **Description** (optional, short text).
8. **Date** (defaults to today).

Submitting creates the transaction only — no payment is required at
creation time (matches "transaction ≠ payment": a transaction can be
recorded before any money has moved). A confirmation toast offers a
direct "Add a payment now" shortcut into §4.3.

### 4.3 Transaction detail (`/ledger/:id`)

- Header: counterparty, concern, category, total amount, current
  `payment_status` badge and `due_amount` (from `transaction_balances`).
- Edit/delete actions for the transaction itself (delete asks for
  confirmation and explains that its payments will be removed too, since
  `payments.transaction_id` cascades).
- **Payments list** — every payment against this transaction, newest
  first: amount, channel badge (bKash/Nagad/Bank/Cash/Other), handled by
  (employee name or the signed-in user), date, note. Each editable/
  deletable inline.
- **"+ Add payment" form** (inline, always visible below the list, not
  behind another click): amount, channel (select), handled by (select:
  list of employees for this concern + "Myself" for the signed-in owner/
  partner), date (defaults today), note (optional). Amount field shows a
  live "remaining after this payment" hint as it's typed, capped visually
  (not hard-blocked, in case of intentional overpayment/refund handling
  later) at the current due amount.

## 5. Projects

Referenced here only insofar as the Ledger links into it; full Projects
page spec is in-scope for this phase since the nav requires it, kept
brief since Phase 5 focuses on Ledger:

- **List** (`/projects`): card per project — title, client, concern,
  status badge (active/completed/stalled), contract value, received so
  far, due, progress bar (received/contract value).
- **Detail** (`/projects/:id`): header with the same summary figures,
  then two tabs — **Transactions** (all linked transactions, reusing the
  Ledger table component filtered to this project) and **Work Log** (for
  project-based staff: task, employee, amount, date, paid/unpaid badge).
  A "+ Add milestone" button opens the Ledger entry form (§4.2)
  pre-filled with this project and concern.

## 6. Clients & Vendors

Structurally identical pages (Client = who pays us, Vendor = who we pay),
so specified together.

### 6.1 List (`/clients`, `/vendors`)

Search box (by name/phone) + a simple list/card per row: name, phone,
running balance (`client_balances.total_due` or `vendor_balances.total_due`
from the schema's reporting views) shown as a badge — red if > 0. A
"+ New client/vendor" button opens a short form (name, phone, email,
address, notes).

### 6.2 Detail (`/clients/:id`, `/vendors/:id`)

- Header: contact info (edit inline), total due balance.
- **Transaction history** — reuses the Ledger table component, filtered
  to `client_id`/`vendor_id`, with the same filter bar minus the
  counterparty column (redundant here).
- **Projects** (clients only) — list of projects this client is engaged
  in, each tappable to `/projects/:id`.

## 7. Employees

### 7.1 List (`/employees`)

Grouped or filterable by concern; each row: name, role, type badge
(fixed / remote / project_based), status (active/on_leave/inactive), and
— for fixed/remote — monthly salary, or — for project_based — total
unpaid work-log amount as a quick "owed to this person" figure. A
"+ New employee" button opens a form (concern, name, role, type,
monthly salary [shown only when type ≠ project_based], status).

### 7.2 Detail (`/employees/:id`)

- Header: name, role, concern, type, status, salary/rate (editable).
- **For fixed/remote employees**: a simple "Payroll history" list — every
  expense transaction where this employee is the counterparty context
  (via payroll category + this employee), with its payment status.
- **For project-based employees**: a **Work Log** tab — list of
  `work_logs` rows (task, project, amount, date, paid badge) plus a
  "+ Log work" form (project select, task description, amount, date).
  Unpaid entries can be multi-selected and bundled into a single payroll
  expense transaction via a "Create payment for selected" action, which
  opens the Ledger entry form (§4.2) pre-filled (type = expense,
  category = "Payroll", total = sum of selected work logs) and, on save,
  stamps `transaction_id` back onto each selected work_log row and marks
  them paid.

## 8. Reports

`/reports` — a single page, no sub-navigation, organized as stacked
sections (same accordion-on-mobile pattern as the Dashboard):

1. **P&L summary** — same four figures as the Dashboard cards, but with
   a wider date-range picker and a per-concern comparison table always
   visible here (not collapsed), reusing `concern_pl_view`.
2. **Trend** — a simple bar or line chart, income vs. expense per month,
   for the selected range (chart library choice deferred to Phase 4
   scaffolding — must stay lightweight, e.g. a small SVG-based lib, not a
   heavy charting suite).
3. **Aging / Due summary** — outstanding due amounts bucketed by age
   (0–15 / 16–30 / 31–60 / 60+ days), split receivable vs payable.
4. **Client balances** / **Vendor balances** — two sortable tables (by
   name or by balance) reusing `client_balances`/`vendor_balances`, each
   row tappable to that client/vendor's detail page.

No export/PDF in this phase (that's the Invoices module's concern later,
per architecture doc §"Invoicing").

## 9. Dark mode

- Single dark theme, tuned for financial data readability: near-black
  background (not pure #000), high-contrast white/near-white text for
  figures, muted gray for secondary labels, and a small fixed palette for
  status color-coding used consistently everywhere:
  - Green — income, profit, "paid" status.
  - Red — expense, loss, overdue due amounts.
  - Amber/yellow — "partial" payment status, due-but-not-overdue.
  - Neutral gray — "pending"/untouched, disabled states.
- No theme toggle in v1 (CLAUDE.md specifies dark mode as part of the
  fixed UI approach); a light theme can be added later behind a toggle
  without restructuring components, since color values are intended to
  live as a small set of Tailwind theme tokens rather than being
  hardcoded per component.

## 10. Mobile-responsive behavior

- **Breakpoint**: single breakpoint at 768px (Tailwind's `md:`) switches
  between the mobile layout (§2.1) and desktop layout — no separate
  tablet-specific layout, since the desktop sidebar layout already works
  down to tablet width.
- **Tables become cards below 768px**: every data table in this spec
  (Ledger, Projects, Clients, Vendors, Employees, Reports' balance
  tables) renders as a table with sticky header on desktop, and as a
  vertically-stacked list of cards on mobile — same data, no
  horizontally-scrolling table on a phone.
- **Touch targets**: minimum 44×44px for buttons/rows in all mobile
  layouts.
- **Forms open as bottom sheets on mobile** (slide up, dismiss by
  swipe-down or an explicit close button — never a tiny "×" only in a
  corner) and as centered modals on desktop.
- **Single-open accordion** pattern (Dashboard §3, Reports §8) is mobile
  behavior only; the same sections render simultaneously expanded in a
  grid on desktop, since there's enough width to show them all at once.
- **No horizontal scrolling anywhere** — if content doesn't fit, it wraps
  or restacks, it never causes the page body to scroll sideways.

## 11. What's deliberately deferred

- **Invoices module** (`/invoices`) — nav slot reserved (§2.3) but full
  page spec deferred to Phase 7, since it's a presentation layer over
  data that doesn't exist to view until Ledger/Projects are built.
- **Audit Log module** (`/audit-log`) — nav slot reserved but full page
  spec (filter by table/record/user, diff view of old_data vs new_data)
  deferred to Phase 7, same reasoning.
- **Authentication screens** (login, session handling) — not covered
  here; needed structurally before Phase 4 scaffolding can be used at
  all, so will be specified as part of that phase rather than here.
- **Chart library choice** for Reports §8.2 — deferred to Phase 4, needs
  to be picked against the "keep bundle small" constraint.
