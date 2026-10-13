import { useState } from 'react';
import { apiBaseUrl } from '../lib/api';

const money = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });

export function PaymentsBlock({ request, token }) {
  const paid = request.depositPaidCents / 100;
  const balance = Math.max(0, request.total - paid);
  const receipt = async (paymentId) => {
    const r = await fetch(`${apiBaseUrl}/service-requests/${encodeURIComponent(request.id)}/receipt/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Bearer ${token}` } });
    window.open(URL.createObjectURL(await r.blob()), '_blank', 'noopener');
  };
  const entries = (request.payments || []).filter((p) => !p.voided);
  return (
    <div className="dashboard-quote-actions">
      <p>{`Paid: ${money.format(paid)} · Remaining balance: ${money.format(balance)}`}</p>
      {balance > 0 && request.paymentInstructions ? <p>{`How to pay: ${request.paymentInstructions}`}</p> : null}
      {entries.length ? (
        <ul>
          {entries.map((p) => (
            <li key={p.id}>
              {`${new Date(p.paidAt).toLocaleDateString('en-CA')} · ${p.kind} · ${p.method} · ${money.format(p.amountCents / 100)} `}
              {p.kind !== 'refund' ? <button type="button" className="echo-link" onClick={() => receipt(p.id)}>Receipt</button> : null}
            </li>
          ))}
        </ul>
      ) : null}
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
