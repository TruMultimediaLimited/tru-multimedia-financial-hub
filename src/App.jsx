import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase.js';
import { ConcernProvider } from './context/ConcernContext.jsx';
import AppShell from './layout/AppShell.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Ledger from './pages/Ledger.jsx';
import LedgerDetail from './pages/LedgerDetail.jsx';
import Projects from './pages/Projects.jsx';
import ProjectDetail from './pages/ProjectDetail.jsx';
import Clients from './pages/Clients.jsx';
import ClientDetail from './pages/ClientDetail.jsx';
import Employees from './pages/Employees.jsx';
import EmployeeDetail from './pages/EmployeeDetail.jsx';
import Owners from './pages/Owners.jsx';
import OwnerDetail from './pages/OwnerDetail.jsx';
import Invoices from './pages/Invoices.jsx';
import InvoiceDetail from './pages/InvoiceDetail.jsx';
import Reports from './pages/Reports.jsx';
import AuditLog from './pages/AuditLog.jsx';

export default function App() {
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return (
    <ConcernProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell userEmail={userEmail} onSignOut={() => supabase.auth.signOut()} />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/income" element={<Ledger fixedType="income" />} />
            <Route path="/expense" element={<Ledger fixedType="expense" />} />
            <Route path="/ledger/:id" element={<LedgerDetail />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:id" element={<ClientDetail />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/employees/:id" element={<EmployeeDetail />} />
            <Route path="/owners" element={<Owners />} />
            <Route path="/owners/:id" element={<OwnerDetail />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/:id" element={<InvoiceDetail />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/audit-log" element={<AuditLog />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConcernProvider>
  );
}
