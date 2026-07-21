export function formatMoney(amount) {
  const n = Number(amount) || 0;
  return `৳${n.toLocaleString('en-BD', { maximumFractionDigits: 2 })}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const STATUS_STYLES = {
  paid: 'bg-income/15 text-income border-income/30',
  partial: 'bg-due/15 text-due border-due/30',
  pending: 'bg-slate-500/15 text-slate-500 border-slate-500/30',
};

export const STATUS_LABELS = {
  paid: 'Paid',
  partial: 'Partial',
  pending: 'Due',
};

export const CHANNEL_LABELS = {
  bkash: 'bKash',
  nagad: 'Nagad',
  bank: 'Bank',
  cash: 'Cash',
  other: 'Other',
};

export const PROJECT_STATUS_STYLES = {
  running: 'bg-primary/15 text-primary border-primary/30',
  hold: 'bg-due/15 text-due border-due/30',
  cancelled: 'bg-expense/15 text-expense border-expense/30',
  completed: 'bg-income/15 text-income border-income/30',
};

// Payment-progress bucket — separate from a project's own active/completed/
// stalled status, this is purely about how much of the contract value has
// actually been collected.
export const PAYMENT_BUCKET_STYLES = {
  due: 'bg-slate-500/15 text-slate-500 border-slate-500/30',
  partial: 'bg-due/15 text-due border-due/30',
  complete: 'bg-income/15 text-income border-income/30',
};

export const PAYMENT_BUCKET_LABELS = {
  due: 'Due',
  partial: 'Partial',
  complete: 'Paid',
};
