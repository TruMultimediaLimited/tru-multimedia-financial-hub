import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  FolderKanban,
  Users,
  UserCog,
  Award,
  FileText,
  BarChart3,
  ClipboardList,
  MoreHorizontal,
} from 'lucide-react';

// Lucide equivalents of the navConfig `icon` keys — used by Sidebar,
// BottomTabBar, and MoreSheet so nav iconography stays consistent
// app-wide (Icon.jsx's inline set is still used for non-nav chrome).
export const navIcons = {
  dashboard: LayoutDashboard,
  income: TrendingUp,
  expense: TrendingDown,
  projects: FolderKanban,
  clients: Users,
  employees: UserCog,
  owners: Award,
  invoices: FileText,
  reports: BarChart3,
  audit: ClipboardList,
  more: MoreHorizontal,
};
