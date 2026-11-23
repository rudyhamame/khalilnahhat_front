import {bookingText,bookingLocale} from '../lib/bookingUiText';
import {useCallback,useEffect,useState} from 'react';
import {ArrowUpRight,RefreshCw,FileText,Trash2} from 'lucide-react';
import {confirmDeletion} from '../lib/confirmDeletion';
import {apiRequest} from '../lib/api';
import {missingOrderFields,contract,getPath} from '../lib/eventOrderCore.mjs';
import {eventTypeLabel} from '../lib/eventTypeLabel';
import BookingDraftReview from './BookingDraftReview';
import './bookingDraft.css';

const savedDate=(value,ar)=>value&&!Number.isNaN(Date.parse(value))?new Date(value).toLocaleString(bookingLocale(ar),{timeZone:'America/Toronto',dateStyle:'medium',timeStyle:'short'}):'';
export default function EventDraftCard({token,user,ar=false}){
 const tr=useCallback(text=>bookingText(text,ar),[ar]);
 const [state,setState]=useState({token,loading:true,item:null,error:''}),[retry,setRetry]=useState(0);
 useEffect(()=>{
  if(!token)return;
  let alive=true;const controller=new AbortController();
  setState(previous=>({token,loading:true,item:previous.token===token?previous.item:null,error:''}));
  apiRequest('/ai-booking/event-draft',{token,signal:controller.signal}).then(({item})=>{if(alive)setState({token,loading:false,item,error:''});}).catch(()=>{if(alive)setState(previous=>({...previous,token,loading:false,error:tr("Your saved draft could not be loaded. Please retry.")}));});
  return()=>{alive=false;controller.abort();};
 },[token,retry,tr]);
 useEffect(()=>{
  const refresh=()=>{if(!document.hidden)setRetry(value=>value+1);};
  window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  return()=>{window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[]);
 const [deleting,setDeleting]=useState(false);
 const current=state.token===token?state:{loading:true,item:null,error:''};
 // Deleting the draft here removes it from the account, its conversation, and every copy this browser keeps (other tabs are told to reset too).
 const removeDraft=async()=>{
  const item=current.item;if(!item||deleting||!await confirmDeletion(tr("Delete this booking draft and its conversation permanently?")))return;
  setDeleting(true);
  try{
   await apiRequest(`/ai-booking/event-draft?version=${item.version||0}${item.draftId?`&draftId=${encodeURIComponent(item.draftId)}`:''}`,{method:'DELETE',token,confirmedDelete:true});
   try{
    for(const area of [window.localStorage,window.sessionStorage])for(const key of Object.keys(area))if(['echo-event-order:v1:','echo-quote-draft:','echo-booking-conversation:v1:','echo-ai-tasks:v1:'].some(prefix=>key.startsWith(prefix))&&!key.endsWith(':reset'))area.removeItem(key);
    const owner=user?.id||user?._id||user?.username;if(owner)window.localStorage.setItem(`echo-event-order:v1:${owner}:reset`,crypto.randomUUID());
   }catch{/* Optional storage. */}
   setState({token,loading:false,item:null,error:''});
  }catch(error){setState(previous=>({...previous,error:error.message||tr("The draft could not be deleted. Please retry.")}));}
  finally{setDeleting(false);}
 };
 const order=current.item?.order;
 const required=order?contract.sections.filter(section=>!section.gate||getPath(order,section.gate)===true).flatMap(section=>section.fields.filter(field=>field.required)).length:0;
 const completed=order?Math.max(0,required-missingOrderFields(order).length):0;
 const saved=savedDate(current.item?.updatedAt,ar);
 return <section className="booking-draft" aria-labelledby="booking-draft-title" aria-busy={current.loading}>
  <header className="cw-heading"><div><h1 id="booking-draft-title">{tr("Booking draft")}</h1><p>{tr("Your saved event plan, with every detail you have added so far.")}</p></div><div className="bd-actions"><button type="button" className="bd-icon bd-refresh" disabled={current.loading||!token} onClick={()=>setRetry(value=>value+1)} aria-label={current.loading?tr("Refreshing draft"):tr("Refresh draft")} title={tr("Refresh draft")}><RefreshCw size={18} className={current.loading?'bd-spin':undefined} aria-hidden="true"/></button>{order&&<button type="button" className="bd-icon bd-delete" disabled={deleting||current.loading} onClick={removeDraft} aria-label={deleting?tr("Deleting draft"):tr("Delete draft")} title={tr("Delete draft")}><Trash2 size={18} aria-hidden="true"/></button>}</div></header>
  {current.error&&<div className="cw-panel bd-error" role="alert"><p>{current.error}{order?tr(" Showing your last loaded draft."):''}</p><button type="button" className="secondary-button" onClick={()=>setRetry(value=>value+1)}>{tr("Retry")}</button></div>}
  {order?<>
   <div className="cw-panel bd-summary"><div><span className="bd-status">{tr("Draft · not submitted")}</span><h2>{(order.event?.type==='other'?order.event?.title:eventTypeLabel(order.event?.type,ar))||tr("Your event, taking shape")}</h2><p>{[order.event?.date,order.event?.venue?.name,order.event?.venue?.city].filter(Boolean).join(' · ')||tr("Add your event details to get started.")}</p>{saved&&<small>{tr("Saved to your account")} · {saved} ({tr("Toronto time")})</small>}</div><a className="primary-button" href="/#event-order">{tr("Continue your draft")}<ArrowUpRight size={15}/></a><div className="bd-progress"><span><strong>{completed} {tr("of")} {required}</strong>{tr("required details completed")}</span><progress value={completed} max={required||1} aria-label={tr("Required booking details completed")}/><small>{tr("This draft has not been sent as a booking request.")}</small></div></div>
   <h2 className="bd-steps-title" id="booking-draft-steps">{tr("Booking steps")}</h2>
   <BookingDraftReview order={order} tabbed ar={ar}/>
  </>:current.loading?<div className="cw-panel" role="status">{tr("Loading your account draft…")}</div>:!current.error&&<div className="cw-panel cw-empty"><FileText size={30}/><h2>{tr("No booking draft yet")}</h2><p>{tr("Start planning your event. Your draft will be saved to your account and appear here.")}</p><a className="primary-button" href="/#event-order">{tr("Start your booking draft")}<ArrowUpRight size={15}/></a></div>}
 </section>;
}
