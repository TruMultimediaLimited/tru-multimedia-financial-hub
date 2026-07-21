# Tru ERP — Architecture (Phase 1)

Status: draft for owner review. No application code exists yet — this document
defines the shape of the system before any SQL or UI is written.

## 1. Goals

- One place to see, for Tru Multimedia Limited and each of its 4 concerns
  (4R Studio, Truphoto Studio, Uthshob Mukhor, Tru Studios): what came in,
  what went out, what's still owed, and net profit/loss — consolidated and
  per-concern.
- Every rupee traced to a real transaction, a real payment, a real person who
  handled it, and (where relevant) a real project/client/vendor.
- Built and operated entirely from a phone: no step in setup, deploy, or
  day-to-day use should require a local terminal.

## 2. Core domain model

### 2.1 Concern

The organizational unit everything else hangs off of. Tru Multimedia Limited
is the parent; 4R Studio, Truphoto Studio, Uthshob Mukhor, and Tru Studios
are its 4 concerns. Every transaction, project, employee, client
relationship, and vendor relationship belongs to exactly one concern, so
per-concern and consolidated (all-concern) views are just different
aggregations of the same rows — no separate "consolidated" table.

### 2.2 Transaction ≠ Payment (the central rule)

A **transaction** is a claim: "4R Studio earned ৳50,000 from Client X for
Project Y" or "Truphoto Studio owes ৳20,000 to Vendor Z for equipment." It
has a `total_amount` and belongs to one concern. It does **not** carry a
`paid_amount` or `status` column — those are *derived*, not stored, computed
from its payments. Earlier iterations of this system stored a redundant
"payment status" field that drifted out of sync with reality; this design
avoids that class of bug entirely by having exactly one source of truth.

A **payment** is a movement of real money against a transaction: an amount,
a channel (bKash / Nagad / Bank / Cash), the person who physically handled
it, and a date. A transaction can have zero, one, or many payments over
time (e.g., an advance, then a final settlement). At any point:

```
due = transaction.total_amount − sum(payments.amount for that transaction)
```

`due = 0` means fully settled, `0 < due < total_amount` means partially
paid, `due = total_amount` means untouched. This is computed at query time
(a SQL view, defined in Phase 2) rather than cached in a column.

### 2.3 People and roles

- **Employees** — belong to one concern, and are one of three types:
  **fixed** (flat monthly salary), **remote** (works off-site, still fixed
  or hourly), **project-based** (paid per project/task, no fixed salary).
  The type determines how they flow into the Ledger (a fixed employee
  generates a predictable recurring expense; a project-based employee's pay
  is tied to specific project transactions).
- **Handlers** — whoever physically handled a payment (received cash,
  sent a bKash transfer, etc.). Could be an employee or an owner/partner.
  Recorded per-payment, independent of who the transaction's client/vendor
  is, because the person moving the money and the counterparty are
  different concepts.
- **Clients** — who Tru Multimedia (or a concern) earns income from.
- **Vendors** — who Tru Multimedia (or a concern) pays expenses to.

### 2.4 Projects

A project groups related transactions under one client engagement within
one concern (e.g., "Wedding Shoot — Rahman Family" under 4R Studio). A
project has its own contract value and its own due tracking, computed the
same way as a standalone transaction but rolled up across all transactions
linked to that project.

## 3. Modules

| Module | Purpose | Key entities |
|---|---|---|
| **Ledger** | The system of record: every income/expense transaction and every payment against it. Everything else is a view onto, or a source of, Ledger rows. | Transaction, Payment |
| **Clients** | Who pays us. Contact info, history of transactions/projects, running balance (how much they owe across all their transactions). | Client |
| **Vendors** | Who we pay. Contact info, history of expense transactions, running balance (how much we owe them). | Vendor |
| **Invoices** | The document sent to a client for a transaction or project — presentational/PDF layer over Ledger data, not a separate ledger of its own. Generating or sending an invoice does not itself move money; a payment recorded against the underlying transaction is what changes the due amount. | Invoice (references a Transaction or Project) |
| **Employees** | Staff roster, salary/payment terms, and (for project-based staff) work logged against specific projects, which feeds into payroll expense transactions. | Employee, WorkLog |
| **Projects** | Client engagements that group transactions and, for project-based staff, work logs. Own status (active/completed/stalled) and contract-value-vs-received tracking. | Project |
| **Reports** | Read-only aggregation views: consolidated & per-concern P&L, accumulated profit/loss over time, due/aging summaries, client/vendor balances. No new data of its own. | (views only) |
| **Audit Log** | Who created/edited/deleted what, when. Populated by database triggers (not application code), same pattern proven earlier in this project, so logging can't be silently skipped by a missed call site. | AuditLog |

## 4. How modules connect

```
                    ┌─────────────┐
                    │   Concern   │  (Tru Multimedia + 4 concerns)
                    └──────┬──────┘
                           │ every entity below belongs to one concern
        ┌──────────────────┼──────────────────┬─────────────┐
        ▼                  ▼                  ▼             ▼
   ┌─────────┐        ┌─────────┐        ┌─────────┐   ┌──────────┐
   │ Project │◄───────│Transaction│──────►│ Client  │   │  Vendor  │
   └────┬────┘  (opt) └─────┬────┘ (opt, one of)      └──────────┘
        │                   │
        │              ┌────▼────┐
        │              │ Payment │──► handled_by: Employee (or owner)
        │              └─────────┘        channel: bKash/Nagad/Bank/Cash
        │
   ┌────▼─────┐
   │ WorkLog  │──► Employee (project-based)
   └────┬─────┘
        │ feeds payroll expense
        ▼
   Transaction (type = expense, category = payroll)
```

- **Invoices** sit beside Transactions as a presentation layer — an invoice
  references a transaction or project and formats it for sending, but the
  due amount always comes from the transaction/payment data, never from the
  invoice.
- **Reports** read from Transaction + Payment (+ Concern for grouping) and
  from Client/Vendor for balance summaries. It has no write path.
- **Audit Log** listens to every other module's tables via triggers; no
  module writes to it directly.

## 5. Core user flows

**A. Record income with a partial payment**
1. Owner creates a Transaction: concern = 4R Studio, type = income,
   client = Rahman Family, total_amount = 50,000, optional project link.
2. Client pays ৳20,000 via bKash, handled by Ifthaker. Owner records a
   Payment: amount 20,000, channel bKash, handled_by Ifthaker, date today.
3. Dashboard/Client view immediately shows due = 30,000 for that
   transaction (computed, not a separate save step).
4. Weeks later, client pays the remaining ৳30,000 in cash, handled by a
   staff member. A second Payment row is added; due becomes 0.

**B. Project with milestones**
1. Owner creates a Project under a concern with a client and contract
   value.
2. Each milestone is a Transaction linked to that project (e.g., "Advance"
   ৳50,000, "Final delivery" ৳100,000).
3. Payments are recorded against each transaction as money actually moves.
4. Project-level due = sum of each linked transaction's due; project P&L
   nets received income against any expense transactions also linked to
   that project (e.g., equipment rental, project-based staff pay).

**C. Expense to a vendor, paid over multiple channels**
1. Owner creates a Transaction: type = expense, vendor = X, total_amount =
   15,000.
2. Pays ৳10,000 by bank transfer now (Payment #1), commits to paying the
   rest later. Due shows 5,000 until a second payment closes it.

**D. Payroll for a fixed employee**
1. Employee record has type = fixed, monthly salary.
2. At month end, a payroll run (mechanism detailed in Phase 2) generates
   one expense Transaction per employee (or one per concern, itemized) for
   that month's salary, which then gets a Payment when actually disbursed.

**E. Payroll for a project-based employee**
1. Employee logs work against a Project (WorkLog: task, amount, date).
2. At payout time, unpaid WorkLog entries become — or get bundled into —
   an expense Transaction, then a Payment when actually paid, mirroring
   flow A/C rather than being a separate money-tracking mechanism.

**F. Generating a report**
1. Owner opens Reports, picks a date range and optionally a concern.
2. View aggregates Transaction totals (grouped by concern/category/month)
   and Payment sums for due/collected figures — no separate report data to
   keep in sync.

## 6. Database relationships (high level — full DDL in Phase 2)

| Entity | Belongs to | References |
|---|---|---|
| Concern | — (self-referencing: parent Tru Multimedia has 4 child concerns) | — |
| Client | global (not concern-scoped — a client can engage multiple concerns) | — |
| Vendor | global, same reasoning as Client | — |
| Project | Concern | Client |
| Transaction | Concern | Client *or* Vendor (depending on type), optional Project |
| Payment | Transaction | handled_by → Employee (nullable — could be an owner/partner not modeled as an employee) |
| Employee | Concern | — |
| WorkLog | Employee, Project | feeds into a payroll Transaction |
| Invoice | Transaction or Project | Client |
| AuditLog | — (references any table generically: table_name + record_id) | changed_by → auth user |

Open question for Phase 2: whether "owner/partner" (Ifthaker and any future
partners) is its own lightweight entity distinct from Employee, since
partners can also handle payments and log in, but aren't salaried staff.
Likely a small `people` or `partners` table referenced by both `handled_by`
and the Supabase Auth user.

## 7. Future scalability

- **Auth & RLS**: Phase 1–7 build without enforced database-level access
  control; Supabase Auth (email/password, mobile-only setup) and Row Level
  Security get layered in once the core modules are stable, so early
  development isn't blocked debugging policies against a moving schema.
- **Audit completeness**: trigger-based logging from day one (not bolted on
  later) means every module gets covered automatically as it's built,
  rather than requiring a retrofit.
- **Reporting scale**: aggregation is done via SQL views over
  Transaction/Payment rather than pre-computed/cached tables, so reports
  stay correct without a sync job — acceptable at this business's
  transaction volume; can revisit with materialized views if it ever grows
  enough to matter.
- **Multi-concern growth**: adding a 5th concern is a single new Concern
  row, not a schema change, since nothing is hardcoded to "4 concerns."
- **Invoicing**: starts as a formatting layer over existing data (Phase 7);
  could later gain PDF generation/email delivery without changing the
  underlying Transaction/Payment model.
- **Investor-readiness**: because Transaction/Payment/Concern are cleanly
  separated from day one, producing investor-grade historical P&L or
  valuation-support reports later is a Reports-module addition, not a data
  model rework.

## 8. What's deliberately deferred to later phases

- Exact table/column definitions, data types, and constraints → Phase 2
  (`sql/schema.sql`).
- Screen-by-screen UI layout and navigation → Phase 3 (`docs/ui-spec.md`).
- Payroll-run mechanics (how a month's worth of WorkLog entries get bundled
  into transactions) — flow is described above (§5.D–E), exact schema
  deferred to Phase 2.
- Owner/partner vs. Employee modeling decision (§6 open question) —
  needs owner input before Phase 2 locks the schema.
