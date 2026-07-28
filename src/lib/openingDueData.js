import { supabase } from './supabase.js';

// Pre-cutover balances — deliberately isolated from clients/employees/
// transactions/payments. party_name is plain text, not a foreign key, and
// nothing here is ever read by Dashboard/Reports queries. Only two things
// exist: how much is owed to us (receivable) vs. how much we owe
// (payable), each shrinking as a payment is logged against it.

async function fetchBalancesMap() {
  const { data, error } = await supabase
    .from('opening_due_balances')
    .select('opening_due_id, party_name, type, opening_amount, paid_amount, remaining_amount');
  if (error) throw error;
  const map = new Map();
  for (const row of data ?? []) map.set(row.opening_due_id, row);
  return map;
}

// One list, grouped into receivables/payables — mirrors the shape of the
// live Due list (Dashboard) without sharing any code/data with it.
export async function fetchOpeningDues() {
  const balances = await fetchBalancesMap();
  const rows = Array.from(balances.values()).map((b) => ({
    id: b.opening_due_id,
    partyName: b.party_name,
    type: b.type,
    openingAmount: Number(b.opening_amount),
    paidAmount: Number(b.paid_amount),
    remainingAmount: Number(b.remaining_amount),
  }));
  return {
    receivables: rows.filter((r) => r.type === 'receivable').sort((a, b) => b.remainingAmount - a.remainingAmount),
    payables: rows.filter((r) => r.type === 'payable').sort((a, b) => b.remainingAmount - a.remainingAmount),
  };
}

export async function createOpeningDue(payload) {
  const { data, error } = await supabase.from('opening_dues').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function deleteOpeningDue(id) {
  const { error } = await supabase.from('opening_dues').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchOpeningDuePayments(openingDueId) {
  const { data, error } = await supabase
    .from('opening_due_payments')
    .select('id, amount, payment_date, note')
    .eq('opening_due_id', openingDueId)
    .order('payment_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addOpeningDuePayment(payload) {
  const { data, error } = await supabase.from('opening_due_payments').insert(payload).select().single();
  if (error) throw error;
  return data;
}
