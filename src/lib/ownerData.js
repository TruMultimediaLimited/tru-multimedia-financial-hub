import { supabase } from './supabase.js';

const OWNER_SELECT = 'id, name, role, company_share_percent';

function friendlyDeleteError(error) {
  if (error.message?.includes('foreign key') || error.code === '23503') {
    return new Error('Cannot delete: this owner has linked payments or investments. Remove those first.');
  }
  return error;
}

async function fetchBalancesMap() {
  const { data, error } = await supabase
    .from('owner_balances')
    .select('owner_id, total_received, total_given, net_owed_to_owner');
  if (error) throw error;
  const map = new Map();
  for (const row of data ?? []) map.set(row.owner_id, row);
  return map;
}

async function fetchInvestmentTotals() {
  const { data, error } = await supabase.from('owner_investments').select('owner_id, amount');
  if (error) throw error;
  const map = new Map();
  for (const row of data ?? []) {
    map.set(row.owner_id, (map.get(row.owner_id) ?? 0) + Number(row.amount));
  }
  return map;
}

function mergeOwner(owner, balances, investments) {
  const b = balances.get(owner.id) ?? { total_received: 0, total_given: 0, net_owed_to_owner: 0 };
  return {
    ...owner,
    totalReceived: Number(b.total_received),
    totalGiven: Number(b.total_given),
    netOwedToOwner: Number(b.net_owed_to_owner),
    totalInvested: Number(investments.get(owner.id) ?? 0),
  };
}

export async function fetchOwners() {
  const { data, error } = await supabase.from('owners').select('id, name').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function fetchOwnersWithTotals() {
  const [{ data, error }, balances, investments] = await Promise.all([
    supabase.from('owners').select(OWNER_SELECT).order('name'),
    fetchBalancesMap(),
    fetchInvestmentTotals(),
  ]);
  if (error) throw error;
  return (data ?? []).map((o) => mergeOwner(o, balances, investments));
}

export async function fetchOwner(id) {
  const [{ data, error }, balances, investments] = await Promise.all([
    supabase.from('owners').select(OWNER_SELECT).eq('id', id).single(),
    fetchBalancesMap(),
    fetchInvestmentTotals(),
  ]);
  if (error) throw error;
  return mergeOwner(data, balances, investments);
}

export async function createOwner(payload) {
  const { data, error } = await supabase.from('owners').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateOwner(id, payload) {
  const { data, error } = await supabase.from('owners').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteOwner(id) {
  const { error } = await supabase.from('owners').delete().eq('id', id);
  if (error) throw friendlyDeleteError(error);
}

// Payments this owner personally handled — the "who received / who gave"
// history, sourced straight from the Ledger (payments.handled_by_owner_id)
// rather than a parallel record.
export async function fetchOwnerPayments(ownerId) {
  const { data, error } = await supabase
    .from('payments')
    .select(
      'id, amount, channel, payment_date, note, transaction_id, transactions(id, type, category, concern_id, concerns(id, name))'
    )
    .eq('handled_by_owner_id', ownerId)
    .order('payment_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchOwnerInvestments(ownerId) {
  const { data, error } = await supabase
    .from('owner_investments')
    .select('id, amount, investment_date, note')
    .eq('owner_id', ownerId)
    .order('investment_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addOwnerInvestment(payload) {
  const { data, error } = await supabase.from('owner_investments').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function deleteOwnerInvestment(id) {
  const { error } = await supabase.from('owner_investments').delete().eq('id', id);
  if (error) throw error;
}
