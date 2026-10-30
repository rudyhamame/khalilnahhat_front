import { ArrowUpRight, CalendarDays, PackageCheck } from 'lucide-react';
import { useState } from 'react';
import { PaymentsBlock, PlanningForm } from '../echo/ClientExtras';
import ClientWorkspace from './ClientWorkspace';
import BookingConversationHistory from './BookingConversationHistory';
import EventDraftCard from './EventDraftCard';

const cadFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
});

const STATUS_LABELS = {
  pending: 'Quote requested',
  quoted: 'Quote ready',
  accepted: 'Quote accepted',
  changes_requested: 'Changes requested',
  confirmed: 'Booking confirmed',
  expired: 'Expired',
  cancelled: 'Cancelled',
};
const showsPrices = (status) => ['quoted', 'accepted', 'confirmed', 'expired'].includes(status);
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
  const askChanges = () => {
    const message = window.prompt('What changes would you like?');
    if (message?.trim()) run('request-changes', { message: message.trim() });
  };
  return (
    <div className="dashboard-quote-actions">
      <button type="button" className="primary-button" disabled={busy} onClick={() => run('accept')}>ACCEPT QUOTE</button>
      <button type="button" className="secondary-button" disabled={busy} onClick={askChanges}>REQUEST CHANGES</button>
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

function RequestedServices({ requests, onQuoteAction, authToken }) {
  return (
    <section className="dashboard-services-view" aria-labelledby="requested-services-title">
      <EventDraftCard token={authToken}/>
      <div className="dashboard-services-heading">
        <div>
          <p className="section-kicker">Your event</p>
          <h2 id="requested-services-title">Quotes & bookings</h2>
        </div>
        <span>{`${requests.length} REQUEST${requests.length === 1 ? '' : 'S'}`}</span>
      </div>

      {requests.length ? (
        <div className="dashboard-service-request-list">
          {requests.map((request) => (
            <article key={request.id} className="dashboard-service-request">
              <div className="dashboard-service-request-head">
                <div>
                  <span className={`dashboard-service-status is-${request.status}`}>
                    {STATUS_LABELS[request.status] || request.status}
                  </span>
                  <h3>{request.requestNumber || (request.status === 'quoted' ? 'Your quote is ready' : 'Request received')}</h3>
                  <p>{new Date(request.createdAt).toLocaleDateString('en-CA')}</p>
                </div>
                <small>{request.id}</small>
              </div>

              {request.order&&<details><summary>Your complete event brief</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontSize:12}}>{JSON.stringify(request.order,null,2)}</pre></details>}
              <div className="dashboard-service-table">
                <div className="dashboard-service-row dashboard-service-row-head">
                  <span>Service</span>
                  <span>Qty</span>
                  {showsPrices(request.status) ? <span>Unit price</span> : null}
                  {showsPrices(request.status) ? <span>Total</span> : null}
                </div>
                {request.items.map((item) => (
                  <div key={item.serviceId} className="dashboard-service-row">
                    <strong>{item.name}</strong>
                    <span>{item.quantity}</span>
                    {showsPrices(request.status) ? <span>{cadFormatter.format(item.unitPrice)}</span> : null}
                    {showsPrices(request.status) ? <span>{cadFormatter.format(item.lineTotal)}</span> : null}
                  </div>
                ))}
              </div>

              <div className="dashboard-service-request-footer">
                {showsPrices(request.status) ? (
                  <>
                    <p>{request.adminNote || 'Your itemized quote has been prepared.'}</p>
                    <div>
                      <span>Subtotal</span><strong>{cadFormatter.format(request.subtotal)}</strong>
                      <span>{`Tax (${request.taxPercent}%)`}</span><strong>{cadFormatter.format(request.tax)}</strong>
                      <span>Quote total</span><strong>{cadFormatter.format(request.total)}</strong>
                      <span>Deposit</span><strong>{cadFormatter.format(request.deposit)}</strong>
                      <span>Remaining balance</span><strong>{cadFormatter.format(request.balance)}</strong>
                    </div>
                    {request.status === 'quoted' && request.expiresAt ? (
                      <p>{`Valid until ${dateTimeFormat.format(new Date(request.expiresAt))}. A quotation does not guarantee a booking; your date is confirmed after acceptance and deposit payment.`}</p>
                    ) : null}
                    {request.status === 'expired' ? <p>This quote has expired. Contact us to reactivate it.</p> : null}
                    {request.status === 'accepted' ? <DepositInstructions request={request} /> : null}
                    {request.status === 'confirmed' ? (
                      <>
                        <p>Booking confirmed.</p>
                        <PaymentsBlock request={request} token={authToken} />
                        <PlanningForm request={request} onQuoteAction={onQuoteAction} />
                      </>
                    ) : null}
                                        {request.status === 'quoted' ? <QuoteActions request={request} onQuoteAction={onQuoteAction} /> : null}
                  </>
                ) : request.status === 'changes_requested' ? (
                  <p>{`We received your change request: "${request.changeRequest}". An updated quote will follow.`}</p>
                ) : request.status === 'cancelled' ? (
                  <p>This request was cancelled.</p>
                ) : (
                  <p>Khalil is reviewing your event plan. Pricing will appear here when the quote is ready.</p>
                )}
              </div>
            </article>
          ))}
        </div>
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

function EventHeading({ request }) {
  return <><h2>{request.requestNumber || 'Your event'}</h2><p>{request.event?.eventDate || request.eventDate || 'Date to be confirmed'} · {STATUS_LABELS[request.status] || request.status}</p></>;
}

export default function DashboardPage({ user, serviceRequests = [], onQuoteAction, authToken, activeView = 'overview', onLogout }) {
  const [bookingTab,setBookingTab]=useState('quotes');
  const confirmed = serviceRequests.filter(request => request.status === 'confirmed');
  const payable = serviceRequests.filter(request => ['accepted','confirmed'].includes(request.status));
  const ready = serviceRequests.filter(request => request.status === 'quoted');
  return <ClientWorkspace activeKey={activeView} user={user} onLogout={onLogout}>
    {activeView === 'overview' && <>
      <header className="cw-heading"><div><h1>{user?.firstName ? 'Welcome, ' + user.firstName + '.' : 'Your event starts here.'}</h1><p>Your plans, quotations, and every detail that makes the night yours.</p></div><a className="primary-button" href="/#event-order">Plan a new event <ArrowUpRight size={14}/></a></header>
      <div className="cw-stats">
        <a className="cw-stat" href="/dashboard/services"><span>Event requests</span><strong>{serviceRequests.length}</strong></a>
        <a className="cw-stat" href="/dashboard/services"><span>Quotes ready to review</span><strong>{ready.length}</strong></a>
        <a className="cw-stat" href="/dashboard/planning"><span>Confirmed bookings</span><strong>{confirmed.length}</strong></a>
      </div>
      {serviceRequests.length ? <section className="cw-panel"><h2>Your latest events</h2><p>Follow each request from first idea to confirmed booking.</p>{serviceRequests.slice(0,5).map(request => <a className="cw-event-row" href="/dashboard/services" key={request.id}><div><strong>{request.requestNumber || 'Event request'}</strong><small>{request.event?.eventDate || request.eventDate || 'Date to be confirmed'}</small></div><span className="cw-status">{STATUS_LABELS[request.status] || request.status} ↗</span></a>)}</section> : <EmptyWorkspace title="Make room for something unforgettable.">Start with your date and your vision. Your submitted requests and quotations will appear here.</EmptyWorkspace>}
      <section className="cw-panel"><h2>From request to celebration</h2><p>Tell us your plans, review your custom quote, then accept and arrange your deposit. Your booking is confirmed only after our team confirms availability and records payment.</p></section>
    </>}
    {activeView === 'services' && <><div className="cw-booking-tabs" role="group" aria-label="Quotes and conversation views"><button type="button" aria-pressed={bookingTab==='quotes'} onClick={()=>setBookingTab('quotes')}>Quotes & bookings</button><button type="button" aria-pressed={bookingTab==='conversations'} onClick={()=>setBookingTab('conversations')}>Conversation history</button></div>{bookingTab==='conversations'?<BookingConversationHistory token={authToken}/>:<RequestedServices requests={serviceRequests} onQuoteAction={onQuoteAction} authToken={authToken} />}</>}
    {activeView === 'planning' && <><header className="cw-heading"><div><h1>Every detail, in sync.</h1><p>Save your timeline, music preferences, and special requests for confirmed events.</p></div></header>{confirmed.length ? confirmed.map(request => <section className="cw-panel" key={request.id}><EventHeading request={request}/><PlanningForm request={request} onQuoteAction={onQuoteAction}/></section>) : <EmptyWorkspace title="Planning opens after confirmation.">Once your booking is confirmed, you can share your timeline, must-play songs, and all the little details here.</EmptyWorkspace>}</>}
    {activeView === 'payments' && <><header className="cw-heading"><div><h1>Payments & receipts</h1><p>Payment instructions and recorded payments for your accepted quotations and confirmed bookings.</p></div></header>{payable.length ? payable.map(request => <section className="cw-panel" key={request.id}><EventHeading request={request}/>{request.status === 'accepted' ? <DepositInstructions request={request}/> : <PaymentsBlock request={request} token={authToken}/>}</section>) : <EmptyWorkspace title="No payments to arrange yet.">Accept a quotation first. Payment instructions and receipts will then appear here as your booking progresses.</EmptyWorkspace>}</>}
  </ClientWorkspace>;
}
