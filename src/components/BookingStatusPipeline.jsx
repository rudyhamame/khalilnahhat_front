import journeyContract from '../lib/bookingJourneyContract.json' with {type:'json'};
import {bookingText,bookingLocale} from '../lib/bookingUiText';
import './clientBookingRequests.css';
import {Check,Undo2} from 'lucide-react';

const stageTime = (request, key) => {
  const paid = (request.payments || []).filter((p) => !p.voided && p.paidAt).map((p) => p.paidAt).sort().at(-1);
  return { requested: request.createdAt, available: request.availabilityAcceptedAt || request.availability?.informedAt, unavailable: request.availability?.informedAt, quote_ready: request.quotedAt, deposit_paid: paid, booked: request.acceptedAt, modified: request.modifiedAt }[key] || '';
};
export default function BookingStatusPipeline({request={},draft=false,ar=false,tr=text=>bookingText(text,ar),onBack,onNext,audience="admin",renderStepExtra,onUndo}){
  const when=key=>{const value=stageTime(request,key);return value?new Intl.DateTimeFormat(bookingLocale(ar),{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'';};
  const j=request.journey||{};
  const stages=draft?[{status:'draft',label:tr('Booking draft'),labelAr:'مسودة الحجز'},...journeyContract.clientPath.map(status=>({status,...journeyContract.clientStages[status]}))]:j.path||[];
  const path=stages.map(step=>{const own=journeyContract.clientStages[step.status]||step; return {key:step.status,label:audience==="client"?(ar?own.labelAr||own.label:own.label):(ar?own.adminLabelAr||own.labelAr||own.label:own.adminLabel||own.label)};}); // wording from the shared contract, not from a possibly older running server
  const cancelled=j.branches?.cancelled,stage=draft?'draft':cancelled?cancelled.afterStage:request.bookingStatus||j.clientStatus; // the real, stored booking status
  const now=path.findIndex(step=>step.key===stage);
  if(!path.length)return null;
  // Admin-side hints under the current step (the client app shows its own wording).
  const adminHint={
    requested:tr('Booking received. Confirm the requested date and time are available, or explain why they are not.'),
    unavailable:[tr('Booking date unavailable. The client is invited to book an optional meeting to discuss date and time options.'),request.availability?.reason].filter(Boolean).join(' '),
    available:tr('Booking date availability confirmed. You can now prepare and send the quote.'),
    quote_ready:j.canRecordDeposit?tr('Quote accepted by the client. Record the deposit once you receive it.'):tr('Booking quote sent. Waiting for the client to accept it or ask for changes.'),
    deposit_paid:tr('Deposit received. The booking is confirmed once the required deposit is covered and the date and equipment checks pass.'),
    booked:tr('Booked. The client can now plan the event.'),
  }[stage]||''
  const hint=audience==='admin'?adminHint:({
    draft:ar?'لم يتم إرسال هذه المسودة بعد. أكمل بياناتك وأرسل طلب الحجز للانتقال إلى الخطوة التالية.':'This draft has not been submitted. Complete your details and send your booking request to move to the next stage.',
    requested:ar?'استلمنا طلب حجزك. يجري التحقق من التوافر.':'Your booking request was received. Availability is being checked.',
    available:ar?'تم تأكيد توافر التاريخ. يجري إعداد عرض السعر.':'Your date is available. Your quote is being prepared.',
    unavailable:request.availability?.reason||'',
    quote_ready:j.canRecordDeposit?(ar?'تم قبول العرض. اتبع تعليمات دفع العربون لتأكيد الحجز.':'Your quote is accepted. Follow the deposit instructions to confirm your booking.'):(ar?'عرض السعر جاهز للمراجعة والقبول.':'Your quote is ready to review and accept.'),
    booked:ar?'تم تأكيد حجزك. يمكنك الآن التخطيط لفعاليتك.':'Your booking is confirmed. You can now plan your event.'
  }[stage]||'');
  return <section className="booking-status-band" aria-label={tr('Booking status')}><h4>{tr('Booking status')}</h4>
    <ol>{path.map((step,i)=>{const last=i===path.length-1,done=i<now||(i===now&&last),here=i===now&&!done;
      return <li key={step.key} className={done?'is-done':here?'is-here':i<now?'':'is-next'} aria-current={here?'step':undefined}>
        <span className="node" aria-hidden="true">{done?<svg viewBox="0 0 16 16" width="14" height="14"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>:here?<i/>:null}</span>
        <span className="label">{step.label}{here&&hint&&<small>{hint}</small>}{renderStepExtra?.(step.key,i,now)}{step.key==='requested'&&(request.modifications?.length>0||(audience==='client'&&request.journey?.modified))&&<ul className="dashboard-status-modifications">{(request.modifications?.length?request.modifications:[{at:request.modifiedAt}]).map((entry,n)=><li key={`${entry.at}-${n}`} className={entry.undone?'is-undone':''}><b>{tr('Booking modified')}</b>{entry.at&&<small>{new Intl.DateTimeFormat(bookingLocale(ar),{dateStyle:'medium',timeStyle:'short'}).format(new Date(entry.at))}</small>}{onUndo&&entry.canUndo&&<button type="button" onClick={()=>onUndo(n)}>{tr('Undo modification')}</button>}</li>)}</ul>}{(()=>{const decisions=step.key===j.branches?.after?j.branches.decisions:[],cancel=cancelled&&step.key===cancelled.afterStage?cancelled:null;
          const dates={quote_accepted:request.acceptedAt,best_offer_requested:request.changeRequestedAt,cancelled_by_client:request.cancelledAt};
          const label=item=>ar?item.labelAr:audience==='client'?item.label:item.adminLabel||item.label,fmt=v=>v?new Intl.DateTimeFormat(bookingLocale(ar),{dateStyle:'medium',timeStyle:'short'}).format(new Date(v)):'';
          return decisions.length||cancel?<ul className="dashboard-status-modifications bsp-branches">{decisions.map(item=><li key={item.status} className={item.reached?'':'is-pending'}><b>{label(item)}</b>{item.reached&&fmt(dates[item.status])&&<small>{fmt(dates[item.status])}</small>}</li>)}{cancel&&<li className="is-cancel"><b>{label(cancel)}</b>{fmt(dates[cancel.status])&&<small>{fmt(dates[cancel.status])}</small>}</li>}</ul>:null;})()}</span>{i<=now&&when(step.key)&&<small className="bsp-date">{when(step.key)}</small>}{here&&((onNext&&onNext.label)||(onBack&&i>0))&&<span className="bsp-actions">
          {onNext?.label&&<button type="button" className="bsp-back" onClick={onNext.run}><Check size={11} aria-hidden="true"/>{onNext.label}</button>}
          {onBack&&i>0&&<button type="button" className="bsp-back" onClick={onBack} title={`${tr('Back to')} ${path[i-1].label}`} aria-label={`${tr('Back to')} ${path[i-1].label}`}><Undo2 size={11} aria-hidden="true"/>{tr('Previous step')}</button>}</span>}</li>;})}</ol></section>;
}

