// Central module list — mirrors docs/architecture.md §3 and
// docs/ui-spec.md §2.3. Single source of truth for the sidebar,
// bottom tab bar, and the mobile "More" sheet.
export const modules = [
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard', bottomTab: true },
  { path: '/income', label: 'Income', icon: 'income', bottomTab: true },
  { path: '/expense', label: 'Expense', icon: 'expense', bottomTab: true },
  { path: '/projects', label: 'Projects', icon: 'projects', bottomTab: true },
  { path: '/clients', label: 'Clients', icon: 'clients', bottomTab: false, group: 'Management' },
  { path: '/employees', label: 'Employees', icon: 'employees', bottomTab: false, group: 'Management' },
  { path: '/owners', label: 'Owners', icon: 'owners', bottomTab: false, group: 'Management' },
  { path: '/invoices', label: 'Invoices', icon: 'invoices', bottomTab: false, group: 'Business' },
  { path: '/reports', label: 'Reports', icon: 'reports', bottomTab: false, group: 'Business' },
  { path: '/audit-log', label: 'Audit Log', icon: 'audit', bottomTab: false, group: 'System' },
];

// Order the More sheet's section groups appear in — separate from the
// array order above since grouping needs an explicit sequence.
export const MORE_SHEET_GROUPS = ['Management', 'Business', 'System'];

export const bottomTabModules = modules.filter((m) => m.bottomTab);
export const moreSheetModules = modules.filter((m) => !m.bottomTab);
