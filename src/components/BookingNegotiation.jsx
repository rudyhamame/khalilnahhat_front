import {bookingText,bookingLocale,bookingMoney} from '../lib/bookingUiText';
import {useEffect,useRef,useState} from 'react';
import {apiRequest} from '../lib/api';
import './bookingNegotiation.css';
export function OfferReview({request,onAdopt,onEdit,onDelete,busy=false,ar=false}) {
 const tr=text=>bookingText(text,ar),money=value=>bookingMoney(value,ar);
 const offer=request.negotiation;
 if(!offer)return null;
 const original=new Map((offer.quotedItems||request.items).map(item=>[item.serviceId,item]));
 const proposed=new Map(offer.items.map(item=>[item.serviceId,item]));
 const rows=[...new Set([...original.keys(),...proposed.keys()])].map(id=>({id,before:original.get(id),after:proposed.get(id)}));
 const total=items=>items.reduce((sum,item)=>sum+Math.round(Number(item.unitPrice||0)*100)*Number(item.quantity||0),0)/100;
 const quotedTotal=total([...original.values()]),offeredTotal=total(offer.items),delta=Math.round((offeredTotal-quotedTotal)*100)/100;
 const diff=(before,after)=>{if(!before||!after||before.unitPrice==null)return null;const change=Math.round((after.unitPrice-before.unitPrice)*100)/100;return change;};
 return <section className="booking-offer-review">
  <header className="bor-head"><div><h4>{tr('Client’s offer')}</h4><span className="bor-rev">{tr('Revision')} {offer.revision}</span></div><span className={`bor-state${offer.resolvedAt?' is-done':''}`}>{offer.resolvedAt?(offer.withdrawn?tr('Withdrawn'):tr('Reviewed')):tr('Awaiting review')}</span></header>
  {offer.message&&<blockquote className="booking-offer-message">{offer.message}</blockquote>}
  <div className="bor-table" role="table">
   <div className="bor-row bor-cols" role="row"><span>{tr('Item')}</span><span>{tr('Quantity')}</span><span>{tr('Quoted')}</span><span>{tr('Client offer')}</span><span>{tr('Difference')}</span></div>
   {rows.map(({id,before,after})=>{const change=diff(before,after);return <div className={`bor-row${after?'':' is-removed'}`} role="row" key={id}>
    <strong>{after?.name||before?.name}{!before&&<em>{tr('Added by client')}</em>}{!after&&<em>{tr('Removed by client')}</em>}</strong>
    <span data-label={tr('Quantity')}>{(after||before).quantity}</span>
    <span data-label={tr('Quoted')}>{before?(before.unitPrice==null?tr('Not priced'):money(before.unitPrice)):'—'}</span>
    <span data-label={tr('Client offer')}>{after?money(after.unitPrice):'—'}</span>
    <span data-label={tr('Difference')} className={change==null||change===0?'':change<0?'is-lower':'is-higher'}>{change==null?'—':change===0?'=':`${change>0?'+':'−'}${money(Math.abs(change))}`}</span>
   </div>;})}
  </div>
  <footer className="bor-foot"><div><small>{tr('Quoted subtotal')}</small><strong>{money(quotedTotal)}</strong></div><div><small>{tr('Proposed subtotal')}</small><strong>{money(offeredTotal)}</strong></div><div><small>{tr('Difference')}</small><strong className={delta<0?'is-lower':delta>0?'is-higher':''}>{delta===0?'=':`${delta>0?'+':'−'}${money(Math.abs(delta))}`}</strong></div></footer>
  <p className="bor-note">{tr('Before tax and discounts')}</p>
  {(onEdit||onDelete)&&!offer.resolvedAt&&<div className="bor-actions">{onEdit&&<button type="button" className="bor-edit" disabled={busy} onClick={onEdit}>{tr('Edit offer')}</button>}{onDelete&&<button type="button" className="bor-delete" disabled={busy} onClick={onDelete}>{tr('Delete offer')}</button>}</div>}
  {onAdopt&&!offer.resolvedAt&&<button type="button" className="bor-adopt" onClick={()=>onAdopt(offer)}>{tr("Use client’s selection and prices in quote editor")}</button>}
  <OfferHistory ar={ar} request={request}/>
 </section>;
}
function OfferHistory({request,ar=false}) {
 const tr=text=>bookingText(text,ar),money=value=>bookingMoney(value,ar);
 const history=request.negotiationHistory||[];
 if(history.length<2)return null;
 return <section className="booking-offer-history"><h4>{tr('Previous client offers')} ({history.length-1})</h4>{history.slice(0,-1).slice().reverse().map(offer=><section key={offer.revision}><h5>{tr('Offer')} {offer.revision} · {new Date(offer.submittedAt).toLocaleString(bookingLocale(ar))}</h5>{offer.message&&<p>{offer.message}</p>}{offer.items.map(item=><p key={item.serviceId}>{item.name} · {item.quantity} × {money(item.unitPrice)}</p>)}</section>)}</section>;
}
// The negotiation form opens as a centered popup over the page.
function Popup({title,onClose,closeLabel,children}){
 const ref=useRef(null);
 useEffect(()=>{ref.current?.showModal();},[]);
 return <dialog ref={ref} className="booking-negotiation-popup" aria-label={title} onClose={onClose} onClick={event=>{if(event.target===ref.current)ref.current.close();}}>
  <header><h4>{title}</h4><button type="button" className="bnp-close" aria-label={closeLabel} onClick={()=>ref.current?.close()}>✕</button></header>
  {children}
 </dialog>;
}

export default function BookingNegotiation({request,token,onQuoteAction,ar=false}) {
 const tr=text=>bookingText(text,ar),money=value=>bookingMoney(value,ar);
 const [open,setOpen]=useState(false),[rows,setRows]=useState([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const offer=request.negotiation&&!request.negotiation.resolvedAt?request.negotiation:null;setRows((offer?.items||request.items).map(item=>({...item,included:true,unitPrice:item.unitPrice??''})));setMessage(offer?.message||'');},[request.id,request.quoteRevision,request.negotiationRevision,request.negotiation,request.items]);
 const change=(id,patch)=>setRows(current=>current.map(row=>row.serviceId===id?{...row,...patch}:row));
 const submit=async event=>{event.preventDefault();const items=rows.filter(row=>row.included).map(row=>({serviceId:row.serviceId,quantity:Number(row.quantity),unitPrice:Number(row.unitPrice)}));if(!items.length||rows.some(row=>row.included&&(row.unitPrice===''||!Number.isFinite(Number(row.unitPrice))))){setError(tr("Keep at least one item and enter an offered price for each selected item."));return;}setBusy(true);setError('');try{await onQuoteAction(request.id,'negotiation',{items,message,quoteRevision:request.quoteRevision||0,negotiationRevision:request.negotiationRevision||0});setOpen(false);}catch(e){setError(e.message);}finally{setBusy(false);}};
  // Delete the client's open offer: the quote waits for their decision again (the same server step as "Go back").
 const removeOffer=async()=>{if(!window.confirm(tr('Delete your offer? The quote waits for your decision again.')))return;setBusy(true);setError('');try{await onQuoteAction(request.id,'client-step-back',{to:'quote',quoteRevision:request.quoteRevision||0});}catch(e){setError(e.message);}finally{setBusy(false);}};
 if(!(request.journey.canNegotiate&&request.journey.showsPrices))return request.negotiation?<OfferReview ar={ar} request={request}/>:null;
 return <section className="booking-negotiation"><h4>{request.negotiation&&!request.negotiation.resolvedAt?tr("Your offer is with the team"):tr("Negotiate the price")}</h4><p>{tr("Propose a price for each item until you accept or decline the quote. The package stays as quoted.")}</p>{!(request.negotiation&&!request.negotiation.resolvedAt)&&<button type="button" className="secondary-button" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{tr("Negotiate the price")}</button>}{open&&<Popup title={tr("Negotiate the price")} closeLabel={tr("Close")} onClose={()=>setOpen(false)}><form onSubmit={submit}><p>{tr("Your offer will be reviewed by our team. It becomes an official quote only after the team publishes it.")}</p><div className="booking-negotiation-head" aria-hidden="true"><span>{tr("Item")}</span><span>{tr("Quantity")}</span><span>{tr("Unit price")} (CAD)</span><span>{tr("Total")}</span></div><div className="booking-negotiation-items">{rows.map(row=><div className={`booking-negotiation-item${row.included?'':' is-removed'}`} key={row.serviceId}><strong>{row.name}</strong><span className="bn-qty">{row.quantity}</span><label><span className="bn-sr">{tr("Your unit price (CAD)")}</span><input aria-label={`${tr('Your unit price (CAD)')}: ${row.name}`} disabled={!row.included} type="number" required={row.included} min="0" max="1000000" step="0.01" value={row.unitPrice} onChange={e=>change(row.serviceId,{unitPrice:e.target.value})}/></label><span>{money(Number(row.unitPrice)*Number(row.quantity))}</span></div>)}</div><p><strong>{tr('Offered subtotal')}: {money(rows.filter(row=>row.included).reduce((sum,row)=>sum+Math.round(Number(row.unitPrice||0)*100)*Number(row.quantity||0),0)/100)}</strong> · {tr('Before tax and discounts')}</p><label>{tr("Message to the team")}<textarea maxLength={2000} rows={3} value={message} onChange={e=>setMessage(e.target.value)} placeholder={tr("Tell us about your proposed prices")}/></label><button type="submit" className="primary-button" disabled={busy}>{busy?tr("Sending offer…"):tr("Send offer for review")}</button></form></Popup>}{error&&<p role="alert">{error}</p>}{request.negotiation&&<OfferReview ar={ar} request={request} busy={busy} onEdit={()=>setOpen(true)} onDelete={removeOffer}/>}</section>;
}
