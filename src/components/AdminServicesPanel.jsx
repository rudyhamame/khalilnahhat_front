import journeyContract from '../lib/bookingJourneyContract.json' with {type:'json'};
import BookingCardSummary from './BookingCardSummary';
import {UnavailableReasonDialog} from './BookingAvailability';
import BookingQuoteEditor from './BookingQuoteEditor';
import {adminStatusLabel} from '../lib/clientBookingJourney';
import {bookingText,bookingLocale,bookingMoney} from '../lib/bookingUiText';
import BookingDraftReview from './BookingDraftReview';
import {OfferReview} from './BookingNegotiation';
import {quoteTotals} from '../lib/quoteTotals.mjs';
import {useTree} from '../lib/tree';
import {quoteLineName} from '../lib/quoteAtoms';
import {mapsLink} from '../lib/mapsLink';
import VenueDistance from './VenueDistance';
import {fieldName as bookingFieldName,optionName,customerNameParts} from '../lib/eventOrderCore.mjs';
import {musicAtoms} from '../lib/musicAtoms.mjs';
import './adminBookingRequests.css';
import '../echo/eaAtomCode.css';
import AdminSelect from './AdminSelect';
import BookingDraftConversation from './BookingDraftConversation';
import { Send, MapPin, Undo2, Check, MoreHorizontal, Ban, Trash2 } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useEffect, useMemo, useState } from 'react';
import {createMailApi} from '../echo/mail/mailApi';
import {useMailboxDraft} from '../echo/mail/useMailboxDraft';
import MailComposer from '../echo/mail/MailComposer';
import '../echo/adminEmail.css';



const clock12=value=>{const m=/^(\d{1,2}):(\d{2})/.exec(value||'');if(!m)return value||'';const h=Number(m[1]);return `${h%12||12}:${m[2]} ${h<12?'AM':'PM'}`;};
const readable=value=>String(value||'').replaceAll('_',' ').replace(/^./,char=>char.toUpperCase());
const eventDate=(value,ar=false)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return value||'Date not provided';return new Intl.DateTimeFormat(bookingLocale(ar),{dateStyle:'medium',timeZone:'America/Toronto'}).format(new Date(value+'T12:00:00-05:00'));};
const eventTime=value=>{const match=/^(\d{2}):(\d{2})$/.exec(value||'');if(!match)return value||'—';const hour=Number(match[1]);return `${hour%12||12}:${match[2]} ${hour>=12?'PM':'AM'}`;};


const hasDetail=value=>value!==null&&value!==undefined&&value!==''&&(!Array.isArray(value)||value.length>0);
const detailText=value=>typeof value==='boolean'?(value?'Yes':'No'):Array.isArray(value)?(value.every(item=>typeof item==='string')?value.map(readable).join(', '):value):value;
function bookingSections(request,ar=false) {
  const order=request.order||{},legacy=request.event||{},event=order.event||{},venue=event.venue||{},customer=order.customer||{},music=order.music||{},prefs=musicAtoms({order});
  const fieldName=key=>bookingFieldName(key,ar);
  const names=customerNameParts({...customer,fullName:customer.fullName??request.customerName});
  const start=event.startTime??legacy.startTime,end=event.endTime??legacy.endTime;
  const services=order.services??legacy.services??[];
  const files=items=>Array.isArray(items)&&items.length?items.filter(item=>{try{return new URL(item?.url).protocol==='https:';}catch{return false;}}).map((item,index)=><a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer">{item.name||`File ${index+1}`}</a>):null;
  const references=(items,label)=>Array.isArray(items)&&items.length?items.filter(url=>{try{return new URL(url).protocol==='https:';}catch{return false;}}).map((url,index)=><a key={url} href={url} target="_blank" rel="noopener noreferrer">{label} {index+1}</a>):null;
  const sections=[
    {title:'Event overview',required:true,rows:[[fieldName('event.type'),readable(event.type??legacy.eventType)],[fieldName('event.guestCount'),event.guestCount??legacy.guests],['Services',services.map(value=>optionName('services',value)).join(', ')],['Equipment rental',order.rental?.requested]]},
    {title:'Date & schedule',required:true,rows:[[fieldName('event.date'),hasDetail(event.date??legacy.eventDate)?eventDate(event.date??legacy.eventDate,ar):null],[fieldName('event.startTime'),start?eventTime(start):null],[fieldName('event.endTime'),end?`${eventTime(end)}${start&&end<start?' · next day':''}`:null],['Time zone',event.timezone||'America/Toronto']]},
    {title:'Venue & setup',required:true,rows:[[fieldName('event.venue.name'),venue.name??legacy.venueName],[fieldName('event.venue.address'),venue.address??legacy.venueAddress],[fieldName('event.venue.city'),venue.city??legacy.city],[fieldName('event.venue.postalCode'),venue.postalCode??legacy.postalCode],[fieldName('event.venue.country'),venue.country],[fieldName('event.venue.setting'),venue.setting?readable(venue.setting):typeof legacy.indoor==='boolean'?(legacy.indoor?'Indoor':'Outdoor'):null],[fieldName('event.venue.addressDetails'),venue.addressDetails],[fieldName('event.setup.requirements'),event.setup?.requirements??legacy.setupRequirements]]},
    {title:'Client & contact',required:true,rows:[[fieldName('customer.firstName'),names.firstName],[fieldName('customer.lastName'),names.lastName],[fieldName('customer.email'),customer.email??request.customerEmail],[fieldName('customer.phone'),customer.phone??legacy.phone],[fieldName('customer.contactMethod'),readable(customer.contactMethod??legacy.contactMethod)],[fieldName('customer.phoneContact'),customer.phoneContact?optionName('customer.phoneContact',customer.phoneContact):null],[fieldName('customer.company'),customer.company??legacy.company]]},
    {title:'DJ & MC services',rows:[[fieldName('music.djRequested'),music.djRequested],[fieldName('music.mcRequested'),music.mcRequested]]},
    {title:'Music preferences',rows:[[fieldName('music.languagePairs'),prefs.languages.map(item=>item.dialects.length?`${item.language} (${item.dialects.join(', ')})`:item.language).join('; ')||null],[fieldName('music.genres'),prefs.genres.join(', ')||null],[fieldName('music.suggestedSongs'),prefs.moments.map(row=>[row.moment,[row.title,row.artist].filter(Boolean).join(' — ')].filter(Boolean).join(': ')).join('; ')||null],[fieldName('music.favouriteSongs'),prefs.favourites.map(row=>[row.title,row.artist].filter(Boolean).join(' — ')).join('; ')||null],[fieldName('music.favouriteArtists'),prefs.artists.join(', ')||null]]},
    {title:"References & notes",wide:true,rows:[[fieldName('references.photos'),files(order.references?.photos)],[fieldName('references.images'),references(order.references?.images,'Photo link')],[fieldName('references.files'),files(order.references?.files)],[fieldName('additional.notes'),order.additional?.notes??legacy.notes],[fieldName('additional.voucherCode'),order.additional?.voucherCode],["Requested changes",request.changeRequest]]},
    {title:"Event planning",wide:true,rows:['brideName','groomName','timeline','partyEntrances','entranceSongs','firstDance','parentDances','dinnerMusic','cakeCutting','announcements','mustPlay','doNotPlay','specialRequests'].map(key=>[fieldName('planning.'+key),order.planning?.[key]])},
  ];
  return sections.map(section=>({...section,rows:section.rows.filter(([,value])=>hasDetail(value))})).filter(section=>section.required||section.rows.length);
}

function buildDraft(request, currentDraft, defaults) {
  if(currentDraft?.quoteRevision!==(request.quoteRevision||0))currentDraft=null;
  // A quote that has not been published starts from the administrator's saved default terms; a published one keeps its own.
  const terms=!request.quotedAt&&defaults&&Object.keys(defaults).length?defaults:request;
  return {
    quoteRevision:request.quoteRevision||0,
    proposalRevision:currentDraft?.proposalRevision,
    items:currentDraft?.items||request.items,
    adminNote: currentDraft?.adminNote ?? request.adminNote ?? '',
    validDays: currentDraft?.validDays ?? terms.validDays ?? 7,
    taxPercent: currentDraft?.taxPercent ?? request.taxPercent ?? 13,
    discountType: currentDraft?.discountType ?? request.discountType ?? 'amount',
    discountValue: currentDraft?.discountValue ?? request.discountValue ?? 0,
    depositAmount: currentDraft?.depositAmount ?? request.deposit ?? 0,
    depositType: currentDraft?.depositType ?? 'amount',
    depositPercent: currentDraft?.depositPercent ?? '',
    paymentInstructions: currentDraft?.paymentInstructions ?? terms.paymentInstructions ?? '',
    paymentOptions: currentDraft?.paymentOptions ?? terms.paymentOptions ?? [],
    etransferEmail: currentDraft?.etransferEmail ?? terms.etransferEmail ?? '',
    prices: Object.fromEntries(
      (currentDraft?.items||request.items).map((item) => [
        item.serviceId,
        currentDraft?.prices?.[item.serviceId] ?? (item.unitPrice ?? item.defaultUnitPrice ?? ''),
      ]),
    ),
  };
}

/** Booking status as a stepper, same as the Android apps: ticked circles for completed stages, a dot on the current one, a line linking the nodes,
 *  the stage's hint as a sub-paragraph under the current step. "Deposit paid" sits before "Booked". */
function StatusPipeline({request,ar,tr,onBack,onNext}){
  const j=request.journey||{},path=(j.path||[]).map(step=>{const own=journeyContract.clientStages[step.status]||step; return {key:step.status,label:ar?own.adminLabelAr||own.labelAr||own.label:own.adminLabel||own.label};}); // wording from the shared contract, not from a possibly older running server
  const stage=request.bookingStatus||j.clientStatus; // the real, stored booking status
  const now=path.findIndex(step=>step.key===stage);
  if(!path.length)return null;
  // Admin-side hints under the current step (the client app shows its own wording).
  const hint={
    requested:tr('Booking received. Confirm the requested date and time are available, or explain why they are not.'),
    unavailable:[tr('Booking date unavailable. The client is invited to book an optional meeting to discuss date and time options.'),request.availability?.reason].filter(Boolean).join(' '),
    available:tr('Booking date availability confirmed. You can now prepare and send the quote.'),
    quote_ready:j.canRecordDeposit?tr('Quote accepted by the client. Record the deposit once you receive it.'):tr('Booking quote sent. Waiting for the client to accept it or ask for changes.'),
    deposit_paid:tr('Deposit received. The booking is confirmed once the required deposit is covered and the date and equipment checks pass.'),
    booked:tr('Booked. The client can now plan the event.'),
  }[stage]||''
  return <section className="booking-status-band" aria-label={tr('Booking status')}><h4>{tr('Booking status')}</h4>
    <ol>{path.map((step,i)=>{const last=i===path.length-1,done=i<now||(i===now&&last),here=i===now&&!done;
      return <li key={step.key} className={done?'is-done':here?'is-here':i<now?'':'is-next'} aria-current={here?'step':undefined}>
        <span className="node" aria-hidden="true">{done?<svg viewBox="0 0 16 16" width="14" height="14"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>:here?<i/>:null}</span>
        <span className="label">{step.label}{here&&hint&&<small>{hint}</small>}</span>{here&&((onNext&&onNext.label)||(onBack&&i>0))&&<span className="bsp-actions">
          {onNext?.label&&<button type="button" className="bsp-back" onClick={onNext.run}><Check size={11} aria-hidden="true"/>{onNext.label}</button>}
          {onBack&&i>0&&<button type="button" className="bsp-back" onClick={onBack} title={`${tr('Back to')} ${path[i-1].label}`} aria-label={`${tr('Back to')} ${path[i-1].label}`}><Undo2 size={11} aria-hidden="true"/>{tr('Previous step')}</button>}</span>}</li>;})}</ol></section>;
}

/** AI summary of the booking for the reviewing admin. Written automatically when a booking is opened (and again when it changes); kept per booking version so reopening costs nothing. */
const summaryCache=new Map();
function AiBookingSummary({request,token,tr}){
  const version=`${request.id}:${request.updatedAt||''}:${request.quoteRevision||0}:${request.status}`;
  const [state,setState]=useState({version,summary:summaryCache.get(version)||'',error:''});
  useEffect(()=>{
    if(summaryCache.has(version)){setState({version,summary:summaryCache.get(version),error:''});return undefined;}
    let live=true;setState({version,summary:'',error:''});
    apiRequest('/admin/ai/booking-summary',{method:'POST',token,body:{id:request.id}})
      .then(result=>{summaryCache.set(version,result.summary);if(live)setState({version,summary:result.summary,error:''});})
      .catch(failure=>{if(live)setState({version,summary:'',error:failure.message||tr('AI could not summarize the booking.')});});
    return()=>{live=false;};
  },[version]); // eslint-disable-line react-hooks/exhaustive-deps
  const current=state.version===version?state:{summary:'',error:''};
  return <section className="booking-ai-summary" aria-label={tr('AI summary')} aria-busy={!current.summary&&!current.error}><h4>{tr('AI summary')}</h4>
    {current.summary?<p>{current.summary}</p>:current.error?<p role="alert">{current.error}</p>:<p className="is-loading">{tr('Summarizing…')}</p>}</section>;
}

function AdminServicesPanel({ requests, onPublishQuote, onQuoteAction, confirmedBookings = [], token, ar=false }) {
  const {catalog:treeCatalog,equipment:treeEquipment}=useTree(); // the same live catalogue the Booking page numbers its equipment from
  const tr=text=>bookingText(text,ar),money=value=>bookingMoney(value,ar);
  // The same compose popup as the Email area: clicking a client's address opens it addressed to them (no native mail app).
  const mailApi=useMemo(()=>createMailApi(token),[token]);
  const composer=useMailboxDraft({owner:'admin-booking-requests',api:mailApi,onSent:()=>{}});
  const composeTo=address=>{if(!composer.draft){composer.compose();composer.edit('to',address);}else composer.compose();};
  const [selectedId,setSelectedId]=useState(null);
  const selectedRequest=requests.find(request=>request.id===selectedId)||requests[0];
  const [drafts, setDrafts] = useState({});
  const [publishingId, setPublishingId] = useState('');
  const [availabilityBusy,setAvailabilityBusy]=useState(''),[unavailableRequest,setUnavailableRequest]=useState(null);
  const isAvailable=request=>request.availability?.status==='available'||(!request.availability&&Boolean(request.availabilityAcceptedAt));
  const informAvailability=async(request,decision,reason)=>{
    setAvailabilityBusy(request.id);setStatuses(current=>({...current,[request.id]:''}));
    try{const result=await onQuoteAction(request.id,'admin-review',{decision,quoteRevision:request.quoteRevision||0,...(reason?{reason}:{})});setStatuses(current=>({...current,[request.id]:result.notificationSent?tr('Availability saved and emailed to the customer.'):tr('Availability saved on the customer dashboard, but the email could not be sent.')}));return result;}catch(error){setStatuses(current=>({...current,[request.id]:error.message}));throw error;}finally{setAvailabilityBusy('');}
  };
  // Step a booking back one stage (the server refuses once a payment is recorded).
  const stepBackTarget=request=>request.journey?.clientStatus==='quote_ready'?['available',tr('Back to availability')]:['available','unavailable'].includes(request.journey?.clientStatus)?['requested',tr('Back to requested')]:null;
  const stepBack=async(request,to)=>{
    setAvailabilityBusy(request.id);setStatuses(current=>({...current,[request.id]:''}));
    try{await onQuoteAction(request.id,'step-back',{to,quoteRevision:request.quoteRevision||0});setStatuses(current=>({...current,[request.id]:tr('Booking moved back.')}));}catch(error){setStatuses(current=>({...current,[request.id]:error.message}));}finally{setAvailabilityBusy('');}
  };
  const [statuses, setStatuses] = useState({});
  const [rateFeedback,setRateFeedback]=useState({});
  // The saved default quote terms (independent of any booking). null until loaded, so drafts are not built without them.
  const [termsDefaults,setTermsDefaults]=useState(null);
  useEffect(()=>{let live=true;apiRequest('/admin/quote-terms',{token}).then(result=>{if(live)setTermsDefaults(result.terms||{});}).catch(()=>{if(live)setTermsDefaults({});});return()=>{live=false;};},[token]);
  const saveTerms=async request=>{
    const draft=drafts[request.id]||buildDraft(request,undefined,termsDefaults),options=draft.paymentOptions||[];
    setStatuses(current=>({...current,[request.id]:''}));
    try{const result=await apiRequest('/admin/quote-terms',{method:'PUT',token,body:{validDays:Number(draft.validDays)||7,paymentInstructions:draft.paymentInstructions||'',paymentOptions:options,etransferEmail:options.includes('etransfer')?(draft.etransferEmail||'').trim():''}});setTermsDefaults(result.terms);setStatuses(current=>({...current,[request.id]:tr('Saved as your default quote terms.')}));}
    catch(error){setStatuses(current=>({...current,[request.id]:error.message||tr('The terms could not be saved.')}));}
  };
  // Fill rates from the pricing engine (policies, event hours, packages). The admin still reviews every rate before publishing.
  const fillFromEngine = async (request, draft) => {
    setRateFeedback(current=>({...current,[request.id]:''}));
    try {
      const { suggestions, warnings } = await apiRequest(`/admin/pricing/suggest/${request.id}`, { method: 'POST', token, body: { items: draft.items.map((i) => ({ serviceId: i.serviceId, quantity: i.quantity })) } });
      const filled = suggestions.filter((x) => x.unitPrice != null);
      setDrafts((current) => ({ ...current, [request.id]: { ...buildDraft(request, current[request.id], termsDefaults), prices: { ...draft.prices, ...Object.fromEntries(filled.map((x) => [x.serviceId, x.unitPrice.toFixed(2)])) } } }));
      const skipped = suggestions.length - filled.length;
      setRateFeedback((current) => ({ ...current, [request.id]: `Filled ${filled.length} rate(s) from the pricing engine.${skipped ? ` ${skipped} need a manual price.` : ''}${warnings.length ? ' ' + warnings[0] : ''}` }));
    } catch (error) { setRateFeedback((current) => ({ ...current, [request.id]: error.message || 'The pricing engine could not suggest rates.' })); }
  };

  useEffect(() => {
    if (termsDefaults === null) return;
    setDrafts((current) =>
      Object.fromEntries(requests.map((request) => [request.id, buildDraft(request, current[request.id], termsDefaults)])),
    );
  }, [requests, termsDefaults]);

  const requestCountLabel = useMemo(
    () => ar?`${requests.length} طلب`:`${requests.length} REQUEST${requests.length === 1 ? '' : 'S'}`,
    [requests.length,ar],
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
      setStatuses((current) => ({ ...current, [request.id]: error.message || tr("Action failed.") }));
    }
  };

  const setField = (id, field, value) =>
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));

  const publishQuote = async (request) => {
    if(!isAvailable(request)){setStatuses(current=>({...current,[request.id]:tr('Inform availability before publishing the quote.')}));return;}
    const draft = drafts[request.id] || buildDraft(request, undefined, termsDefaults);
    if(!Number.isInteger(Number(draft.validDays))||Number(draft.validDays)<1||Number(draft.validDays)>60||!Number.isFinite(Number(draft.taxPercent))||Number(draft.taxPercent)<0||Number(draft.taxPercent)>30||!Number.isFinite(Number(draft.depositAmount))||Number(draft.depositAmount)<0||(draft.depositType==='percent'&&!(Number(draft.depositPercent)>=0&&Number(draft.depositPercent)<=100))){
      setStatuses(current=>({...current,[request.id]:'Check quote terms: validity 1–60 days, tax 0–30%, and a non-negative deposit.'}));return;
    }
    if((draft.paymentOptions||[]).includes('etransfer')&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((draft.etransferEmail||'').trim())){setStatuses(current=>({...current,[request.id]:tr('Enter the email address that receives the e-transfer.')}));return;}
    const hasMissingPrice = draft.items.some((item) => {
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

    const subtotal=draft.items.reduce((sum,item)=>sum+Math.round(Number(draft.prices[item.serviceId])*100)*item.quantity,0)/100;
    if(!Number.isFinite(Number(draft.discountValue))||Number(draft.discountValue)<0||(draft.discountType==='percent'?Number(draft.discountValue)>100:Number(draft.discountValue)>subtotal)){
      setStatuses(current=>({...current,[request.id]:'Discount must be between zero and the subtotal, or between 0% and 100%.'}));return;
    }
    setPublishingId(request.id);
    setStatuses((current) => ({ ...current, [request.id]: '' }));

    try {
      const result = await onPublishQuote(request.id, {
        quoteRevision:draft.quoteRevision,
        negotiationRevision:request.negotiationRevision||0,
        ...(draft.proposalRevision?{proposalRevision:draft.proposalRevision}:{}),
        items: draft.items.map((item) => ({
          serviceId: item.serviceId,
          unitPrice: Number(draft.prices[item.serviceId]),
        })),
        adminNote: draft.adminNote || '',
        validDays: Number(draft.validDays) || 7,
        taxPercent: Number(draft.taxPercent) || 0,
        discountType: draft.discountType,
        discountValue: Number(draft.discountValue)||0,
        depositAmount: quoteTotals({...draft,items:draft.items.map(item=>({...item,unitPrice:Number(draft.prices[item.serviceId])}))}).deposit,
        paymentInstructions: draft.paymentInstructions || '',
        paymentOptions: draft.paymentOptions || [],
        etransferEmail: (draft.paymentOptions||[]).includes('etransfer')?(draft.etransferEmail||'').trim():'',
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
          <h3>{tr("Confirmed bookings")}</h3>
          <ul>
            {confirmedBookings.map((b) => (
              <li key={b.requestId}>{`${b.eventDate} · ${b.customerName}${b.venue ? ` · ${b.venue}` : ''}`}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="admin-booking-layout">
        <aside className="admin-booking-list" aria-label={tr("Booking requests")}>
          <header><h2>{tr("Booking requests")}</h2><span className="admin-services-count">{requestCountLabel}</span></header>
          <nav aria-label={tr("Choose a booking request")}>
            {requests.map(request=><button key={request.id} type="button" className="admin-booking-list-item admin-booking-list-code" aria-current={selectedRequest?.id===request.id?'true':undefined} aria-controls="admin-booking-detail" onClick={()=>setSelectedId(request.id)}>{request.requestNumber||request.id}</button>)}
            {!requests.length&&<p className="admin-booking-list-empty">{tr("No booking requests yet.")}</p>}
          </nav>
        </aside>
      <section id="admin-booking-detail" className="admin-booking-detail-column" aria-labelledby="admin-booking-detail-title">
        <header className="admin-booking-detail-heading"><div className="booking-detail-title"><h2 id="admin-booking-detail-title">{tr("Booking details")}</h2>{selectedRequest&&<span>{selectedRequest.requestNumber||selectedRequest.id}</span>}</div>
          {selectedRequest&&(()=>{
            // Header actions follow the booking's stage and the open tab: Booking info -> availability decisions, Quote -> publishing.
            const r=selectedRequest,stage=r.journey?.clientStatus,repr=r.journey.repriceable,busy=Boolean(publishingId||availabilityBusy);
            const informAvailable=repr&&['requested','modified','unavailable'].includes(stage);
            const closeMenu=event=>event.currentTarget.closest('details')?.removeAttribute('open');
            // One primary action for the stage, secondary corrections beside it, and the destructive ones tucked in "More".
            return <div className="booking-publish-action" data-stage={stage}>
              {informAvailable&&<button type="button" className="primary-button" disabled={busy} onClick={()=>{void informAvailability(r,'accept').catch(()=>{});}}>{availabilityBusy===r.id?tr('Informing…'):tr('Booking date available')}</button>}
              <details className="bpa-more"><summary className="secondary-button" aria-label={tr('More actions')}><MoreHorizontal size={17} aria-hidden="true"/></summary>
                <div role="menu">
                  {r.journey.cancellable?<button type="button" role="menuitem" onClick={e=>{closeMenu(e);if(window.confirm(tr("Cancel this request?")))runAction(r,'cancel');}}><Ban size={15} aria-hidden="true"/>{tr("Cancel request")}</button>:null}
                  <button type="button" role="menuitem" className="is-danger" onClick={async e=>{closeMenu(e);if(!window.confirm(tr("Delete this booking permanently? It is removed from the database and from the client's dashboard, and cannot be undone.")))return;await runAction(r,'delete',{confirmation:'DELETE'});setSelectedId(null);}}><Trash2 size={15} aria-hidden="true"/>{tr("Delete permanently")}</button>
                </div></details>
            </div>;
          })()}</header>
        {requests.length ? (
          [selectedRequest].map((request) => {
            const draft = drafts[request.id] || buildDraft(request, undefined, termsDefaults);
            // The Quote column appears only once the date is confirmed (Booking date available or later), or when a quote already exists.
            const showQuote=['available','quote_ready','deposit_paid','booked'].includes(request.bookingStatus||request.journey?.clientStatus)||Boolean(request.quotedAt);
            const totals=quoteTotals({...draft,items:draft.items.map(item=>({...item,unitPrice:Number(draft.prices?.[item.serviceId]||0)}))});

            return (
              <div key={request.id} className="admin-booking-detail-body" data-quote={showQuote?'on':'off'}>
              <article className={`admin-service-request-card`} aria-busy={publishingId===request.id}>
                <header className="booking-column-heading"><h3>{tr("Booking details")}</h3></header>
                <header className="booking-brief-heading booking-summary" aria-label={tr("Booking summary")}>
                  <StatusPipeline request={request} ar={ar} tr={tr} onNext={(()=>{const idle=request.journey.repriceable&&!publishingId&&!availabilityBusy,stage=request.bookingStatus||request.journey?.clientStatus;
                    if(['requested','modified','unavailable'].includes(stage)&&idle)return {label:tr('Confirm availability'),run:()=>{void informAvailability(request,'accept').catch(()=>{});}};
                    if(stage==='quote_ready'&&request.journey.canRecordDeposit)return {label:tr('Record deposit'),run:()=>{const form=document.getElementById('booking-payment-form');form?.scrollIntoView({behavior:'smooth',block:'center'});form?.querySelector('input')?.focus();}};
                    return null;})()} onBack={(()=>{const back=stepBackTarget(request);return back&&request.journey.repriceable&&!(request.depositPaidCents>0)&&!publishingId&&!availabilityBusy?()=>{const target=journeyContract.clientStages[back[0]];if(window.confirm(`${tr('Move this booking back to')} “${ar?target.labelAr||target.label:target.label}”?`))void stepBack(request,back[0]);}:null;})()}/>
                  <div className="booking-summary-main">
                  <div className="booking-summary-who">
                    <h3>{request.customerName}</h3>
                    <span className={`admin-service-request-status is-${request.status}`}>{adminStatusLabel(request,ar)}</span>
                    <a href="#compose" onClick={event=>{event.preventDefault();composeTo(request.customerEmail);}}>{request.customerEmail}</a>
                    {(request.order?.customer?.phone||request.event?.phone)&&<a href={`tel:${request.order?.customer?.phone||request.event?.phone}`}>{request.order?.customer?.phone||request.event?.phone}</a>}
                  </div>
                  <div className="booking-summary-foot">
                    <div><span>{tr("Booking code")}</span><code>{request.requestNumber||request.id}</code></div>
                  </div>
<AiBookingSummary key={request.id} request={request} token={token} tr={tr}/></div>
                </header>
              
                <div id="booking-tab-panel">
                <div className="booking-detail-sections">
                  {request.order&&<BookingDraftReview order={{...request.order,customer:{...request.order.customer,...(n=>({firstName:request.order.customer?.firstName||n.firstName,lastName:request.order.customer?.lastName||n.lastName}))(customerNameParts({...request.order.customer,fullName:request.order.customer?.fullName??request.customerName}))}}} snapshot ar={ar}/>}
                  {bookingSections(request,ar).map(section=>request.order&&section.title==="References & notes"?{...section,rows:section.rows.filter(([label])=>label==="Requested changes")}:section).filter(section=>!request.order||section.title==="Event planning"||section.title==="References & notes"&&section.rows.length).map((section,index)=><section key={section.title} className={`booking-detail-section${section.wide?' is-wide':''}`} aria-label={tr(section.title)}>
                    <h4><span aria-hidden="true">{String(index+1).padStart(2,'0')}</span>{tr(section.title)}</h4>
                    <dl>{section.rows.map(([label,value])=><div key={label}><dt>{tr(label)}</dt><dd>{detailText(value)}</dd></div>)}</dl>
                    {!section.rows.length&&<p className="booking-detail-empty">{tr("No details provided.")}</p>}
                  </section>)}
                </div>
                </div>
                {statuses[request.id] ? (
                  <p className="admin-service-request-feedback" role="status">
                    {statuses[request.id]}
                  </p>
                ) : null}
              </article>
              {showQuote&&<aside className="booking-conversation-aside booking-quote-aside" aria-label={tr("Quote")}><header className="booking-column-heading booking-quote-heading"><h3>{tr("Quote")}</h3>{(()=>{const canPublish=request.journey.repriceable&&isAvailable(request)&&['available','quote_ready','deposit_paid'].includes(request.journey?.clientStatus),busy=Boolean(publishingId||availabilityBusy);
                  return canPublish?<button type="button" className="primary-button booking-quote-publish" disabled={busy} onClick={()=>publishQuote(request)}><Send size={14}/>{publishingId===request.id?tr("Sending..."):request.journey.awaitingClient?tr("Update sent quote"):tr("Send quote")}</button>:null;})()}</header>
                <div className="booking-quote-panel">
                <OfferReview ar={ar} request={request} onAdopt={request.journey.repriceable ? offer=>setDrafts(current=>({...current,[request.id]:{...buildDraft(request,current[request.id],termsDefaults),proposalRevision:offer.revision,items:offer.items,prices:Object.fromEntries(offer.items.map(item=>[item.serviceId,item.unitPrice]))}})) : undefined}/>
                {draft.proposalRevision&&<p role="status">Editing client offer {draft.proposalRevision}. Publishing sends a new quote for the client to accept or decline.</p>}
                <BookingQuoteEditor termsDefaults={termsDefaults} onApplyTerms={()=>{for(const key of ['validDays','paymentInstructions','paymentOptions','etransferEmail'])setField(request.id,key,termsDefaults[key]??(key==='paymentOptions'?[]:''));}} onSaveTerms={()=>saveTerms(request)} request={request} draft={draft} totals={totals} catalog={treeCatalog} equipment={treeEquipment} ar={ar} editable={request.journey.repriceable&&!publishingId} rateFeedback={rateFeedback[request.id]}
                  onPriceChange={(id,value)=>updatePrice(request.id,id,value)} onFieldChange={(key,value)=>setField(request.id,key,value)} onNoteChange={value=>updateNote(request.id,value)} onFillRates={()=>fillFromEngine(request,draft)}/>
                {(request.journey.canRecordDeposit||request.journey.isBooked||(request.payments||[]).length>0)&&<h4 className="booking-section-title">{tr("Payments")}</h4>}
                {request.journey.canRecordDeposit||request.journey.isBooked ? (
                  <form id="booking-payment-form" className="admin-service-request-terms" onSubmit={(e) => {
                    e.preventDefault();
                    const f = Object.fromEntries(new FormData(e.target));
                    runAction(request, 'payments', { kind: f.kind, amount: Number(f.amount), method: f.method, reference: f.reference });
                    e.target.reset();
                  }}>
                    <AdminSelect name="kind" defaultValue={request.journey.canRecordDeposit ? 'deposit' : 'balance'}>
                      {request.journey.canRecordDeposit ? <option value="deposit">{tr("Deposit")}</option> : <><option value="balance">{tr("Balance")}</option><option value="refund">{tr("Refund")}</option></>}
                    </AdminSelect>
                    <input name="amount" type="number" min="0.01" step="0.01" required placeholder={tr("Amount (CAD)")} />
                    <AdminSelect name="method" defaultValue="etransfer">
                      <option value="etransfer">{tr("E-transfer")}</option><option value="cheque">{tr("Cheque")}</option><option value="bank_transfer">{tr("Bank transfer")}</option><option value="other">{tr("Other")}</option>
                    </AdminSelect>
                    <input name="reference" placeholder={tr("Reference (optional)")} />
                    <button type="submit" className="primary-button">{tr("RECORD PAYMENT")}</button>
                  </form>
                ) : null}
                {(request.payments || []).length ? (
                  <ul className="admin-service-request-terms">
                    {request.payments.map((p) => (
                      <li key={p.id} style={p.voided ? { textDecoration: 'line-through' } : undefined}>
                        {`${new Date(p.paidAt).toLocaleDateString(bookingLocale(ar))} · ${p.kind} · ${p.method} · ${money(p.amountCents / 100)}${p.reference ? ` · ${p.reference}` : ''} `}
                        {p.voided ? null : <button type="button" className="secondary-button" onClick={() => window.confirm(tr("Void this payment entry?")) && runAction(request, `payments/${p.id}/void`)}>{tr("Void")}</button>}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {request.journey.extendable && request.quotedAt ? (
                  <div className="admin-service-request-terms">
                    <button type="button" className="secondary-button" onClick={() => runAction(request, 'extend', { days: Number(draft.validDays) || 7 })}>
                      {request.journey.adminNext === 'reactivate_or_close' ? tr("Reactivate") : tr("Extend")} {Number(draft.validDays) || 7} {ar?'أيام':'days'}
                    </button>
                  </div>
                ) : null}
                </div>
              </aside>}
              </div>
            );
          })
        ) : (
          <div className="admin-services-empty">
            <strong>{tr("No service requests yet")}</strong>
            <p>Signed-in customer requests from the Services page will appear here.</p>
          </div>
        )}
      </section>
      </div>
      <div className="admin-email" style={{display:'contents'}}><MailComposer composer={composer} onReview={()=>{}} polish={body=>apiRequest('/admin/ai/email-polish',{method:'POST',token,body})}/></div>
      {unavailableRequest&&<UnavailableReasonDialog request={unavailableRequest} token={token} ar={ar} onClose={()=>setUnavailableRequest(null)} onConfirm={reason=>informAvailability(unavailableRequest,'unavailable',reason)}/>}
    </>
  );
}

export default AdminServicesPanel;
