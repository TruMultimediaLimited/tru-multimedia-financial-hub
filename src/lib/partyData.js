import { supabase } from './supabase.js';
import { createClient, createVendor } from './ledgerData.js';

export { createClient, createVendor };

const PARTY_COLUMNS = 'id, name, phone, email, address, notes, created_at';

async function fetchPartyTotals(type, relationField) {
  const { data, error } = await supabase
    .from('transactions')
    .select(`${relationField}, total_amount, payments(amount)`)
    .eq('type', type);
  if (error) throw error;

  const totals = new Map();
  for (const t of data ?? []) {
    const id = t[relationField];
    if (!id) continue;
    const paid = (t.payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
    const existing = totals.get(id) ?? { billed: 0, paid: 0, count: 0 };
    existing.billed += Number(t.total_amount);
    existing.paid += paid;
    existing.count += 1;
    totals.set(id, existing);
  }
  return totals;
}

export async function fetchClientsWithTotals() {
  const [{ data: clients, error }, totals] = await Promise.all([
    supabase.from('clients').select(PARTY_COLUMNS).order('name'),
    fetchPartyTotals('income', 'client_id'),
  ]);
  if (error) throw error;

  return (clients ?? []).map((c) => {
    const t = totals.get(c.id) ?? { billed: 0, paid: 0, count: 0 };
    return { ...c, totalBilled: t.billed, totalPaid: t.paid, totalDue: t.billed - t.paid, transactionCount: t.count };
  });
}

export async function fetchVendorsWithTotals() {
  const [{ data: vendors, error }, totals] = await Promise.all([
    supabase.from('vendors').select(PARTY_COLUMNS).order('name'),
    fetchPartyTotals('expense', 'vendor_id'),
  ]);
  if (error) throw error;

  return (vendors ?? []).map((v) => {
    const t = totals.get(v.id) ?? { billed: 0, paid: 0, count: 0 };
    return { ...v, totalPaid: t.paid, totalDue: t.billed - t.paid, transactionCount: t.count };
  });
}

export async function fetchClient(id) {
  const { data, error } = await supabase.from('clients').select(PARTY_COLUMNS).eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function fetchVendor(id) {
  const { data, error } = await supabase.from('vendors').select(PARTY_COLUMNS).eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function updateClient(id, payload) {
  const { data, error } = await supabase.from('clients').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function updateVendor(id, payload) {
  const { data, error } = await supabase.from('vendors').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

function friendlyDeleteError(error) {
  if (error.message?.includes('foreign key') || error.code === '23503') {
    return new Error('Cannot delete: this record still has linked transactions. Remove those first.');
  }
  return error;
}

export async function deleteClient(id) {
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw friendlyDeleteError(error);
}

export async function deleteVendor(id) {
  const { error } = await supabase.from('vendors').delete().eq('id', id);
  if (error) throw friendlyDeleteError(error);
}
