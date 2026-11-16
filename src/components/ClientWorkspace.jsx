import { History, LayoutDashboard, UserRound } from 'lucide-react';
import AdminWorkspace from './AdminWorkspace';
import './clientWorkspace.css';

// One booking tab: every request, its status, its quote, payments and planning live in Booking history.
const GROUPS = [
  { name: 'Your event', items: [
    ['overview', 'Overview', '/dashboard', LayoutDashboard],
    ['bookings', 'Booking history', '/dashboard/bookings', History],
    ['profile', 'Personal info', '/dashboard/profile', UserRound],
  ] },
];

export default function ClientWorkspace({ activeKey, user, onLogout, children }) {
  return <AdminWorkspace activeKey={activeKey} username={user?.email || user?.username}
    onLogout={onLogout} groups={GROUPS} workspaceLabel="Client Workspace"
    storagePrefix="khalil-client" variant="client">{children}</AdminWorkspace>;
}
