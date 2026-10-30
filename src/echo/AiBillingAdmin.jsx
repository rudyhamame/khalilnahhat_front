import {useEffect,useState} from 'react';
import {Bot,CheckCircle2,FileText,RefreshCw,Save,Tags,Users} from 'lucide-react';
import {apiRequest} from '../lib/api';
import './aiConfigurationAdmin.css';
import './aiBilling.css';
import AiBillingPanel from './AiBillingPanel';
const endpoint='/ai-booking/admin';
const VIEWS=[['usage','Usage & billing',Users],['policy','Customer pricing policy',Tags],['invoices','Invoices',FileText]];
const money=(value,currency='USD')=>new Intl.NumberFormat('en-CA',{style:'currency',currency,maximumFractionDigits:2}).format((value||0)/100);
export default function AiBillingAdmin({token}){
 const [view,setView]=useState('usage'),[data,setData]=useState(null),[draft,setDraft]=useState(null),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const load=async()=>{setLoading(true);setError('');setMessage('');try{const result=await apiRequest(`${endpoint}/config`,{token});setData(result);setDraft(structuredClone(result.item));}catch(e){setError(e.message);}finally{setLoading(false);}};
 useEffect(()=>{let alive=true;apiRequest(`${endpoint}/config`,{token}).then(result=>{if(alive){setData(result);setDraft(structuredClone(result.item));}}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[token]);
 const price=(key,value)=>{setMessage('');setDraft(current=>({...current,customerPricing:{...current.customerPricing,[key]:value}}));};
 const save=async event=>{event.preventDefault();setSaving(true);setError('');setMessage('');try{const result=await apiRequest(`${endpoint}/config`,{method:'PUT',token,body:draft});setDraft(result.item);setData(current=>({...current,item:result.item}));setMessage('Customer pricing policy saved.');}catch(e){setError(e.message);}finally{setSaving(false);}};
 const dirty=data&&draft&&JSON.stringify(data.item.customerPricing)!==JSON.stringify(draft.customerPricing);
 return <section className="echo-ai-admin eab-wide" aria-labelledby="echo-ai-billing-title">
  <header className="eai-title"><div className="eai-title-icon"><Bot size={25}/></div><div><span className="eai-eyebrow">ECHO AI / BILLING</span><h1 id="echo-ai-billing-title">Echo AI billing</h1><p>Customer pricing, usage and invoices.</p></div></header>
  <div className="eab-layout">
   <aside className="eab-aside" aria-label="Echo AI billing sections"><nav>{VIEWS.map(([key,label,Icon])=><button key={key} type="button" aria-current={view===key?'page':undefined} onClick={()=>setView(key)}><Icon size={15}/>{label}</button>)}</nav></aside>
   <div className="eab-main">
  {view==='policy'&&loading&&<p role="status" className="eai-notice">Loading billing…</p>}
  {view==='policy'&&error&&<div role="alert" className="eai-notice is-error">{error}<button type="button" onClick={load}>Reload</button></div>}
  {view==='policy'&&message&&<p role="status" className="eai-notice is-success"><CheckCircle2 size={17}/>{message}</p>}
  {view==='policy'&&!loading&&draft&&<form onSubmit={save}>
   <fieldset className="eab-policy"><legend>Customer pricing policy</legend>
    <label>Billing policy<select value={draft.customerPricing.policy} onChange={e=>price('policy',e.target.value)}><option value="included">Included · no charge</option><option value="manual_invoice">Paid · manual invoice</option></select></label>
    <label>Currency<select value={draft.customerPricing.currency} onChange={e=>price('currency',e.target.value)}><option>CAD</option><option>USD</option></select></label>
    <label>Chat reply<input required disabled={draft.customerPricing.policy==='included'} type="number" min="0" max="1000" step="0.01" value={draft.customerPricing.chatReplyCents/100} onChange={e=>price('chatReplyCents',Math.round(Number(e.target.value)*100))}/></label>
    <label>Voice session<input required disabled={draft.customerPricing.policy==='included'} type="number" min="0" max="1000" step="0.01" value={draft.customerPricing.voiceSessionCents/100} onChange={e=>price('voiceSessionCents',Math.round(Number(e.target.value)*100))}/></label>
    <div className="eab-policy-save"><span>{dirty?'Unsaved changes':`Revision ${draft.revision}`}</span><button type="button" disabled={saving} onClick={load} aria-label="Reload"><RefreshCw size={14}/></button><button className="eai-primary" disabled={saving||!dirty}><Save size={14}/>{saving?'Saving…':'Save'}</button></div>
    <p className="eab-policy-note"><strong>Customer sees:</strong> {draft.customerPricing.policy==='included'?'Chat and Voice are included.':`${money(draft.customerPricing.chatReplyCents,draft.customerPricing.currency)} per completed Chat reply · ${money(draft.customerPricing.voiceSessionCents,draft.customerPricing.currency)} per started Voice session (up to ${draft.voice.maxCallSeconds} seconds).`} Customers must accept the price before paid use. Failed replies and refusals are not billed.</p>
   </fieldset>
  </form>}
   <div hidden={view==='policy'}><AiBillingPanel token={token} admin view={view} onView={setView}/></div>
   </div>
  </div>
 </section>;
}
