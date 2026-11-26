import { History, UserRound, Video } from 'lucide-react';
import AdminWorkspace from './AdminWorkspace';
import './clientWorkspace.css';

// Each booking view has its own workspace destination.
const GROUPS = [
  { name: 'Your event', items: [
    ['profile', 'Personal info', '/dashboard/profile', UserRound],
    ['bookings', 'Bookings', '/dashboard/bookings', History],
    ['meetings', 'Meet Echo', '/dashboard/meetings', Video],
  ] },
];

export default function ClientWorkspace({ activeKey, user, onLogout, children,ar=false }) {
  return <AdminWorkspace ar={ar} activeKey={activeKey} username={user?.email || user?.username}
    onLogout={onLogout} groups={GROUPS} workspaceLabel="Client Workspace"
    storagePrefix="khalil-client" variant="client">{children}</AdminWorkspace>;
}
