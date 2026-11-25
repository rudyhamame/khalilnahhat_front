import BookingCardSummary from './BookingCardSummary';
import {ClientAvailabilityNotice} from './BookingAvailability';
import {bookingText,bookingLocale,bookingMoney} from '../lib/bookingUiText';
import BookingNegotiation from './BookingNegotiation';
import BookingMeetingForm from './BookingMeetingForm';
import {clientBookingJourney} from '../lib/clientBookingJourney';
import { EllipsisVertical, FileDown, PackageCheck, Undo2 } from 'lucide-react';
import { openBookingConfirmation } from '../lib/bookingConfirmation';
import { useEffect, useRef, useState } from 'react';
import { PaymentsBlock, PlanningForm } from '../echo/ClientExtras';
import ClientProfile from './ClientProfile';
import ClientWorkspace from './ClientWorkspace';
import BookingConversationHistory from './BookingConversationHistory';
import EventDraftCard from './EventDraftCard';
import BookingDraftReview from './BookingDraftReview';





function QuoteActions({ request, onQuoteAction, ar=false }) {
  const tr=text=>bookingText(text,ar);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!request.journey.awaitingClient) return null;
  const accept = async () => {
    setBusy(true);
    setError('');
    try {
      await onQuoteAction(request.id, 'accept', {quoteRevision:request.quoteRevision||0});
    } catch (e) {
      setError(e.message || tr("Action failed."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="dashboard-quote-actions">
      <button type="button" className="primary-button" disabled={busy} onClick={accept}>{tr("ACCEPT QUOTE")}</button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}

function DepositInstructions({ request, ar=false }) {
  const tr=text=>bookingText(text,ar),money=value=>bookingMoney(value,ar);
  return (
    <div className="dashboard-quote-actions">
      <p>{ar?`تم قبول العرض. لتأكيد الحجز وحجز الموعد، ادفع العربون البالغ ${money(request.deposit)} بتحويل إلكتروني أو شيك أو تحويل مصرفي (لا يُقبل النقد).`:`Accepted. To confirm your booking and reserve your date, pay the deposit of ${money(request.deposit)} by e-transfer, cheque or bank transfer (cash is not accepted).`}</p>
      {request.paymentOptions?.length ? <p>{`${tr('Payment options')}: ${request.paymentOptions.map(method=>tr(({etransfer:'E-transfer',cheque:'Cheque',bank_transfer:'Bank transfer',other:'Other'})[method]||method)).join(', ')}`}</p> : null}
      {request.paymentOptions?.includes('etransfer') && request.etransferEmail ? <p>{`${tr('Send the e-transfer to')}: ${request.etransferEmail}`}</p> : null}
      {request.paymentInstructions ? <p>{`${tr('How to pay')}: ${request.paymentInstructions}`}</p> : <p>{tr("We will send you the payment details shortly.")}</p>}
      <p>{tr("Your date is confirmed once we record your deposit.")}</p>
    </div>
  );
}

// Where a request is on its way. The labels, order and current step all come from the server's journey (booking-journey.js).
// When each status was reached, from the booking's own timestamps.
const stageTime = (request, key) => {
  const paid = (request.payments || []).filter((p) => !p.voided && p.paidAt).map((p) => p.paidAt).sort().at(-1);
  return { requested: request.createdAt, available: request.availabilityAcceptedAt || request.availability?.informedAt, unavailable: request.availability?.informedAt, quote_ready: request.quotedAt, deposit_paid: paid, booked: request.acceptedAt, modified: request.modifiedAt }[key] || '';
};
function StatusSteps({ journey, request, ar=false, onUndo }) {
  const tr = (text) => bookingText(text, ar), when = (key) => { const value = stageTime(request, key); return value ? new Intl.DateTimeFormat(bookingLocale(ar), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : ''; };
  if (journey.step === null) return <p className={`dashboard-status-end is-${journey.status}`}>{journey.label}</p>;
  return <ol className="dashboard-status-steps" aria-label={`${ar?'الحالة':'Status'}: ${journey.label}`}>{journey.path.map((entry, index) => <li key={entry.status} className={index < journey.step ? 'is-done' : index === journey.step ? 'is-current' : ''} aria-current={index === journey.step ? 'step' : undefined}><i aria-hidden="true">{index < journey.step ? '✓' : index + 1}</i><span>{entry.label}{index <= journey.step && when(entry.status) ? <small>{when(entry.status)}</small> : null}
    {index === journey.step && (journey.modified || request.modifications?.length > 0) && (() => { const all = request.modifications?.length ? request.modifications : [{ at: request.modifiedAt }], lastUndoable = all.map((entry) => entry.canUndo).lastIndexOf(true); return <ul className="dashboard-status-modifications">{all.map((entry, n) => <li key={`${entry.at}-${n}`} className={entry.undone ? 'is-undone' : ''}><b>{tr("Booking modified")}{all.length > 1 ? ` · ${n + 1}` : ''}</b>{entry.at ? <small>{new Intl.DateTimeFormat(bookingLocale(ar), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.at))}</small> : null}{n === lastUndoable && <button type="button" onClick={onUndo}>{tr("Undo modification")}</button>}</li>)}</ul>; })()}</span></li>)}</ol>;
}

// Three-dots menu in the booking header: withdraw the request, or save the booking as a PDF (the browser's print dialog opens on a clean confirmation page).
function BookingMenu({ request, onQuoteAction, ar=false }) {
  const tr=text=>bookingText(text,ar);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const box = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const away = (event) => { if (!box.current?.contains(event.target)) setOpen(false); };
    const esc = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  const canWithdraw = request.journey.awaitingClient || request.journey.canNegotiate;
  const withdraw = async () => {
    if (!window.confirm(request.journey.awaitingClient ? tr("Decline this quote?") : tr("Withdraw this request?"))) return;
    setBusy(true); setError('');
    try { await onQuoteAction(request.id, 'decline'); setOpen(false); } catch (e) { setError(e.message || tr("Action failed.")); } finally { setBusy(false); }
  };
  const download = () => { if (!openBookingConfirmation(request,{ar})) setError(tr("Your browser blocked the new window. Allow pop-ups for this site and try again.")); else setOpen(false); };
  return <div className="dashboard-booking-menu" ref={box}>
    <button type="button" className="dashboard-booking-menu-toggle" aria-label={tr("Booking actions")} aria-haspopup="menu" aria-expanded={open} onClick={() => { setOpen(!open); setError(''); }}><EllipsisVertical size={30} strokeWidth={2.5} aria-hidden="true" /></button>
    {open && <div className="dashboard-booking-menu-list" role="menu">
      {canWithdraw && <button type="button" role="menuitem" disabled={busy} onClick={withdraw}><Undo2 size={16} aria-hidden="true" />{tr("Withdraw")}</button>}
      <button type="button" role="menuitem" onClick={download}><FileDown size={16} aria-hidden="true" />{tr("Download booking information")}</button>
      {error ? <p role="alert">{error}</p> : null}
    </div>}
  </div>;
}

function RequestedServices({ requests, onQuoteAction, authToken, ar=false }) {
  const tr=text=>bookingText(text,ar),money=value=>bookingMoney(value,ar),dateTime=value=>new Intl.DateTimeFormat(bookingLocale(ar),{dateStyle:'long',timeStyle:'short'}).format(value);
  // Left aside: one card per booking. Right main: the details of the selected booking.
  const [selectedId, setSelectedId] = useState(()=>typeof window==='undefined'?'':new URLSearchParams(window.location.search).get('booking')||'');
  const selected = requests.find((request) => request.id === selectedId) || requests[0];
  return (
    <section className={`dashboard-services-view${requests.length ? ' is-split' : ''}`} aria-label={tr("Requests and quotes")}>
      {requests.length ? (
        <>
          <aside className="dashboard-bookings-aside" aria-label={tr("Your bookings")}>
            <span className="dashboard-bookings-count">{ar?`${requests.length} طلب`:`${requests.length} REQUEST${requests.length === 1 ? '' : 'S'}`}</span>
            <nav>
              {requests.map((request) => (
                <button key={request.id} type="button" aria-current={request.id === selected.id ? 'true' : undefined} onClick={() => setSelectedId(request.id)}>
                  <strong>{request.requestNumber || tr("Request received")}</strong>
                  <span className={`dashboard-service-status is-${request.status}`}>{request.journey.label}</span>
                  <BookingCardSummary request={request} ar={ar}/>
                  <small className="booking-card-received">{tr("Requested on")} {new Date(request.createdAt).toLocaleDateString(bookingLocale(ar))}</small>
                </button>
              ))}
            </nav>
          </aside>
          <main className="dashboard-bookings-main">
          {[selected].map((request) => (
            <article key={request.id} className="dashboard-service-request">
              <div className="dashboard-service-request-head">
                <div>
                  <h3>{request.requestNumber || (request.journey.awaitingClient ? tr("Your quote is ready") : tr("Request received"))}</h3>
                  <p>{`${tr("Requested on")} ${new Date(request.createdAt).toLocaleDateString(bookingLocale(ar), { dateStyle: 'long' })}`}</p>
                </div>
                <div className="dashboard-service-head-side">
                  <span className={`dashboard-service-status is-${request.status}`}>
                    {request.journey.label}{request.journey.modificationCount > 0 ? ` · ${tr("Modified")} ${request.journey.modificationCount}×` : ''}
                  </span>
                  <BookingMenu ar={ar} request={request} onQuoteAction={onQuoteAction} />
                </div>
              </div>

              <StatusSteps ar={ar} journey={request.journey} request={request} onUndo={async () => { if (!window.confirm(tr("Undo your last modification?"))) return; try { await onQuoteAction(request.id, 'undo-modification'); } catch (e) { window.alert(e.message || tr("Action failed.")); } }} />
              <ClientAvailabilityNotice key={`${request.id}:${request.quoteRevision}`} request={request} onQuoteAction={onQuoteAction} token={authToken} ar={ar}/>
              {(request.journey.awaitingClient || request.journey.canNegotiate) && <QuoteActions ar={ar} request={request} onQuoteAction={onQuoteAction}/>}
              {request.availabilityAcceptedAt && request.journey.clientNext === 'wait_for_quote' && <p>{ar?'تم تأكيد التوافر. يجري إعداد الأسعار وتفاصيل العربون.':'Availability confirmed. Your prices and deposit details are being prepared.'}</p>}
              {(request.journey.canRecordDeposit || request.journey.isBooked) && <BookingMeetingForm ar={ar} request={request} token={authToken} />}
              <BookingNegotiation ar={ar} request={request} token={authToken} onQuoteAction={onQuoteAction}/>
              {request.order&&<section className="dashboard-service-brief"><h4>{ar?'ملف فعاليتك الكامل':'Your complete event brief'}</h4><BookingDraftReview order={request.order} snapshot ar={ar}/></section>}
              <h4 className="dashboard-service-section-title">{tr("Rental services & equipment")}</h4>
              <div className="dashboard-service-table">
                <div className="dashboard-service-row dashboard-service-row-head">
                  <span>{tr("Service")}</span>
                  <span>{tr("Qty")}</span>
                  {request.journey.showsPrices ? <span>{tr("Unit price")}</span> : null}
                  {request.journey.showsPrices ? <span>{tr("Total")}</span> : null}
                </div>
                {request.items.map((item) => (
                  <div key={item.serviceId} className="dashboard-service-row">
                    <strong>{item.name}</strong>
                    <span>{item.quantity}</span>
                    {request.journey.showsPrices ? <span>{money(item.unitPrice)}</span> : null}
                    {request.journey.showsPrices ? <span>{money(item.lineTotal)}</span> : null}
                  </div>
                ))}
              </div>

              <div className="dashboard-service-request-footer">
                {request.journey.showsPrices ? (
                  <>
                    <p>{request.adminNote || tr("Your itemized quote has been prepared.")}</p>
                    <div>
                      <span>{tr("Subtotal")}</span><strong>{money(request.subtotal)}</strong>
                      {request.discount>0&&<><span>{request.discountType==='percent'?`${tr("Discount")} (${request.discountValue}%)`:tr("Discount")}</span><strong>−{money(request.discount)}</strong></>}
                      <span>{`${tr("Tax")} (${request.taxPercent}%)`}</span><strong>{money(request.tax)}</strong>
                      <span>{tr("Quote total")}</span><strong>{money(request.total)}</strong>
                      <span>{tr("Deposit")}</span><strong>{money(request.deposit)}</strong>
                      <span>{tr("Remaining balance")}</span><strong>{money(request.balance)}</strong>
                    </div>
                    {request.journey.awaitingClient && request.expiresAt ? (
                      <p>{ar?`صالح حتى ${dateTime(new Date(request.expiresAt))}. عرض السعر لا يحجز الموعد؛ يتأكد الموعد بعد قبول العرض ودفع العربون.`:`Valid until ${dateTime(new Date(request.expiresAt))}. A quotation does not guarantee a booking; your date is confirmed after acceptance and deposit payment.`}</p>
                    ) : null}
                    {request.journey.clientNext === 'contact_to_reactivate' ? <p>{tr("This quote has expired. Contact us to reactivate it.")}</p> : null}
                    {request.journey.canRecordDeposit ? <DepositInstructions ar={ar} request={request} /> : null}
                    {request.journey.isBooked ? (
                      <>
                        <p>{tr("Booking confirmed.")}</p>
                        <PaymentsBlock ar={ar} request={request} token={authToken} />
                        <PlanningForm ar={ar} request={request} onQuoteAction={onQuoteAction} />
                      </>
                    ) : null}
                  </>
                ) : request.journey.clientNext === 'wait_for_revised_quote' ? (
                  <p>{ar?`استلمنا طلب التعديل: «${request.changeRequest}». سيصلك عرض سعر محدّث.`:`We received your change request: "${request.changeRequest}". An updated quote will follow.`}</p>
                ) : request.journey.clientNext === 'none' ? (
                  <p>{request.declinedBy ? tr("This request was declined. Thank you for considering Echo Event Entertainment.") : tr("This request was cancelled.")}</p>
                ) : (
                  <p>{tr("Khalil is reviewing your event plan. Pricing will appear here when the quote is ready.")}</p>
                )}
              </div>
            </article>
          ))}
          </main>
        </>
      ) : (
        <div className="dashboard-services-empty">
          <PackageCheck size={30} />
          <h3>{tr("No service requests yet")}</h3>
          <p>{tr("Build an event package, then submit it for a personalized quote.")}</p>
          <a className="primary-button" href="/#services">{tr("EXPLORE SERVICES")}</a>
        </div>
      )}
    </section>
  );
}


export default function DashboardPage({ user, serviceRequests = [], onQuoteAction, authToken, activeView = 'draft', onLogout, onProfileSaved, lang }) {
  const ar=lang?.lang==='ar',tr=text=>bookingText(text,ar);
  if(activeView==='overview')activeView='draft';
  if(activeView==='services')activeView='bookings';
  serviceRequests=serviceRequests.map(request=>({...request,journey:clientBookingJourney(request,ar)}));
  const confirmed = serviceRequests.filter(request => request.journey.isBooked);
  return <ClientWorkspace ar={ar} activeKey={['planning','payments'].includes(activeView)?'bookings':activeView} user={user} onLogout={onLogout}>
    {activeView === 'planning' && <section className="cw-panel"><h1>{tr("Event planning")}</h1>{confirmed.length?confirmed.map(request=><article key={request.id}><h2>{request.requestNumber||tr("Your event")}</h2><PlanningForm ar={ar} request={request} onQuoteAction={onQuoteAction}/></article>):<p>{tr("Planning opens after confirmation.")}</p>}</section>}
    {activeView === 'payments' && <section className="cw-panel"><h1>{tr("Payments")}</h1>{confirmed.length?confirmed.map(request=><article key={request.id}><h2>{request.requestNumber||tr("Your event")}</h2><PaymentsBlock ar={ar} request={request} token={authToken}/></article>):<p>{tr("No payments to arrange yet.")}</p>}</section>}
    {activeView === 'profile' && <ClientProfile ar={ar} user={user} token={authToken} onSaved={onProfileSaved} onDeleted={()=>window.location.replace('/login')} />}
    {activeView === 'draft' && <EventDraftCard token={authToken} user={user} ar={ar}/>}
    {activeView === 'conversations' && <BookingConversationHistory token={authToken}/>}
    {activeView === 'bookings' && <RequestedServices requests={serviceRequests} onQuoteAction={onQuoteAction} authToken={authToken} ar={ar} />}
  </ClientWorkspace>;
}
