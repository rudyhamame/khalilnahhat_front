import MeetingPage from '../echo/MeetingPage';
import CallChatPanel from '../echo/CallChatPanel';
import BookingContactPage from './BookingContactPage';
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
import {clientBookingJourney} from '../lib/clientBookingJourney';
import { EllipsisVertical, FileDown, PackageCheck, Undo2 } from 'lucide-react';
import { openBookingConfirmation } from '../lib/bookingConfirmation';
import { useEffect, useRef, useState } from 'react';
import { PaymentsBlock, PlanningForm } from '../echo/ClientExtras';
import ClientProfile from './ClientProfile';
import ClientWorkspace from './ClientWorkspace';
import BookingConversationHistory from './BookingConversationHistory';
import BookingDraftReview from './BookingDraftReview';
import BookingFiles from './BookingFiles';
import BookingReceiptNotice from '../echo/BookingReceiptNotice';
import '../echo/bookingConfirmation.css';





function QuoteActions({ request, onQuoteAction, ar=false, pill=false }) {
  const tr=text=>bookingText(text,ar);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!request.journey.awaitingClient) {
    // The pill stays split after the client has decided: the right half says what they did (no button, there is nothing left to accept).
    if (!pill || request.journey.isBooked) return null;
    const done = request.journey.branches?.decisions?.filter((item) => item.reached) || [];
    if (done.some((item) => item.canUndo && item.status === 'quote_accepted') || done.some((item) => item.status === 'quote_accepted')) return <span className="booking-heading-accept is-done">✓ {tr("QUOTE ACCEPTED")}</span>;
    if (done.length) return <span className="booking-heading-accept is-wait">{tr("OFFER SENT")}</span>;
    return null;
  }
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
  if (pill) return <button type="button" className="booking-heading-accept" disabled={busy} onClick={accept} title={error||undefined}>{tr("ACCEPT QUOTE")}</button>;
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
function StatusSteps({ journey, request, ar=false, onUndo, onClientStep }) {
  if (journey.step === null && !journey.branches?.cancelled) return <p className={`dashboard-status-end is-${journey.status}`}>{journey.label}</p>;
  return <BookingStatusPipeline request={request} ar={ar} audience="client" onUndo={onUndo} onClientStep={onClientStep}/>;
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
  const canWithdraw = request.journey.clientCancellable; // the client can cancel at any step before the booking is closed
  const withdraw = async () => {
    if (!window.confirm(request.journey.awaitingClient ? tr("Decline this quote?") : tr("Cancel this booking?"))) return;
    setBusy(true); setError('');
    try { await onQuoteAction(request.id, 'decline'); setOpen(false); } catch (e) { setError(e.message || tr("Action failed.")); } finally { setBusy(false); }
  };
  const download = () => { if (!openBookingConfirmation(request,{ar})) setError(tr("Your browser blocked the new window. Allow pop-ups for this site and try again.")); else setOpen(false); };
  return <div className="dashboard-booking-menu" ref={box}>
    <button type="button" className="dashboard-booking-menu-toggle" aria-label={tr("Booking actions")} aria-haspopup="menu" aria-expanded={open} onClick={() => { setOpen(!open); setError(''); }}><EllipsisVertical size={18} strokeWidth={2} aria-hidden="true" /></button>
    {open && <div className="dashboard-booking-menu-list" role="menu">
      {canWithdraw && <button type="button" role="menuitem" disabled={busy} onClick={withdraw}><Undo2 size={16} aria-hidden="true" />{tr("Cancel booking")}</button>}
      <button type="button" role="menuitem" onClick={download}><FileDown size={16} aria-hidden="true" />{tr("Download booking information")}</button>
      {error ? <p role="alert">{error}</p> : null}
    </div>}
  </div>;
}

function RequestedServices({requests,onQuoteAction,authToken,ar=false}){
 const tr=text=>bookingText(text,ar);
 const [selectedId,setSelectedId]=useState(()=>typeof window==='undefined'?'':new URLSearchParams(window.location.search).get('booking')||'');
 const request=requests.find(request=>request.id===selectedId)||requests[0];
 const [portrait,setPortrait]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(orientation: portrait)').matches);
 useEffect(()=>{const query=window.matchMedia('(orientation: portrait)'),update=()=>setPortrait(query.matches);update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);
 const [bookingTab,setBookingTab]=useState('details');
 const activeTab=bookingTab==='files'&&request?'files':bookingTab==='quote'&&request?.journey.showsPrices?'quote':'details';
 const draft=request?{items:request.items||[],prices:Object.fromEntries((request.items||[]).map(item=>[item.serviceId,item.unitPrice??0])),discountType:request.discountType||'amount',discountValue:request.discountValue||0,taxPercent:request.taxPercent??0,depositAmount:request.deposit||0,depositType:'amount',validDays:request.validDays||7,adminNote:request.adminNote||'',paymentInstructions:request.paymentInstructions||'',paymentOptions:request.paymentOptions||[],etransferEmail:request.etransferEmail||''}:null;
 const totals=request?{subtotal:request.subtotal||0,discount:request.discount||0,tax:request.tax||0,total:request.total||0,deposit:request.deposit||0,balance:request.balance??Math.max(0,(request.total||0)-(request.deposit||0))}:null;
 return <section className="client-booking-requests" aria-label={tr('Requests and quotes')}><BookingPageHeader ar={ar} idPrefix="client-booking" value={activeTab} onChange={setBookingTab} hasBooking={Boolean(request)} hasQuote={Boolean(request?.journey.showsPrices)}/>{portrait&&request&&<div className="client-booking-contact-launch"><a className="primary-button" href={`/dashboard/bookings/contact?booking=${encodeURIComponent(request.id)}`}>{ar?'الدردشة والمكالمات':'Chat & calls'}</a></div>}<div className="admin-booking-layout">
  <BookingRequestList requests={requests} selectedId={request?.id} onSelect={id=>{setSelectedId(id);setBookingTab('details');}} ar={ar} detailId="client-booking-detail"/>
  <section id="client-booking-detail" className="admin-booking-detail-column" aria-labelledby="client-booking-detail-title">
   <header className="admin-booking-detail-heading"><div className="booking-detail-title"><h2 id="client-booking-detail-title">{tr(activeTab==='quote'?'Quote':activeTab==='files'?'Shared files':'Booking details')}</h2>{request&&<span>{request.requestNumber||request.id}</span>}</div>{request&&<div className="booking-publish-action"><span className="booking-heading-pill"><span className={`booking-heading-status is-${request.status}`}>{request.journey.label}</span><QuoteActions pill ar={ar} request={request} onQuoteAction={onQuoteAction}/></span><BookingMenu ar={ar} request={request} onQuoteAction={onQuoteAction}/></div>}</header>
   {request?<div key={request.id} className="admin-booking-detail-body" data-view={activeTab} data-quote={request.journey.showsPrices?'on':'off'}>
    <article className="admin-service-request-card" role="tabpanel" id="client-booking-details-panel" aria-labelledby="client-booking-details-tab" tabIndex={0} hidden={activeTab!=='details'}>
     <div className="client-booking-identity"><div className="booking-summary-who"><h3>{request.customerName||tr('Your event')}</h3>{request.customerEmail&&<a href={`mailto:${request.customerEmail}`}>{request.customerEmail}</a>}</div><div className="booking-summary-foot"><div><span>{tr('Booking code')}</span><code>{request.requestNumber||request.id}</code></div></div></div>
     <header className="booking-column-heading"><h3>{tr('Booking details')}</h3></header>
     <header className="booking-brief-heading booking-summary" aria-label={tr('Booking summary')}>
      <StatusSteps request={request} journey={request.journey} ar={ar} onClientStep={async to=>{if(!window.confirm(to==='restore'?tr('Restore this booking?'):tr('Go back to the quote decision?')))return;try{await onQuoteAction(request.id,'client-step-back',{to,quoteRevision:request.quoteRevision||0});}catch(error){window.alert(error.message||tr('Action failed.'));}}} onUndo={async index=>{if(!window.confirm(tr('Undo this modification?')))return;try{await onQuoteAction(request.id,'undo-modification',{index});}catch(error){window.alert(error.message||tr('Action failed.'));}}}/>
      <div className="booking-summary-main">
       <ClientAvailabilityNotice request={request} onQuoteAction={onQuoteAction} token={authToken} ar={ar}/>
       {!request.journey.showsPrices&&['wait_for_revised_quote','none'].includes(request.journey.clientNext)&&<p>{request.journey.clientNext==='wait_for_revised_quote'?(ar?'استلمنا طلب التعديل. سيصلك عرض سعر محدّث.':'We received your change request. An updated quote will follow.'):request.journey.clientNext==='none'?(request.declinedBy?tr('This request was declined. Thank you for considering Echo Event Entertainment.'):tr('This request was cancelled.')):null}</p>}
      </div>
     </header>
     <div className="booking-detail-sections">{request.order?<BookingDraftReview stepped order={{...request.order,customer:{...request.order.customer,...customerNameParts({...request.order.customer,fullName:request.order.customer?.fullName||request.customerName}),email:request.order.customer?.email||request.customerEmail}}} snapshot ar={ar} edit={request.journey.step!==null?{onSave:(path,value,acknowledgeReset)=>onQuoteAction(request.id,'order-edit',{path,value,quoteRevision:request.quoteRevision,acknowledgeReset})}:null}/>:<section className="booking-detail-section is-wide"><h4>{tr('Booking details')}</h4><BookingCardFallback request={request} ar={ar}/></section>}</div>
     {!request.journey.showsPrices&&request.items?.length>0&&<section className="booking-detail-section is-wide"><h4>{tr('Rental services & equipment')}</h4><ul>{request.items.map(item=><li key={item.serviceId}>{item.name} × {item.quantity}</li>)}</ul></section>}
     {!request.journey.showsPrices&&(request.journey.awaitingClient||request.journey.canNegotiate)&&<BookingNegotiation ar={ar} request={request} token={authToken} onQuoteAction={onQuoteAction}/>}
     {request.journey.isBooked&&<><PaymentsBlock ar={ar} request={request} token={authToken}/><PlanningForm ar={ar} request={request} onQuoteAction={onQuoteAction}/></>}
    </article>
    <section className="booking-files-panel" role="tabpanel" id="client-booking-files-panel" aria-labelledby="client-booking-files-tab" tabIndex={0} hidden={activeTab!=='files'}>{activeTab==='files'&&<BookingFiles requestId={request.id} token={authToken} ar={ar}/>}</section>
    {request.journey.showsPrices&&<aside className="booking-conversation-aside booking-quote-aside" aria-label={tr('Quote')} role="tabpanel" id="client-booking-quote-panel" aria-labelledby="client-booking-quote-tab" tabIndex={0} hidden={activeTab!=='quote'}><div className="booking-quote-panel"><BookingQuoteEditor request={request} draft={draft} totals={totals} ar={ar} editable={false}/>{(request.journey.awaitingClient||request.journey.canNegotiate)&&<BookingNegotiation ar={ar} request={request} token={authToken} onQuoteAction={onQuoteAction}/>}{request.journey.canRecordDeposit&&<DepositInstructions request={request} ar={ar}/>}{request.journey.clientNext==='contact_to_reactivate'&&<p>{tr('This quote has expired. Contact us to reactivate it.')}</p>}</div></aside>}
    {!portrait&&<aside className="client-booking-contact-aside" dir={ar?'rtl':'ltr'} aria-label={ar?'التواصل مع خليل':'Chat and calls with Khalil'}><CallChatPanel key={request.id} bookingId={request.id} token={authToken} ar={ar}/></aside>}
   </div>:<div className="admin-services-empty client-booking-empty"><span className="client-booking-empty-mark"><PackageCheck size={30} aria-hidden="true"/></span><h3>{tr('No service requests yet')}</h3><p>{tr('Build an event package, then submit it for a personalized quote.')}</p><a className="primary-button" href="/booking">{tr('EXPLORE SERVICES')}</a></div>}
  </section>
 </div></section>;
}
function BookingCardFallback({request,ar}){
 return <BookingCardSummary request={request} ar={ar}/>;
}


export default function DashboardPage({ user, serviceRequests = [], onQuoteAction, authToken, activeView = 'bookings', bookingId='', onLogout, onProfileSaved, lang }) {
  const ar=lang?.lang==='ar',tr=text=>bookingText(text,ar);
  if(activeView==='overview'||activeView==='draft')activeView='bookings';
  if(activeView==='services')activeView='bookings';
  serviceRequests=serviceRequests.map(request=>({...request,journey:clientBookingJourney(request,ar)}));
  const confirmed = serviceRequests.filter(request => request.journey.isBooked);
  return <ClientWorkspace ar={ar} activeKey={['planning','payments','contact'].includes(activeView)?'bookings':activeView} user={user} onLogout={onLogout}>
    {activeView === 'planning' && <section className="cw-panel"><h1>{tr("Event planning")}</h1>{confirmed.length?confirmed.map(request=><article key={request.id}><h2>{request.requestNumber||tr("Your event")}</h2><PlanningForm ar={ar} request={request} onQuoteAction={onQuoteAction}/></article>):<p>{tr("Planning opens after confirmation.")}</p>}</section>}
    {activeView === 'payments' && <section className="cw-panel"><h1>{tr("Payments")}</h1>{confirmed.length?confirmed.map(request=><article key={request.id}><h2>{request.requestNumber||tr("Your event")}</h2><PaymentsBlock ar={ar} request={request} token={authToken}/></article>):<p>{tr("No payments to arrange yet.")}</p>}</section>}
    {activeView === 'contact' && <BookingContactPage requests={serviceRequests} bookingId={bookingId} token={authToken} ar={ar}/> }
    {activeView === 'meetings' && <MeetingPage embedded lang={{lang:ar?'ar':'en'}} user={user} token={authToken} isSessionReady/>}
    {activeView === 'profile' && <ClientProfile ar={ar} user={user} token={authToken} onSaved={onProfileSaved} onDeleted={()=>window.location.replace('/login')} />}
    {activeView === 'conversations' && <BookingConversationHistory token={authToken}/>}
    {activeView === 'bookings' && <BookingReceiptNotice ar={ar}/>}
    {activeView === 'bookings' && <RequestedServices requests={serviceRequests} onQuoteAction={onQuoteAction} authToken={authToken} ar={ar} />}
  </ClientWorkspace>;
}
