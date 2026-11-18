import BookingNegotiation from './BookingNegotiation';
import BookingMeetingForm from './BookingMeetingForm';
import {clientBookingJourney} from '../lib/clientBookingJourney';
import { ArrowUpRight, CalendarDays, FileDown, PackageCheck } from 'lucide-react';
import { openBookingConfirmation } from '../lib/bookingConfirmation';
import { useState } from 'react';
import { PaymentsBlock, PlanningForm } from '../echo/ClientExtras';
import ClientProfile from './ClientProfile';
import ClientWorkspace from './ClientWorkspace';
import BookingConversationHistory from './BookingConversationHistory';
import EventDraftCard from './EventDraftCard';
import BookingDraftReview from './BookingDraftReview';

const cadFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
});

const dateTimeFormat = new Intl.DateTimeFormat('en-CA', { dateStyle: 'long', timeStyle: 'short' });

function QuoteActions({ request, onQuoteAction }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (action, body) => {
    setBusy(true);
    setError('');
    try {
      await onQuoteAction(request.id, action, body);
    } catch (e) {
      setError(e.message || 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dashboard-quote-actions">
      {request.journey.awaitingClient && <button type="button" className="primary-button" disabled={busy} onClick={() => run('accept', {quoteRevision:request.quoteRevision||0})}>ACCEPT QUOTE</button>}
      <button type="button" className="secondary-button" disabled={busy} onClick={() => window.confirm('Decline this quote?') && run('decline')}>DECLINE</button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}

function DepositInstructions({ request }) {
  return (
    <div className="dashboard-quote-actions">
      <p>{`Accepted. To confirm your booking and reserve your date, pay the deposit of ${cadFormatter.format(request.deposit)} by e-transfer, cheque or bank transfer (cash is not accepted).`}</p>
      {request.paymentInstructions ? <p>{`How to pay: ${request.paymentInstructions}`}</p> : <p>We will send you the payment details shortly.</p>}
      <p>Your date is confirmed once we record your deposit.</p>
    </div>
  );
}

// Where a request is on its way. The labels, order and current step all come from the server's journey (booking-journey.js).
function StatusSteps({ journey }) {
  if (journey.step === null) return <p className={`dashboard-status-end is-${journey.status}`}>{journey.label}</p>;
  return <ol className="dashboard-status-steps" aria-label={`Status: ${journey.label}`}>{journey.path.map((entry, index) => <li key={entry.status} className={index < journey.step ? 'is-done' : index === journey.step ? 'is-current' : ''} aria-current={index === journey.step ? 'step' : undefined}><i aria-hidden="true">{index < journey.step ? '✓' : index + 1}</i><span>{entry.label}</span></li>)}</ol>;
}

// Saves the booking as a PDF: the browser's print dialog opens on a clean confirmation page ("Save as PDF").
function ExportConfirmation({ request }) {
  const [blocked, setBlocked] = useState(false);
  return <div className="dashboard-export-pdf">
    <button type="button" onClick={() => setBlocked(!openBookingConfirmation(request))}><FileDown size={16} aria-hidden="true" />Export booking as PDF confirmation</button>
    {blocked ? <p role="alert">Your browser blocked the new window. Allow pop-ups for this site and try again.</p> : null}
  </div>;
}

function RequestedServices({ requests, onQuoteAction, authToken }) {
  // Left aside: one card per booking. Right main: the details of the selected booking.
  const [selectedId, setSelectedId] = useState('');
  const selected = requests.find((request) => request.id === selectedId) || requests[0];
  return (
    <section className={`dashboard-services-view${requests.length ? ' is-split' : ''}`} aria-label="Requests and quotes">
      {requests.length ? (
        <>
          <aside className="dashboard-bookings-aside" aria-label="Your bookings">
            <span className="dashboard-bookings-count">{`${requests.length} REQUEST${requests.length === 1 ? '' : 'S'}`}</span>
            <nav>
              {requests.map((request) => (
                <button key={request.id} type="button" aria-current={request.id === selected.id ? 'true' : undefined} onClick={() => setSelectedId(request.id)}>
                  <span className={`dashboard-service-status is-${request.status}`}>{request.journey.label}</span>
                  <strong>{request.requestNumber || (request.journey.awaitingClient ? 'Your quote is ready' : 'Request received')}</strong>
                  <small>{new Date(request.createdAt).toLocaleDateString('en-CA')}</small>
                </button>
              ))}
            </nav>
          </aside>
          <main className="dashboard-bookings-main">
          {[selected].map((request) => (
            <article key={request.id} className="dashboard-service-request">
              <div className="dashboard-service-request-head">
                <div>
                  <span className={`dashboard-service-status is-${request.status}`}>
                    {request.journey.label}
                  </span>
                  <h3>{request.requestNumber || (request.journey.awaitingClient ? 'Your quote is ready' : 'Request received')}</h3>
                  <p>{new Date(request.createdAt).toLocaleDateString('en-CA')}</p>
                </div>
                <small>{request.id}</small>
              </div>

              <StatusSteps journey={request.journey} />
              {request.availabilityAcceptedAt && request.journey.clientNext === 'wait_for_quote' && <p>Availability confirmed. Your prices and deposit details are being prepared.</p>}
              {(request.journey.canRecordDeposit || request.journey.isBooked) && <BookingMeetingForm request={request} token={authToken} />}
              <BookingNegotiation request={request} token={authToken} onQuoteAction={onQuoteAction}/>
              {!request.journey.awaitingClient && request.journey.canNegotiate && <QuoteActions request={request} onQuoteAction={onQuoteAction}/>}
              <ExportConfirmation request={request} />
              {request.order&&<details><summary>Your complete event brief</summary><BookingDraftReview order={request.order} snapshot/></details>}
              <div className="dashboard-service-table">
                <div className="dashboard-service-row dashboard-service-row-head">
                  <span>Service</span>
                  <span>Qty</span>
                  {request.journey.showsPrices ? <span>Unit price</span> : null}
                  {request.journey.showsPrices ? <span>Total</span> : null}
                </div>
                {request.items.map((item) => (
                  <div key={item.serviceId} className="dashboard-service-row">
                    <strong>{item.name}</strong>
                    <span>{item.quantity}</span>
                    {request.journey.showsPrices ? <span>{cadFormatter.format(item.unitPrice)}</span> : null}
                    {request.journey.showsPrices ? <span>{cadFormatter.format(item.lineTotal)}</span> : null}
                  </div>
                ))}
              </div>

              <div className="dashboard-service-request-footer">
                {request.journey.showsPrices ? (
                  <>
                    <p>{request.adminNote || 'Your itemized quote has been prepared.'}</p>
                    <div>
                      <span>Subtotal</span><strong>{cadFormatter.format(request.subtotal)}</strong>
                      {request.discount>0&&<><span>{request.discountType==='percent'?`Discount (${request.discountValue}%)`:'Discount'}</span><strong>−{cadFormatter.format(request.discount)}</strong></>}
                      <span>{`Tax (${request.taxPercent}%)`}</span><strong>{cadFormatter.format(request.tax)}</strong>
                      <span>Quote total</span><strong>{cadFormatter.format(request.total)}</strong>
                      <span>Deposit</span><strong>{cadFormatter.format(request.deposit)}</strong>
                      <span>Remaining balance</span><strong>{cadFormatter.format(request.balance)}</strong>
                    </div>
                    {request.journey.awaitingClient && request.expiresAt ? (
                      <p>{`Valid until ${dateTimeFormat.format(new Date(request.expiresAt))}. A quotation does not guarantee a booking; your date is confirmed after acceptance and deposit payment.`}</p>
                    ) : null}
                    {request.journey.clientNext === 'contact_to_reactivate' ? <p>This quote has expired. Contact us to reactivate it.</p> : null}
                    {request.journey.canRecordDeposit ? <DepositInstructions request={request} /> : null}
                    {request.journey.isBooked ? (
                      <>
                        <p>Booking confirmed.</p>
                        <PaymentsBlock request={request} token={authToken} />
                        <PlanningForm request={request} onQuoteAction={onQuoteAction} />
                      </>
                    ) : null}
                                        {request.journey.awaitingClient ? <QuoteActions request={request} onQuoteAction={onQuoteAction} /> : null}
                  </>
                ) : request.journey.clientNext === 'wait_for_revised_quote' ? (
                  <p>{`We received your change request: "${request.changeRequest}". An updated quote will follow.`}</p>
                ) : request.journey.clientNext === 'none' ? (
                  <p>{request.declinedBy ? 'This request was declined. Thank you for considering Echo Event Entertainment.' : 'This request was cancelled.'}</p>
                ) : (
                  <p>Khalil is reviewing your event plan. Pricing will appear here when the quote is ready.</p>
                )}
              </div>
            </article>
          ))}
          </main>
        </>
      ) : (
        <div className="dashboard-services-empty">
          <PackageCheck size={30} />
          <h3>No service requests yet</h3>
          <p>Build an event package, then submit it for a personalized quote.</p>
          <a className="primary-button" href="/#services">EXPLORE SERVICES</a>
        </div>
      )}
    </section>
  );
}


function EmptyWorkspace({ title, children }) {
  return <div className="cw-panel cw-empty"><CalendarDays size={28} /><h2>{title}</h2><p>{children}</p><a className="primary-button" href="/#event-order">Plan an event <ArrowUpRight size={14} /></a></div>;
}

export default function DashboardPage({ user, serviceRequests = [], onQuoteAction, authToken, activeView = 'overview', onLogout, onProfileSaved }) {
  if(activeView==='services')activeView='bookings';
  serviceRequests=serviceRequests.map(request=>({...request,journey:clientBookingJourney(request)}));
  const confirmed = serviceRequests.filter(request => request.journey.isBooked);
  const ready = serviceRequests.filter(request => request.journey.awaitingClient);
  return <ClientWorkspace activeKey={['planning','payments'].includes(activeView)?'bookings':activeView} user={user} onLogout={onLogout}>
    {activeView === 'planning' && <section className="cw-panel"><h1>Event planning</h1>{confirmed.length?confirmed.map(request=><article key={request.id}><h2>{request.requestNumber||'Your event'}</h2><PlanningForm request={request} onQuoteAction={onQuoteAction}/></article>):<p>Planning opens after confirmation.</p>}</section>}
    {activeView === 'payments' && <section className="cw-panel"><h1>Payments</h1>{confirmed.length?confirmed.map(request=><article key={request.id}><h2>{request.requestNumber||'Your event'}</h2><PaymentsBlock request={request} token={authToken}/></article>):<p>No payments to arrange yet.</p>}</section>}
    {activeView === 'profile' && <ClientProfile user={user} token={authToken} onSaved={onProfileSaved} onDeleted={()=>window.location.replace('/login')} />}
    {activeView === 'overview' && <>
      <header className="cw-heading"><div><h1>{user?.firstName ? 'Welcome, ' + user.firstName + '.' : 'Your event starts here.'}</h1><p>Your plans, quotations, and every detail that makes the night yours.</p></div><a className="primary-button" href="/#event-order">Plan a new event <ArrowUpRight size={14}/></a></header>
      <div className="cw-stats">
        <a className="cw-stat" href="/dashboard/bookings"><span>Event requests</span><strong>{serviceRequests.length}</strong></a>
        <a className="cw-stat" href="/dashboard/bookings"><span>Quotes ready to review</span><strong>{ready.length}</strong></a>
        <a className="cw-stat" href="/dashboard/bookings"><span>Confirmed bookings</span><strong>{confirmed.length}</strong></a>
      </div>
      {serviceRequests.length ? <section className="cw-panel"><h2>Your latest events</h2><p>Follow each request from first idea to confirmed booking.</p>{serviceRequests.slice(0,5).map(request => <a className="cw-event-row" href="/dashboard/bookings" key={request.id}><div><strong>{request.requestNumber || 'Event request'}</strong><small>{request.event?.eventDate || request.eventDate || 'Date to be confirmed'}</small></div><span className="cw-status">{request.journey.label} ↗</span></a>)}</section> : <EmptyWorkspace title="Make room for something unforgettable.">Start with your date and your vision. Your submitted requests and quotations will appear here.</EmptyWorkspace>}
      <section className="cw-panel"><h2>From request to celebration</h2><p>Tell us your plans, review your custom quote, then accept and arrange your deposit. Your booking is confirmed only after our team confirms availability and records payment.</p></section>
    </>}
    {activeView === 'draft' && <EventDraftCard token={authToken}/>}
    {activeView === 'conversations' && <BookingConversationHistory token={authToken}/>}
    {activeView === 'bookings' && <RequestedServices requests={serviceRequests} onQuoteAction={onQuoteAction} authToken={authToken} />}
  </ClientWorkspace>;
}
