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
  pending: 'bg-gray-500/15 text-gray-500 border-gray-500/30',
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
