import { supabase } from './supabase.js';

const INVOICE_SELECT = `
  id, invoice_number, issued_date, due_date, notes, client_id, transaction_id, project_id,
  clients(id, name, phone, email, address),
  transactions(id, category, total_amount, transaction_date, payments(amount)),
  projects(id, title, contract_value)
`;

async function fetchProjectBalancesMap() {
  const { data, error } = await supabase.from('project_balances').select('project_id, total_received');
  if (error) throw error;
  const map = new Map();
  for (const row of data ?? []) map.set(row.project_id, Number(row.total_received));
  return map;
}

function computeInvoiceAmounts(invoice, projectReceivedMap) {
  if (invoice.transactions) {
    const amount = Number(invoice.transactions.total_amount);
    const paid = (invoice.transactions.payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
    const due = amount - paid;
    const status = paid <= 0 ? 'pending' : paid >= amount ? 'paid' : 'partial';
    return { amount, paid, due, status };
  }
  if (invoice.projects) {
    const amount = Number(invoice.projects.contract_value);
    const paid = projectReceivedMap.get(invoice.projects.id) ?? 0;
    const due = amount - paid;
    const status = paid <= 0 ? 'pending' : paid >= amount ? 'paid' : 'partial';
    return { amount, paid, due, status };
  }
  return { amount: 0, paid: 0, due: 0, status: 'pending' };
}

export async function fetchInvoices() {
  const [{ data, error }, projectReceivedMap] = await Promise.all([
    supabase.from('invoices').select(INVOICE_SELECT).order('issued_date', { ascending: false }),
    fetchProjectBalancesMap(),
  ]);
  if (error) throw error;
  return (data ?? []).map((inv) => ({ ...inv, ...computeInvoiceAmounts(inv, projectReceivedMap) }));
}

export async function fetchInvoice(id) {
  const { data, error } = await supabase.from('invoices').select(INVOICE_SELECT).eq('id', id).single();
  if (error) throw error;
  const projectReceivedMap = await fetchProjectBalancesMap();
  return { ...data, ...computeInvoiceAmounts(data, projectReceivedMap) };
}

export async function fetchNextInvoiceNumber() {
  const { count, error } = await supabase.from('invoices').select('id', { count: 'exact', head: true });
  if (error) throw error;
  return `INV-${String((count ?? 0) + 1).padStart(4, '0')}`;
}

export async function createInvoice(payload) {
  const { data, error } = await supabase.from('invoices').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateInvoice(id, payload) {
  const { data, error } = await supabase.from('invoices').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteInvoice(id) {
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) throw error;
}
