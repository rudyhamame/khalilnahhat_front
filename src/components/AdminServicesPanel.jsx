import {quoteTotals} from '../lib/quoteTotals.mjs';
import './adminBookingRequests.css';
import AdminSelect from './AdminSelect';
import BookingDraftConversation from './BookingDraftConversation';
import { Send } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const cadFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
});

const readable=value=>String(value||'').replaceAll('_',' ').replace(/^./,char=>char.toUpperCase());
const eventDate=value=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return value||'Date not provided';return new Intl.DateTimeFormat('en-CA',{dateStyle:'medium',timeZone:'America/Toronto'}).format(new Date(value+'T12:00:00-05:00'));};
const eventTime=value=>{const match=/^(\d{2}):(\d{2})$/.exec(value||'');if(!match)return value||'—';const hour=Number(match[1]);return `${hour%12||12}:${match[2]} ${hour>=12?'PM':'AM'}`;};

function buildDraft(request, currentDraft) {
  return {
    adminNote: currentDraft?.adminNote ?? request.adminNote ?? '',
    validDays: currentDraft?.validDays ?? request.validDays ?? 7,
    taxPercent: currentDraft?.taxPercent ?? request.taxPercent ?? 13,
    discountType: currentDraft?.discountType ?? request.discountType ?? 'amount',
    discountValue: currentDraft?.discountValue ?? request.discountValue ?? 0,
    depositAmount: currentDraft?.depositAmount ?? request.deposit ?? 0,
    paymentInstructions: currentDraft?.paymentInstructions ?? request.paymentInstructions ?? '',
    prices: Object.fromEntries(
      request.items.map((item) => [
        item.serviceId,
        currentDraft?.prices?.[item.serviceId] ?? (item.unitPrice ?? item.defaultUnitPrice ?? ''),
      ]),
    ),
  };
}

function AdminServicesPanel({ requests, onPublishQuote, onQuoteAction, confirmedBookings = [] }) {
  const [selectedId,setSelectedId]=useState(null);
  const selectedRequest=requests.find(request=>request.id===selectedId)||requests[0];
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
    if(!Number.isInteger(Number(draft.validDays))||Number(draft.validDays)<1||Number(draft.validDays)>60||!Number.isFinite(Number(draft.taxPercent))||Number(draft.taxPercent)<0||Number(draft.taxPercent)>30||!Number.isFinite(Number(draft.depositAmount))||Number(draft.depositAmount)<0){
      setStatuses(current=>({...current,[request.id]:'Check quote terms: validity 1–60 days, tax 0–30%, and a non-negative deposit.'}));return;
    }
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

    const subtotal=request.items.reduce((sum,item)=>sum+Math.round(Number(draft.prices[item.serviceId])*100)*item.quantity,0)/100;
    if(!Number.isFinite(Number(draft.discountValue))||Number(draft.discountValue)<0||(draft.discountType==='percent'?Number(draft.discountValue)>100:Number(draft.discountValue)>subtotal)){
      setStatuses(current=>({...current,[request.id]:'Discount must be between zero and the subtotal, or between 0% and 100%.'}));return;
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
        discountType: draft.discountType,
        discountValue: Number(draft.discountValue)||0,
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
    <>
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
      <div className="admin-booking-layout">
        <aside className="admin-booking-list" aria-label="Booking requests">
          <header><h2>Booking requests</h2><span className="admin-services-count">{requestCountLabel}</span></header>
          <nav aria-label="Choose a booking request">
            {requests.map(request=><button key={request.id} type="button" className="admin-booking-list-item" aria-current={selectedRequest?.id===request.id?'true':undefined} aria-controls="admin-booking-detail" onClick={()=>setSelectedId(request.id)}>
              <span className="admin-booking-list-top"><strong>{request.customerName}</strong><span className={`admin-service-request-status is-${request.status}`}>{request.status?.replaceAll('_',' ')}</span></span>
              <span className="admin-booking-list-event">{[request.order?.event?.type||request.event?.eventType,request.order?.event?.date||request.event?.eventDate].filter(Boolean).join(' · ')||'Event details pending'}</span>
              <small>{request.requestNumber||request.id}</small>
            </button>)}
            {!requests.length&&<p className="admin-booking-list-empty">No booking requests yet.</p>}
          </nav>
        </aside>
      <section id="admin-booking-detail" className="admin-booking-detail-column" aria-labelledby="admin-booking-detail-title">
        <header className="admin-booking-detail-heading"><h2 id="admin-booking-detail-title">Booking details</h2>{selectedRequest&&<span>{selectedRequest.requestNumber||selectedRequest.id}</span>}</header>
        {requests.length ? (
          [selectedRequest].map((request) => {
            const draft = drafts[request.id] || buildDraft(request);
            const totals=quoteTotals({...draft,items:request.items.map(item=>({...item,unitPrice:Number(draft.prices?.[item.serviceId]||0)}))});

            return (
              <div key={request.id} className="admin-booking-detail-body">
              <article className="admin-service-request-card" aria-busy={publishingId===request.id}>
                <header className="booking-brief-heading">
                  <span className={`admin-service-request-status is-${request.status}`}>{readable(request.status)}</span>
                  <h3>{request.customerName}</h3>
                  <a href={`mailto:${request.customerEmail}`}>{request.customerEmail}</a>
                  <p>{readable(request.order?.event?.type||request.event?.eventType)} · {eventDate(request.order?.event?.date||request.event?.eventDate)}</p>
                </header>
                {request.event ? (
                  <dl className="admin-service-request-event">
                    {[
                      ['Schedule', `${eventTime(request.event.startTime)} – ${eventTime(request.event.endTime)}${request.event.endTime&&request.event.startTime&&request.event.endTime<request.event.startTime?' · next day':''} · Toronto time`],
                      ['Venue', [request.event.venueName,request.event.venueAddress,request.event.city,request.event.postalCode].filter(Boolean).join(', ')],
                      ['Setting', readable(request.order?.event?.venue?.setting||(request.event.indoor?'indoor':'outdoor'))],
                      ['Guests', request.event.guests],
                      ['Contact', `${request.event.phone} (${request.event.contactMethod})${request.event.company ? ` · ${request.event.company}` : ''}`],
                      ['Services', (request.event.services || []).join(', ')],
                      ['Music', readable(request.event.musicStyle)],
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
                <div className="booking-quote-layout">
                <section className="booking-pricing-column" aria-label="Services and pricing">
                <h4 className="booking-section-title">Services & pricing <span>CAD</span></h4>
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
                    <span>Services subtotal</span>
                    <strong>{cadFormatter.format(totals.subtotal)}</strong>
                  </div>

                </div>
                <div className="booking-discount-editor">
                  <label>Booking discount<AdminSelect value={draft.discountType} onChange={event=>setField(request.id,'discountType',event.target.value)} aria-label="Booking discount type"><option value="amount">Amount (CAD)</option><option value="percent">Percentage (%)</option></AdminSelect></label>
                  <label>{draft.discountType==='percent'?'Discount (%)':'Discount (CAD)'}<input type="number" min="0" max={draft.discountType==='percent'?100:totals.subtotal} step="0.01" value={draft.discountValue} onChange={event=>setField(request.id,'discountValue',event.target.value)}/></label>
                </div>
                <dl className="booking-price-summary">
                  <div><dt>Subtotal</dt><dd>{cadFormatter.format(totals.subtotal)}</dd></div>
                  <div><dt>Discount{draft.discountType==='percent'?` (${draft.discountValue||0}%)`:''}</dt><dd>−{cadFormatter.format(totals.discount)}</dd></div>
                  <div><dt>Tax ({draft.taxPercent||0}%)</dt><dd>{cadFormatter.format(totals.tax)}</dd></div>
                  <div className="is-total"><dt>Booking total</dt><dd>{cadFormatter.format(totals.total)}</dd></div>
                  <div><dt>Deposit</dt><dd>{cadFormatter.format(totals.deposit)}</dd></div>
                  <div><dt>Balance after deposit</dt><dd>{cadFormatter.format(totals.balance)}</dd></div>
                </dl>
                <p className="booking-pricing-hint">Equipment prices are prefilled from the equipment table. Edit any rate for this quote. The booking discount applies to the subtotal before tax.</p>
                </section>
                <aside className="booking-quote-terms" aria-label="Quote terms">
                <h4 className="booking-section-title">Quote terms</h4>
                <div className="admin-service-request-terms">
                  <label>Valid days<input type="number" min="1" max="60" value={draft.validDays} onChange={(e) => setField(request.id, 'validDays', e.target.value)} /></label>
                  <label>Tax %<input type="number" min="0" max="30" step="0.01" value={draft.taxPercent} onChange={(e) => setField(request.id, 'taxPercent', e.target.value)} /></label>
                  <label>Deposit (CAD)<input type="number" min="0" step="0.01" value={draft.depositAmount} onChange={(e) => setField(request.id, 'depositAmount', e.target.value)} /></label>
                  {request.expiresAt ? <span>{`Expires ${new Date(request.expiresAt).toLocaleString('en-CA')}`}</span> : null}
                </div>
                <label className="admin-service-request-terms">Payment instructions shown to the customer
                  <textarea rows="2" value={draft.paymentInstructions} onChange={(e) => setField(request.id, 'paymentInstructions', e.target.value)} />
                </label>
                </aside>
                </div>
                <div className="booking-publish-action">                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => publishQuote(request)}
                    disabled={Boolean(publishingId)||['cancelled','confirmed'].includes(request.status)}
                  >
                    <Send size={15} />
                    {publishingId === request.id
                      ? 'Publishing...'
                      : request.status === 'quoted'
                        ? 'Update Published Quote'
                        : 'Publish to Customer'}
                  </button><small>The customer reviews the quote before accepting.</small></div>
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
              <aside className="booking-conversation-aside" aria-label="Booking conversation"><BookingDraftConversation conversation={request.conversation} expanded/>{!request.conversation&&<p className="booking-conversation-empty">No Echo AI conversation was attached to this request.</p>}</aside>
              </div>
            );
          })
        ) : (
          <div className="admin-services-empty">
            <strong>No service requests yet</strong>
            <p>Signed-in customer requests from the Services page will appear here.</p>
          </div>
        )}
      </section>
      </div>
    </>
  );
}

export default AdminServicesPanel;
