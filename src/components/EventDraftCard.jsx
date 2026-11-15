import {useEffect,useState} from 'react';
import {ArrowUpRight,RefreshCw,FileText} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {missingOrderFields,contract,getPath} from '../lib/eventOrderCore.mjs';
import {eventTypeLabel} from '../lib/eventTypeLabel';
import BookingDraftDetails from './BookingDraftDetails';
import './bookingDraft.css';

const savedDate=value=>value&&!Number.isNaN(Date.parse(value))?new Date(value).toLocaleString('en-CA',{timeZone:'America/Toronto',dateStyle:'medium',timeStyle:'short'}):'';
export default function EventDraftCard({token}){
 const [state,setState]=useState({token,loading:true,item:null,error:''}),[retry,setRetry]=useState(0);
 useEffect(()=>{
  if(!token)return;
  let alive=true;const controller=new AbortController();
  setState(previous=>({token,loading:true,item:previous.token===token?previous.item:null,error:''}));
  apiRequest('/ai-booking/event-draft',{token,signal:controller.signal}).then(({item})=>{if(alive)setState({token,loading:false,item,error:''});}).catch(()=>{if(alive)setState(previous=>({...previous,token,loading:false,error:'Your saved draft could not be loaded. Please retry.'}));});
  return()=>{alive=false;controller.abort();};
 },[token,retry]);
 useEffect(()=>{
  const refresh=()=>{if(!document.hidden)setRetry(value=>value+1);};
  window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  return()=>{window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[]);
 const current=state.token===token?state:{loading:true,item:null,error:''};
 const order=current.item?.order;
 const required=order?contract.sections.filter(section=>!section.gate||getPath(order,section.gate)===true).flatMap(section=>section.fields.filter(field=>field.required)).length:0;
 const completed=order?Math.max(0,required-missingOrderFields(order).length):0;
 const saved=savedDate(current.item?.updatedAt);
 return <section className="booking-draft" aria-labelledby="booking-draft-title" aria-busy={current.loading}>
  <header className="cw-heading"><div><h1 id="booking-draft-title">Booking draft</h1><p>Your saved event plan, with every detail you have added so far.</p></div><button type="button" className="secondary-button bd-refresh" disabled={current.loading||!token} onClick={()=>setRetry(value=>value+1)}><RefreshCw size={15}/>{current.loading?'Refreshing…':'Refresh draft'}</button></header>
  {current.error&&<div className="cw-panel bd-error" role="alert"><p>{current.error}{order?' Showing your last loaded draft.':''}</p><button type="button" className="secondary-button" onClick={()=>setRetry(value=>value+1)}>Retry</button></div>}
  {order?<>
   <div className="cw-panel bd-summary"><div><span className="bd-status">Draft · not submitted</span><h2>{order.event?.title||order.event?.name||eventTypeLabel(order.event?.type)||'Your event, taking shape'}</h2><p>{[order.event?.date,order.event?.venue?.name,order.event?.venue?.city].filter(Boolean).join(' · ')||'Add your event details to get started.'}</p>{saved&&<small>Saved to your account · {saved} (Toronto time)</small>}</div><a className="primary-button" href="/#event-order">Continue your draft<ArrowUpRight size={15}/></a><div className="bd-progress"><span><strong>{completed} of {required}</strong> required details completed</span><progress value={completed} max={required||1} aria-label="Required booking details completed"/><small>This draft has not been sent as a booking request.</small></div></div>
   <BookingDraftDetails order={order}/>
  </>:current.loading?<div className="cw-panel" role="status">Loading your account draft…</div>:!current.error&&<div className="cw-panel cw-empty"><FileText size={30}/><h2>No booking draft yet</h2><p>Start planning your event. Your draft will be saved to your account and appear here.</p><a className="primary-button" href="/#event-order">Start your booking draft<ArrowUpRight size={15}/></a></div>}
 </section>;
}
