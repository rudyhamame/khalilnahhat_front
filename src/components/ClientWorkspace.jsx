import { CalendarDays, ClipboardList, LayoutDashboard, Receipt } from 'lucide-react';
import AdminWorkspace from './AdminWorkspace';
import './clientWorkspace.css';

const GROUPS = [
  { name: 'Your event', items: [
    ['overview', 'Overview', '/dashboard', LayoutDashboard],
    ['services', 'Quotes & bookings', '/dashboard/services', ClipboardList],
  ] },
  { name: 'Details', items: [
    ['planning', 'Event planning', '/dashboard/planning', CalendarDays],
    ['payments', 'Payments & receipts', '/dashboard/payments', Receipt],
  ] },
];

export default function ClientWorkspace({ activeKey, user, onLogout, children }) {
  return <AdminWorkspace activeKey={activeKey} username={user?.email || user?.username}
    onLogout={onLogout} groups={GROUPS} workspaceLabel="Client Workspace"
    storagePrefix="khalil-client" variant="client">{children}</AdminWorkspace>;
}
