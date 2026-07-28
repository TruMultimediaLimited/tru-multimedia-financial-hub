// Light, low-saturation accent per entity type — lets Project/Client/
// Employee/Owner cards be told apart at a glance (e.g. on the Dashboard's
// Due list, where Receivable/Payable/breakdown rows used to all render in
// the same white card with no visual distinction) without the page turning
// into a wall of saturated color. `bg` is a full light fill for the whole
// card (not just a left-border stripe) — a pale accent border on an
// otherwise plain white card still reads as flat/white at a glance.
export const ENTITY_COLORS = {
  project: {
    icon: 'bg-violet-100 text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-l-violet-300',
    text: 'text-violet-700',
    dot: 'bg-violet-400',
  },
  client: {
    icon: 'bg-blue-100 text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-l-blue-300',
    text: 'text-blue-700',
    dot: 'bg-blue-400',
  },
  employee: {
    icon: 'bg-teal-100 text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-l-teal-300',
    text: 'text-teal-700',
    dot: 'bg-teal-400',
  },
  owner: {
    icon: 'bg-rose-100 text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-l-rose-300',
    text: 'text-rose-700',
    dot: 'bg-rose-400',
  },
  loan: {
    icon: 'bg-amber-100 text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-l-amber-300',
    text: 'text-amber-700',
    dot: 'bg-amber-400',
  },
};
