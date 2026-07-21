// Central module list — mirrors docs/architecture.md §3 and
// docs/ui-spec.md §2.3. Single source of truth for the sidebar,
// bottom tab bar, and the mobile "More" sheet.
export const modules = [
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard', bottomTab: true },
  { path: '/ledger', label: 'Ledger', icon: 'ledger', bottomTab: true },
  { path: '/projects', label: 'Projects', icon: 'projects', bottomTab: true },
  { path: '/clients', label: 'Clients', icon: 'clients', bottomTab: false },
  { path: '/vendors', label: 'Vendors', icon: 'vendors', bottomTab: false },
  { path: '/employees', label: 'Employees', icon: 'employees', bottomTab: false },
  { path: '/invoices', label: 'Invoices', icon: 'invoices', bottomTab: false },
  { path: '/reports', label: 'Reports', icon: 'reports', bottomTab: true },
  { path: '/audit-log', label: 'Audit Log', icon: 'audit', bottomTab: false },
];

export const bottomTabModules = modules.filter((m) => m.bottomTab);
export const moreSheetModules = modules.filter((m) => !m.bottomTab);
