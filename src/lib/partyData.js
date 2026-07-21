import { supabase } from './supabase.js';
import { createClient } from './ledgerData.js';

export { createClient };

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

// Concern(s) a client is tagged as working with — separate from clients
// staying global; a client usually serves one concern but occasionally more.
export async function fetchClientConcerns(clientId) {
  const { data, error } = await supabase.from('client_concerns').select('concern_id, concerns(id, name)').eq('client_id', clientId);
  if (error) throw error;
  return (data ?? []).map((r) => r.concerns).filter(Boolean);
}

export async function fetchClient(id) {
  const [{ data, error }, concerns] = await Promise.all([
    supabase.from('clients').select(PARTY_COLUMNS).eq('id', id).single(),
    fetchClientConcerns(id),
  ]);
  if (error) throw error;
  return { ...data, concerns };
}

// concernIds is left as-is (undefined) when the caller doesn't touch concern
// tagging at all; pass an array (possibly empty) to replace the tag set.
export async function updateClient(id, payload, concernIds = undefined) {
  const { data, error } = await supabase.from('clients').update(payload).eq('id', id).select().single();
  if (error) throw error;
  if (concernIds !== undefined) {
    const { error: delError } = await supabase.from('client_concerns').delete().eq('client_id', id);
    if (delError) throw delError;
    if (concernIds.length > 0) {
      const { error: insError } = await supabase
        .from('client_concerns')
        .insert(concernIds.map((concern_id) => ({ client_id: id, concern_id })));
      if (insError) throw insError;
    }
  }
  return data;
}

// Several tables can block deleting a client (transactions, projects,
// invoices all carry a client_id foreign key) — name the actual blocker
// instead of always blaming "transactions", which is misleading when
// the real link is an invoice or project the UI doesn't show here.
function friendlyDeleteError(error) {
  if (!error.message?.includes('foreign key') && error.code !== '23503') return error;
  const table = error.details?.match(/referenced from table "(\w+)"/)?.[1];
  const reasons = {
    invoices: 'this client still has a linked invoice. Remove or reassign that invoice first.',
    projects: 'this client still has a linked project. Remove or reassign that project first.',
    transactions: 'this client still has linked transactions. Remove those first.',
  };
  const fallback = table
    ? `this client still has a linked record in "${table}". Remove that first.`
    : 'this client still has linked records. Remove those first.';
  return new Error(`Cannot delete: ${reasons[table] ?? fallback}`);
}

export async function deleteClient(id) {
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw friendlyDeleteError(error);
}
