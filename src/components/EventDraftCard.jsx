import {useEffect,useState} from 'react';
import {apiRequest} from '../lib/api';
import {missingOrderFields,contract,getPath} from '../lib/eventOrderCore.mjs';

export default function EventDraftCard({token}){
  const [state,setState]=useState({loading:true,item:null,error:''}),[retry,setRetry]=useState(0);
  useEffect(()=>{
    let alive=true;setState({loading:true,item:null,error:''});
    apiRequest('/ai-booking/event-draft',{token}).then(({item})=>{if(alive)setState({loading:false,item,error:''});}).catch(()=>{if(alive)setState({loading:false,item:null,error:'Your saved draft could not be loaded. Please retry.'});});
    return()=>{alive=false;};
  },[token,retry]);
  const order=state.item?.order;
  const required=order?contract.sections.filter(section=>!section.gate||getPath(order,section.gate)===true).flatMap(section=>section.fields.filter(field=>field.required)).length:0;
  return <section className="cw-panel" aria-label="Saved event draft">
    <h2>Your event draft</h2>
    {state.loading?<p role="status">Loading your account draft…</p>:state.error?<><p role="alert">{state.error}</p><button type="button" className="secondary-button" onClick={()=>setRetry(value=>value+1)}>Retry</button></>:order?<>
      <span className="cw-status">Draft · not submitted</span><h3>{order.event?.name||'Your event, taking shape.'}</h3>
      <p>{[order.event?.date,order.event?.type,order.event?.venue?.city].filter(Boolean).join(' · ')||'Event details in progress'}</p>
      <p>{required-missingOrderFields(order).length} / {required} required details completed</p>
      <small>Saved to your account {state.item.updatedAt?new Date(state.item.updatedAt).toLocaleString('en-CA',{timeZone:'America/Toronto'}):''}</small>
      <p><a className="primary-button" href="/#event-order">Resume draft</a></p>
      <details><summary>View saved event details</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontSize:12}}>{JSON.stringify(order,null,2)}</pre></details>
    </>:<p>No saved event draft yet. Start a conversation or select your setup to create one.</p>}
  </section>;
}
