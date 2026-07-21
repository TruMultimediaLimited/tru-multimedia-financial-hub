// Minimal inline SVG icon set — deliberately not an icon-font/library
// dependency, per CLAUDE.md's "keep bundle small" convention.
const paths = {
  dashboard: 'M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 14h7v6H4z',
  ledger: 'M6 3h9l3 3v15H6zM15 3v3h3M9 11h6M9 15h6M9 19h4',
  projects: 'M3 7h6l2 2h10v10H3z',
  clients: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c0-4 4-6 8-6s8 2 8 6',
  employees: 'M8 12a3 3 0 100-6 3 3 0 000 6zM16 12a3 3 0 100-6 3 3 0 000 6zM2 20c0-3.3 2.7-6 6-6M22 20c0-3.3-2.7-6-6-6M8 20c0-3.3 1.8-6 4-6s4 2.7 4 6',
  invoices: 'M7 3h10v18l-2.5-2-2.5 2-2.5-2L7 21zM9 8h6M9 12h6M9 16h4',
  reports: 'M4 20V10M10 20V4M16 20v-7M4 20h16',
  audit: 'M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  close: 'M6 6l12 12M18 6L6 18',
  chevron: 'M9 6l6 6-6 6',
};

export default function Icon({ name, className = 'w-5 h-5' }) {
  const d = paths[name] ?? paths.more;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
