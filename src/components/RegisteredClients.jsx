import { useEffect, useState } from 'react';
import { Ban, Search, ShieldCheck, Trash2, Users } from 'lucide-react';
import { apiBaseUrl } from '../lib/api';

export default function RegisteredClients({ token }) {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [workingId, setWorkingId] = useState('');

  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set('q', query.trim());
        const response = await fetch(`${apiBaseUrl}/admin/clients?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Could not load registered clients.');
        if (current) setItems((data.items || []).filter((client) => !client.isAdmin));
      } catch (err) {
        if (current && err.name !== 'AbortError') setError(err.message || 'Could not load registered clients.');
      } finally {
        if (current) setLoading(false);
      }
    }, 180);
    return () => { current = false; clearTimeout(timer); controller.abort(); };
  }, [query, token]);

  const block = async (client) => {
    setWorkingId(client.id); setError(''); setNotice('');
    try {
      const response = await fetch(`${apiBaseUrl}/admin/clients/${encodeURIComponent(client.id)}/block`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ blocked: !client.isBlocked }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Could not update client access.');
      setItems((current) => current.map((item) => item.id === client.id ? data.item : item));
      setNotice(data.item.isBlocked ? 'Client access blocked.' : 'Client access restored.');
    } catch (err) { setError(err.message || 'Could not update client access.'); }
    finally { setWorkingId(''); }
  };

  const remove = async (client) => {
    const name = client.name || client.username || 'this client';
    if (!window.confirm(`Permanently delete ${name} and all database records linked to this account? This removes their account, bookings, meeting details, documents, voucher-use records, and account-owned records. This cannot be undone.`)) return;
    setWorkingId(client.id); setError(''); setNotice('');
    try {
      const response = await fetch(`${apiBaseUrl}/admin/clients/${encodeURIComponent(client.id)}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Could not delete this client.');
      setItems((current) => current.filter((item) => item.id !== client.id));
      setNotice(`${name} and their linked database records were deleted.`);
    } catch (err) { setError(err.message || 'Could not delete this client.'); }
    finally { setWorkingId(''); }
  };

  return <section className="admin-panel registered-clients-panel" aria-label="Registered clients">
    <header className="admin-panel-head">
      <div><h2 className="admin-title-with-icon"><Users size={18} aria-hidden="true" />Registered Clients</h2></div>
      <span>{items.length} {items.length === 1 ? 'client' : 'clients'}</span>
    </header>
    <label className="registered-clients-search"><Search size={16} aria-hidden="true" /><span className="sr-only">Search registered clients</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, email, or username" /></label>
    {error && <p role="alert" className="registered-clients-message">{error}</p>}
    {notice && <p role="status" className="registered-clients-message">{notice}</p>}
    {loading ? <p role="status" className="registered-clients-message">Loading registered clients…</p> : !error && (items.length ? <div className="registered-clients-table-wrap"><table className="registered-clients-table"><thead><tr><th>Client</th><th>Email</th><th>Username</th><th>Registered</th><th>Access</th><th>Actions</th></tr></thead><tbody>{items.map((client) => <tr key={client.id}><td><strong>{client.name || client.username || 'Unnamed client'}</strong></td><td>{client.email || '—'}</td><td>{client.username || '—'}</td><td>{client.createdAt ? new Date(client.createdAt).toLocaleDateString() : '—'}</td><td>{client.isBlocked ? 'Blocked' : 'Active'}</td><td><div className="registered-clients-actions"><button type="button" disabled={workingId === client.id} onClick={() => block(client)}>{client.isBlocked ? <ShieldCheck size={14} aria-hidden="true"/> : <Ban size={14} aria-hidden="true"/>}{client.isBlocked ? 'Unblock' : 'Block'}</button><button type="button" className="is-delete" disabled={workingId === client.id} onClick={() => remove(client)}><Trash2 size={14} aria-hidden="true"/>Delete</button></div></td></tr>)}</tbody></table></div> : <p className="registered-clients-message">No registered clients found.</p>)}
  </section>;
}
