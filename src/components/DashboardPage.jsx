import MeetingPage from '../echo/MeetingPage';
import BookingPageHeader from './BookingPageHeader';
import BookingCardSummary from './BookingCardSummary';
import {customerNameParts} from '../lib/eventOrderCore.mjs';
import BookingRequestList from './BookingRequestList';
import BookingStatusPipeline from './BookingStatusPipeline';
import BookingQuoteEditor from './BookingQuoteEditor';
import './adminBookingRequests.css';
import './clientBookingRequests.css';
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
  return <BookingStatusPipeline request={request} ar={ar} audience="client" renderStepExtra={(key,index,current)=><>
    {index<=current&&when(key)&&<small>{when(key)}</small>}
    {key==='requested'&&(journey.modified||request.modifications?.length>0)&&<ul className="dashboard-status-modifications">{(request.modifications?.length?request.modifications:[{at:request.modifiedAt}]).map((entry,n)=><li key={`${entry.at}-${n}`} className={entry.undone?'is-undone':''}><b>{tr('Booking modified')}</b>{entry.at&&<small>{new Intl.DateTimeFormat(bookingLocale(ar),{dateStyle:'medium',timeStyle:'short'}).format(new Date(entry.at))}</small>}{entry.canUndo&&<button type="button" onClick={()=>onUndo(n)}>{tr('Undo modification')}</button>}</li>)}</ul>}
  </>}/>;
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
    <button type="button" className="dashboard-booking-menu-toggle" aria-label={tr("Booking actions")} aria-haspopup="menu" aria-expanded={open} onClick={() => { setOpen(!open); setError(''); }}><EllipsisVertical size={18} strokeWidth={2} aria-hidden="true" /></button>
    {open && <div className="dashboard-booking-menu-list" role="menu">
      {canWithdraw && <button type="button" role="menuitem" disabled={busy} onClick={withdraw}><Undo2 size={16} aria-hidden="true" />{tr("Withdraw")}</button>}
      <button type="button" role="menuitem" onClick={download}><FileDown size={16} aria-hidden="true" />{tr("Download booking information")}</button>
      {error ? <p role="alert">{error}</p> : null}
    </div>}
  </div>;
}

function RequestedServices({requests,onQuoteAction,authToken,ar=false}){
 const tr=text=>bookingText(text,ar);
 const [selectedId,setSelectedId]=useState(()=>typeof window==='undefined'?'':new URLSearchParams(window.location.search).get('booking')||'');
 const request=requests.find(request=>request.id===selectedId)||requests[0];
 const [bookingTab,setBookingTab]=useState('details');
 const activeTab=bookingTab==='quote'&&request?.journey.showsPrices?'quote':'details';
 const draft=request?{items:request.items||[],prices:Object.fromEntries((request.items||[]).map(item=>[item.serviceId,item.unitPrice??0])),discountType:request.discountType||'amount',discountValue:request.discountValue||0,taxPercent:request.taxPercent??0,depositAmount:request.deposit||0,depositType:'amount',validDays:request.validDays||7,adminNote:request.adminNote||'',paymentInstructions:request.paymentInstructions||'',paymentOptions:request.paymentOptions||[],etransferEmail:request.etransferEmail||''}:null;
 const totals=request?{subtotal:request.subtotal||0,discount:request.discount||0,tax:request.tax||0,total:request.total||0,deposit:request.deposit||0,balance:request.balance??Math.max(0,(request.total||0)-(request.deposit||0))}:null;
 return <section className="client-booking-requests" aria-label={tr('Requests and quotes')}><BookingPageHeader ar={ar} idPrefix="client-booking" value={activeTab} onChange={setBookingTab} hasBooking={Boolean(request)} hasQuote={Boolean(request?.journey.showsPrices)}/><div className="admin-booking-layout">
  <BookingRequestList requests={requests} selectedId={request?.id} onSelect={id=>{setSelectedId(id);setBookingTab('details');}} ar={ar} detailId="client-booking-detail"/>
  <section id="client-booking-detail" className="admin-booking-detail-column" aria-labelledby="client-booking-detail-title">
   <header className="admin-booking-detail-heading"><div className="booking-detail-title"><h2 id="client-booking-detail-title">{tr(activeTab==='quote'?'Quote':'Booking details')}</h2>{request&&<span>{request.requestNumber||request.id}</span>}</div>{request&&<div className="booking-publish-action"><BookingMenu ar={ar} request={request} onQuoteAction={onQuoteAction}/></div>}</header>
   {request?<div key={request.id} className="admin-booking-detail-body" data-view={activeTab} data-quote={request.journey.showsPrices?'on':'off'}>
    <article className="admin-service-request-card" role="tabpanel" id="client-booking-details-panel" aria-labelledby="client-booking-details-tab" tabIndex={0} hidden={activeTab!=='details'}>
     <header className="booking-column-heading"><h3>{tr('Booking details')}</h3></header>
     <header className="booking-brief-heading booking-summary" aria-label={tr('Booking summary')}>
      <StatusSteps request={request} journey={request.journey} ar={ar} onUndo={async index=>{if(!window.confirm(tr('Undo this modification?')))return;try{await onQuoteAction(request.id,'undo-modification',{index});}catch(error){window.alert(error.message||tr('Action failed.'));}}}/>
      <div className="booking-summary-main"><div className="booking-summary-who"><h3>{request.customerName||tr('Your event')}</h3><span className={`admin-service-request-status is-${request.status}`}>{request.journey.label}</span>{request.customerEmail&&<a href={`mailto:${request.customerEmail}`}>{request.customerEmail}</a>}</div><div className="booking-summary-foot"><div><span>{tr('Booking code')}</span><code>{request.requestNumber||request.id}</code></div></div>
       <ClientAvailabilityNotice request={request} onQuoteAction={onQuoteAction} token={authToken} ar={ar}/>
       {!request.journey.showsPrices&&<p>{request.journey.clientNext==='wait_for_revised_quote'?(ar?'استلمنا طلب التعديل. سيصلك عرض سعر محدّث.':'We received your change request. An updated quote will follow.'):request.journey.clientNext==='none'?(request.declinedBy?tr('This request was declined. Thank you for considering Echo Event Entertainment.'):tr('This request was cancelled.')):tr('Khalil is reviewing your event plan. Pricing will appear here when the quote is ready.')}</p>}
      </div>
     </header>
     <div className="booking-detail-sections">{request.order?<BookingDraftReview order={{...request.order,customer:{...request.order.customer,...customerNameParts({...request.order.customer,fullName:request.order.customer?.fullName||request.customerName}),email:request.order.customer?.email||request.customerEmail}}} snapshot ar={ar}/>:<section className="booking-detail-section is-wide"><h4>{tr('Booking details')}</h4><BookingCardFallback request={request} ar={ar}/></section>}</div>
     <section className="booking-detail-section is-wide client-booking-meeting-invite"><h4>{ar?'هل ترغب في الاجتماع معنا؟':'Want to meet with us?'}</h4><p>{ar?<>استخدم قسم <a href="/dashboard/meetings">لقاء إيكو</a> لحجز جلسة لمناقشة حجزك بمزيد من التفاصيل.</>:<>Use the <a href="/dashboard/meetings">Meet Echo</a> tab to book a session to discuss your booking further.</>}</p></section>
     {!request.journey.showsPrices&&request.items?.length>0&&<section className="booking-detail-section is-wide"><h4>{tr('Rental services & equipment')}</h4><ul>{request.items.map(item=><li key={item.serviceId}>{item.name} × {item.quantity}</li>)}</ul></section>}
     {!request.journey.showsPrices&&(request.journey.awaitingClient||request.journey.canNegotiate)&&<BookingNegotiation ar={ar} request={request} token={authToken} onQuoteAction={onQuoteAction}/>}
     {(request.journey.canRecordDeposit||request.journey.isBooked)&&<BookingMeetingForm ar={ar} request={request} token={authToken}/>}
     {request.journey.isBooked&&<><PaymentsBlock ar={ar} request={request} token={authToken}/><PlanningForm ar={ar} request={request} onQuoteAction={onQuoteAction}/></>}
    </article>
    {request.journey.showsPrices&&<aside className="booking-conversation-aside booking-quote-aside" aria-label={tr('Quote')} role="tabpanel" id="client-booking-quote-panel" aria-labelledby="client-booking-quote-tab" tabIndex={0} hidden={activeTab!=='quote'}><header className="booking-column-heading booking-quote-heading"><h3>{tr('Quote')}</h3><QuoteActions ar={ar} request={request} onQuoteAction={onQuoteAction}/></header><div className="booking-quote-panel"><BookingQuoteEditor request={request} draft={draft} totals={totals} ar={ar} editable={false}/>{(request.journey.awaitingClient||request.journey.canNegotiate)&&<BookingNegotiation ar={ar} request={request} token={authToken} onQuoteAction={onQuoteAction}/>}{request.journey.canRecordDeposit&&<DepositInstructions request={request} ar={ar}/>}<p className="client-quote-validity">{request.journey.awaitingClient&&request.expiresAt?(ar?'صالح حتى ':'Valid until ')+new Intl.DateTimeFormat(bookingLocale(ar),{dateStyle:'long',timeStyle:'short'}).format(new Date(request.expiresAt)):''}</p>{request.journey.clientNext==='contact_to_reactivate'&&<p>{tr('This quote has expired. Contact us to reactivate it.')}</p>}</div></aside>}
   </div>:<div className="admin-services-empty"><PackageCheck size={30}/><h3>{tr('No service requests yet')}</h3><p>{tr('Build an event package, then submit it for a personalized quote.')}</p><a className="primary-button" href="/booking">{tr('EXPLORE SERVICES')}</a></div>}
  </section>
 </div></section>;
}
function BookingCardFallback({request,ar}){
 return <BookingCardSummary request={request} ar={ar}/>;
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
    {activeView === 'meetings' && <MeetingPage embedded lang={{lang:ar?'ar':'en'}} user={user} token={authToken} isSessionReady/>}
    {activeView === 'profile' && <ClientProfile ar={ar} user={user} token={authToken} onSaved={onProfileSaved} onDeleted={()=>window.location.replace('/login')} />}
    {activeView === 'draft' && <EventDraftCard token={authToken} user={user} ar={ar}/>}
    {activeView === 'conversations' && <BookingConversationHistory token={authToken}/>}
    {activeView === 'bookings' && <RequestedServices requests={serviceRequests} onQuoteAction={onQuoteAction} authToken={authToken} ar={ar} />}
  </ClientWorkspace>;
}
