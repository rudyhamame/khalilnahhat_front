import { useMemo, useState } from 'react';
import './adminTransactions.css';

const money = (value, currency = 'CAD') => new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(Number(value || 0));
const day = (value) => {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(date);
};

// One row per confirmed booking: what it earns (the quote without tax), what has been received and what is still owed, with the totals below.
// Taxes are collected for the state, so they are not earnings. Received is the recorded payments net of refunds (voided entries ignored).
export function bookingEarnings(requests) {
  return (requests || []).filter((request) => request.journey?.isBooked).map((request) => {
    const total = Number(request.total || 0), tax = Number(request.tax || 0), received = Number(request.depositPaidCents || 0) / 100;
    return {
      id: request.id, code: request.confirmationCode || request.requestNumber || request.id, customer: request.customerName || request.customerEmail || '—',
      email: request.customerEmail || '', date: request.event?.eventDate || request.eventDate || '', currency: request.currency || 'CAD',
      total, tax, earning: total - tax, received, outstanding: Math.max(0, total - received),
      payments: (request.payments || []).filter((payment) => !payment.voided).length,
    };
  }).sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export function sumBookings(rows) {
  return rows.reduce((sum, row) => ({ total: sum.total + row.total, tax: sum.tax + row.tax, earning: sum.earning + row.earning, received: sum.received + row.received, outstanding: sum.outstanding + row.outstanding }), { total: 0, tax: 0, earning: 0, received: 0, outstanding: 0 });
}

function AdminTransactionsPanel({ requests = [], onRefresh }) {
  const [busy, setBusy] = useState(false), [status, setStatus] = useState('');
  const rows = useMemo(() => bookingEarnings(requests), [requests]);
  const totals = useMemo(() => sumBookings(rows), [rows]);
  const currency = rows[0]?.currency || 'CAD';
  const refresh = async () => {
    setBusy(true); setStatus('');
    try { await onRefresh?.(); setStatus('Refreshed.'); } catch (error) { setStatus(error.message || 'Could not refresh.'); } finally { setBusy(false); }
  };
  return <section id="admin-transactions" className="at-panel" aria-label="Transactions">
    <header className="at-head">
      <div><h2>Transactions</h2><p>Each confirmed booking with what it earns. Earning is the quote without tax; received is the payments recorded against it.</p></div>
      <button type="button" className="secondary-button" onClick={refresh} disabled={busy}>{busy ? 'Refreshing…' : 'Refresh'}</button>
    </header>
    <div className="at-cards">
      <div><span>Bookings</span><strong>{rows.length}</strong></div>
      <div className="is-main"><span>Total earning</span><strong>{money(totals.earning, currency)}</strong></div>
      <div><span>Received</span><strong>{money(totals.received, currency)}</strong></div>
      <div><span>Outstanding</span><strong>{money(totals.outstanding, currency)}</strong></div>
    </div>
    <div className="at-table-wrap">
      <table className="at-table">
        <thead><tr><th scope="col">Booking</th><th scope="col">Event date</th><th scope="col">Quote total</th><th scope="col">Tax</th><th scope="col">Earning</th><th scope="col">Received</th><th scope="col">Outstanding</th></tr></thead>
        <tbody>
          {rows.map((row) => <tr key={row.id}>
            <th scope="row"><strong>{row.code}</strong><small>{row.customer}{row.email && row.email !== row.customer ? ` · ${row.email}` : ''}</small></th>
            <td>{day(row.date)}</td>
            <td>{money(row.total, row.currency)}</td>
            <td>{money(row.tax, row.currency)}</td>
            <td className="at-earning">{money(row.earning, row.currency)}</td>
            <td>{money(row.received, row.currency)}<small>{row.payments} payment{row.payments === 1 ? '' : 's'}</small></td>
            <td className={row.outstanding ? 'is-owed' : undefined}>{money(row.outstanding, row.currency)}</td>
          </tr>)}
          {!rows.length && <tr><td colSpan="7" className="at-empty">No confirmed bookings yet.</td></tr>}
        </tbody>
        {rows.length > 0 && <tfoot><tr><th scope="row">Total · {rows.length} booking{rows.length === 1 ? '' : 's'}</th><td /><td>{money(totals.total, currency)}</td><td>{money(totals.tax, currency)}</td><td className="at-earning">{money(totals.earning, currency)}</td><td>{money(totals.received, currency)}</td><td className={totals.outstanding ? 'is-owed' : undefined}>{money(totals.outstanding, currency)}</td></tr></tfoot>}
      </table>
    </div>
    {status && <p className="at-status" role="status">{status}</p>}
  </section>;
}

export default AdminTransactionsPanel;
