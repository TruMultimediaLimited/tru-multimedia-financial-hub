import { useMemo, useState } from 'react';

function pad(n) {
  return String(n).padStart(2, '0');
}

function toISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Month-scoped date range for Dashboard/Reports summary figures — offset 0
// is the current calendar month, negative offsets step into the past.
// Future months are never reachable (nothing to summarize yet).
export function useMonthRange() {
  const [offset, setOffset] = useState(0);
  return useMemo(() => {
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const monthStart = toISODate(base);
    const monthEnd = toISODate(new Date(base.getFullYear(), base.getMonth() + 1, 0));
    const label = base.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return { offset, setOffset, monthStart, monthEnd, label };
  }, [offset]);
}
