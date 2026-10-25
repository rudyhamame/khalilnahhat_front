import AdminSelect from './AdminSelect';
import { Send } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const cadFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
});

function buildDraft(request, currentDraft) {
  return {
    adminNote: currentDraft?.adminNote ?? request.adminNote ?? '',
    validDays: currentDraft?.validDays ?? request.validDays ?? 7,
    taxPercent: currentDraft?.taxPercent ?? request.taxPercent ?? 13,
    depositAmount: currentDraft?.depositAmount ?? request.deposit ?? 0,
    paymentInstructions: currentDraft?.paymentInstructions ?? request.paymentInstructions ?? '',
    prices: Object.fromEntries(
      request.items.map((item) => [
        item.serviceId,
        currentDraft?.prices?.[item.serviceId] ?? (item.unitPrice ?? ''),
      ]),
    ),
  };
}

function AdminServicesPanel({ requests, onPublishQuote, onQuoteAction, confirmedBookings = [] }) {
  const [drafts, setDrafts] = useState({});
  const [publishingId, setPublishingId] = useState('');
  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    setDrafts((current) =>
      Object.fromEntries(requests.map((request) => [request.id, buildDraft(request, current[request.id])])),
    );
  }, [requests]);

  const requestCountLabel = useMemo(
    () => `${requests.length} REQUEST${requests.length === 1 ? '' : 'S'}`,
    [requests.length],
  );

  const updatePrice = (requestId, serviceId, value) => {
    setDrafts((current) => ({
      ...current,
      [requestId]: {
        ...current[requestId],
        prices: {
          ...current[requestId]?.prices,
          [serviceId]: value,
        },
      },
    }));
  };

  const updateNote = (requestId, value) => {
    setDrafts((current) => ({
      ...current,
      [requestId]: {
        ...current[requestId],
        adminNote: value,
      },
    }));
  };

  const runAction = async (request, action, body) => {
    setStatuses((current) => ({ ...current, [request.id]: '' }));
    try {
      await onQuoteAction(request.id, action, body);
      setStatuses((current) => ({ ...current, [request.id]: `Done: ${action}.` }));
    } catch (error) {
      setStatuses((current) => ({ ...current, [request.id]: error.message || 'Action failed.' }));
    }
  };

  const setField = (id, field, value) =>
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));

  const publishQuote = async (request) => {
    const draft = drafts[request.id] || buildDraft(request);
    const hasMissingPrice = request.items.some((item) => {
      const value = draft.prices?.[item.serviceId];
      return value === '' || !Number.isFinite(Number(value)) || Number(value) < 0;
    });

    if (hasMissingPrice) {
      setStatuses((current) => ({
        ...current,
        [request.id]: 'Enter a valid amount for every service before publishing.',
      }));
      return;
    }

    setPublishingId(request.id);
    setStatuses((current) => ({ ...current, [request.id]: '' }));

    try {
      const result = await onPublishQuote(request.id, {
        items: request.items.map((item) => ({
          serviceId: item.serviceId,
          unitPrice: Number(draft.prices[item.serviceId]),
        })),
        adminNote: draft.adminNote || '',
        validDays: Number(draft.validDays) || 7,
        taxPercent: Number(draft.taxPercent) || 0,
        depositAmount: Number(draft.depositAmount) || 0,
        paymentInstructions: draft.paymentInstructions || '',
      });
      setStatuses((current) => ({
        ...current,
        [request.id]: result.notificationSent
          ? 'Quote published to the customer dashboard and emailed to the customer.'
          : 'Quote published, but the customer email could not be sent. Check the Brevo configuration.',
      }));
    } catch (error) {
      setStatuses((current) => ({
        ...current,
        [request.id]: error.message || 'The quote could not be published.',
      }));
    } finally {
      setPublishingId('');
    }
  };

  return (
    <section id="admin-services" className="admin-panel admin-services-panel">
      {confirmedBookings.length ? (
        <div className="admin-confirmed-bookings">
          <h3>Confirmed bookings</h3>
          <ul>
            {confirmedBookings.map((b) => (
              <li key={b.requestId}>{`${b.eventDate} · ${b.customerName}${b.venue ? ` · ${b.venue}` : ''}`}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="section-label admin-panel-head">
        <div className="admin-panel-head-copy">
          <p className="section-number">
            <span className="section-number-mark">KN//</span>
            <span className="section-number-value">03</span>
          </p>
          <h2>Quotes &amp; bookings</h2>
        </div>
        <span className="admin-services-count">{requestCountLabel}</span>
      </div>

      <div className="admin-services-workspace">
        {requests.length ? (
          requests.map((request) => {
            const draft = drafts[request.id] || buildDraft(request);
            const total = request.items.reduce(
              (sum, item) => sum + Number(draft.prices?.[item.serviceId] || 0) * item.quantity,
              0,
            );

            return (
              <article key={request.id} className="admin-service-request-card">
                <div className="admin-service-request-head">
                  <div>
                    <span className={`admin-service-request-status is-${request.status}`}>
                      {request.status}
                    </span>
                    <h3>{request.customerName}</h3>
                    <p>{`${request.customerUsername} / ${request.customerEmail}`}</p>
                  </div>
                  <div className="admin-service-request-reference">
                    <span>Request</span>
                    <strong>{request.id}</strong>
                  </div>
                </div>

                <div className="admin-service-quote-table">
                  <div className="admin-service-quote-row admin-service-quote-row-head">
                    <span>Service</span>
                    <span>Quantity</span>
                    <span>Amount per unit (CAD)</span>
                    <span>Line total</span>
                  </div>
                  {request.items.map((item) => {
                    const value = draft.prices?.[item.serviceId] ?? '';
                    const lineTotal = Number(value || 0) * item.quantity;

                    return (
                      <div key={item.serviceId} className="admin-service-quote-row">
                        <strong>{item.name}</strong>
                        <span>{item.quantity}</span>
                        <label>
                          <span className="sr-only">Amount per unit for {item.name}</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={value}
                            onChange={(event) => updatePrice(request.id, item.serviceId, event.target.value)}
                          />
                        </label>
                        <span>{cadFormatter.format(lineTotal)}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="admin-service-quote-footer">
                  <label>
                    <span>Message to customer</span>
                    <textarea
                      rows="2"
                      value={draft.adminNote || ''}
                      onChange={(event) => updateNote(request.id, event.target.value)}
                      placeholder="Optional details about this quote"
                    />
                  </label>
                  <div className="admin-service-quote-total">
                    <span>Quote total</span>
                    <strong>{cadFormatter.format(total)}</strong>
                  </div>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => publishQuote(request)}
                    disabled={publishingId === request.id}
                  >
                    <Send size={15} />
                    {publishingId === request.id
                      ? 'Publishing...'
                      : request.status === 'quoted'
                        ? 'Update Published Quote'
                        : 'Publish to Customer'}
                  </button>
                </div>
                {request.event ? (
                  <dl className="admin-service-request-event">
                    {[
                      ['Event', `${request.event.eventType} · ${request.event.eventDate} ${request.event.startTime}-${request.event.endTime}`],
                      ['Venue', `${request.event.venueName} ${request.event.venueAddress}, ${request.event.city} ${request.event.postalCode} (${request.event.inGta ? 'GTA' : 'outside GTA'}, ${request.event.indoor ? 'indoor' : 'outdoor'})`],
                      ['Guests', request.event.guests],
                      ['Contact', `${request.event.phone} (${request.event.contactMethod})${request.event.company ? ` · ${request.event.company}` : ''}`],
                      ['Services', (request.event.services || []).join(', ')],
                      ['Music', request.event.musicStyle],
                      ['Setup requirements', request.event.setupRequirements],
                      ['Other music', request.event.otherMusic],
                      ['DJ / MC', request.event.djMc],
                      ['Wedding entrance', request.event.entrance],
                      ['Custom mix', request.event.customMix],
                      ['Announcements', request.event.announcements],
                      ['Notes', request.event.notes],
                      ['Change request', request.changeRequest],
                    ].filter(([, value]) => value).map(([label, value]) => (
                      <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
                    ))}
                  </dl>
                ) : null}
                <div className="admin-service-request-terms">
                  <label>Valid days<input type="number" min="1" max="60" value={draft.validDays} onChange={(e) => setField(request.id, 'validDays', e.target.value)} /></label>
                  <label>Tax %<input type="number" min="0" max="30" step="0.01" value={draft.taxPercent} onChange={(e) => setField(request.id, 'taxPercent', e.target.value)} /></label>
                  <label>Deposit (CAD)<input type="number" min="0" step="0.01" value={draft.depositAmount} onChange={(e) => setField(request.id, 'depositAmount', e.target.value)} /></label>
                  {request.expiresAt ? <span>{`Expires ${new Date(request.expiresAt).toLocaleString('en-CA')}`}</span> : null}
                </div>
                <label className="admin-service-request-terms">Payment instructions shown to the customer
                  <textarea rows="2" value={draft.paymentInstructions} onChange={(e) => setField(request.id, 'paymentInstructions', e.target.value)} />
                </label>
                {['accepted', 'confirmed'].includes(request.status) ? (
                  <form className="admin-service-request-terms" onSubmit={(e) => {
                    e.preventDefault();
                    const f = Object.fromEntries(new FormData(e.target));
                    runAction(request, 'payments', { kind: f.kind, amount: Number(f.amount), method: f.method, reference: f.reference });
                    e.target.reset();
                  }}>
                    <AdminSelect name="kind" defaultValue={request.status === 'accepted' ? 'deposit' : 'balance'}>
                      {request.status === 'accepted' ? <option value="deposit">Deposit</option> : <><option value="balance">Balance</option><option value="refund">Refund</option></>}
                    </AdminSelect>
                    <input name="amount" type="number" min="0.01" step="0.01" required placeholder="Amount (CAD)" />
                    <AdminSelect name="method" defaultValue="etransfer">
                      <option value="etransfer">E-transfer</option><option value="cheque">Cheque</option><option value="bank_transfer">Bank transfer</option><option value="other">Other</option>
                    </AdminSelect>
                    <input name="reference" placeholder="Reference (optional)" />
                    <button type="submit" className="primary-button">RECORD PAYMENT</button>
                  </form>
                ) : null}
                {(request.payments || []).length ? (
                  <ul className="admin-service-request-terms">
                    {request.payments.map((p) => (
                      <li key={p.id} style={p.voided ? { textDecoration: 'line-through' } : undefined}>
                        {`${new Date(p.paidAt).toLocaleDateString('en-CA')} · ${p.kind} · ${p.method} · ${cadFormatter.format(p.amountCents / 100)}${p.reference ? ` · ${p.reference}` : ''} `}
                        {p.voided ? null : <button type="button" className="secondary-button" onClick={() => window.confirm('Void this payment entry?') && runAction(request, `payments/${p.id}/void`)}>Void</button>}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {['quoted', 'expired', 'changes_requested'].includes(request.status) && request.quotedAt ? (
                  <div className="admin-service-request-terms">
                    <button type="button" className="secondary-button" onClick={() => runAction(request, 'extend', { days: Number(draft.validDays) || 7 })}>
                      {request.status === 'expired' ? 'Reactivate' : 'Extend'} {Number(draft.validDays) || 7} days
                    </button>
                  </div>
                ) : null}
                {request.status !== 'cancelled' ? (
                  <button type="button" className="secondary-button" onClick={() => window.confirm('Cancel this request?') && runAction(request, 'cancel')}>Cancel request</button>
                ) : null}
                {statuses[request.id] ? (
                  <p className="admin-service-request-feedback" role="status">
                    {statuses[request.id]}
                  </p>
                ) : null}
              </article>
            );
          })
        ) : (
          <div className="admin-services-empty">
            <strong>No service requests yet</strong>
            <p>Signed-in customer requests from the Services page will appear here.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default AdminServicesPanel;
