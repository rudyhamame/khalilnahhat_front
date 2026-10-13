import { useState } from 'react';
import { apiBaseUrl } from '../lib/api';

const money = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });

export function PaymentsBlock({ request, onQuoteAction, token }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const balance = Math.max(0, request.total * 100 - request.depositPaidCents) / 100;

  const payBalance = async () => {
    setBusy(true);
    setError('');
    try {
      const { url } = await onQuoteAction(request.id, 'pay-balance', amount ? { amount: Number(amount) } : {});
      window.location.href = url;
    } catch (e) {
      setError(e.message || 'Payment could not be started.');
      setBusy(false);
    }
  };
  const receipt = async (sessionId) => {
    const r = await fetch(`${apiBaseUrl}/service-requests/${encodeURIComponent(request.id)}/receipt/${encodeURIComponent(sessionId)}`, { headers: { Authorization: `Bearer ${token}` } });
    const url = URL.createObjectURL(await r.blob());
    window.open(url, '_blank', 'noopener');
  };

  return (
    <div className="dashboard-quote-actions">
      <p>{`Paid: ${money.format(request.depositPaidCents / 100)} · Remaining balance: ${money.format(balance)}`}</p>
      {balance > 0 && (
        <>
          <label>Amount (CAD, blank = full balance)
            <input type="number" min="1" max={balance} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <button type="button" className="primary-button" disabled={busy} onClick={payBalance}>PAY BALANCE</button>
        </>
      )}
      {request.payments?.length ? (
        <ul>
          {request.payments.map((p) => (
            <li key={`${p.sessionId}-${p.kind}`}>
              {`${new Date(p.paidAt).toLocaleDateString('en-CA')} · ${p.kind} · ${money.format(p.amountCents / 100)} `}
              {p.kind !== 'refund' ? <button type="button" className="echo-link" onClick={() => receipt(p.sessionId)}>Receipt</button> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}

const FIELDS = [
  ['brideName', 'Bride name'], ['groomName', 'Groom name'], ['timeline', 'Wedding timeline'], ['partyEntrances', 'Bridal party entrances'],
  ['entranceSongs', 'Entrance songs'], ['firstDance', 'First dance'], ['parentDances', 'Parent dances'], ['dinnerMusic', 'Dinner music'],
  ['cakeCutting', 'Cake cutting'], ['announcements', 'Special announcements'], ['mustPlay', 'Must-play songs'], ['doNotPlay', 'Do-not-play songs'],
  ['musicLinks', 'Music links (YouTube, Spotify, Drive…)'], ['specialRequests', 'Special requests'],
];

export function PlanningForm({ request, onQuoteAction }) {
  const [f, setF] = useState(() => Object.fromEntries(FIELDS.map(([k]) => [k, request.planning?.[k] || ''])));
  const [state, setState] = useState('');
  const save = async (e) => {
    e.preventDefault();
    setState('Saving…');
    try {
      await onQuoteAction(request.id, 'planning', f, 'PUT');
      setState('Saved.');
    } catch (err) {
      setState(err.message || 'Could not save.');
    }
  };
  return (
    <form className="echo-form" onSubmit={save}>
      <h4>Event planning</h4>
      <fieldset>
        {FIELDS.map(([k, label]) => (
          <label key={k}>{label}<textarea rows="2" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>
        ))}
      </fieldset>
      <button className="primary-button">SAVE PLANNING DETAILS</button> <span role="status">{state}</span>
    </form>
  );
}
