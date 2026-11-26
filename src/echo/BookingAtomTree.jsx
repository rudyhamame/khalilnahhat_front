import {useEffect,useId,useState} from 'react';
import {Network,Search} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {setBookingRules} from '../lib/bookingRules';
import {ATOM_KEYS} from '../lib/bookingAtoms.mjs';
import {bookingAtomTree,filterAtomTree} from './docs/bookingAtomTree';
import {exportBookingAtomTreePdf} from './docs/bookingAtomTreePdf';
import {bookingDataAtomsGuideRoute} from './docs/bookingDataAtomsGuide';
import './bookingAtomTree.css';

function Atom({atom:base,rule={},edit=false,onRule}){
 const atom={...base,required:rule.required??base.required,input:{...base.input,maxLength:rule.maxLength??base.input.maxLength},choices:rule.options?base.choices.filter(choice=>rule.options.includes(choice.value)):base.choices};
 const required=atom.key==='event.title'&&rule.required===undefined?'Required when event.type = other':atom.required?'Required':'Optional';
 return <li className="bat-atom"><div className="bat-atom-heading">{atom.code&&<span className="bat-code">{atom.code}</span>}<strong>{atom.name}{atom.required?' *':''}</strong><span className="bat-type">{atom.type}</span></div><code className="bat-key">{atom.key}</code>
 <div className="bat-rules"><span>{required}</span>{atom.gate&&<span>Shown when <code>{atom.gate} = true</code></span>}{atom.key==='event.title'&&<span>Also shown while a saved description exists</span>}{atom.input.maxLength&&<span>Up to {atom.input.maxLength} characters</span>}{atom.type==='number'&&<span>Whole number · {atom.input.min}–{atom.input.max}</span>}{atom.locked==='account'&&<span>From account when signed in</span>}<span>{atom.aiEditable?'AI can update':'Manual or account entry'}</span></div>
 {edit&&<div className="bat-edit"><label><input type="checkbox" checked={Boolean(atom.required)} onChange={event=>onRule(base.key,{required:event.target.checked})}/> Required</label>{base.input.maxLength&&<label>Max characters <input type="number" min="1" max="3000" value={atom.input.maxLength} onChange={event=>onRule(base.key,{maxLength:Math.max(1,Math.min(3000,Number(event.target.value)||1))})}/></label>}{base.choices.length>0&&<fieldset><legend>Allowed values</legend>{base.choices.map(choice=><label key={choice.value}><input type="checkbox" checked={atom.choices.some(item=>item.value===choice.value)} onChange={event=>{const now=atom.choices.map(item=>item.value),next=event.target.checked?base.choices.map(item=>item.value).filter(value=>value===choice.value||now.includes(value)):now.filter(value=>value!==choice.value);if(next.length)onRule(base.key,{options:next});}}/> {choice.label}</label>)}</fieldset>}</div>}
 {!edit&&atom.choices.length>0&&<details className="bat-options"><summary>Allowed values ({atom.choices.length})</summary><ul>{atom.choices.map(choice=><li key={choice.value}><code>{choice.value}</code><span>{choice.label}</span></li>)}</ul></details>}</li>;
}
export default function BookingAtomTree({token}){
 const [rules,setRules]=useState({}),[draft,setDraft]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{let alive=true;apiRequest('/booking-rules').then(({rules:saved})=>{if(alive)setRules(saved||{});}).catch(()=>{});return()=>{alive=false;};},[]);
 const edit=Boolean(draft),shown=draft||rules,onRule=(key,patch)=>setDraft(current=>({...current,[key]:{...current[key],...patch}}));
 const save=async()=>{setBusy(true);setMessage('');try{const {rules:saved}=await apiRequest('/admin/booking-rules',{method:'PUT',token,body:{rules:draft}});setRules(saved);setBookingRules(saved);setDraft(null);setMessage('Saved. The Booking page now uses these rules.');}catch(error){setMessage(error.message);}finally{setBusy(false);}};
 const [query,setQuery]=useState(''),[closed,setClosed]=useState(new Set()),id=useId();
 const {steps}=filterAtomTree(query),searching=Boolean(query.trim()),count=steps.reduce((total,step)=>total+step.sections.reduce((sum,section)=>sum+section.atoms.length,0),0);
 const isOpen=key=>searching||!closed.has(key);
 const toggle=(event,key)=>{if(event.target!==event.currentTarget)return;const open=event.currentTarget.open;setClosed(previous=>{if(previous.has(key)===!open)return previous;const next=new Set(previous);if(open)next.delete(key);else next.add(key);return next;});};
 const collapse=()=>setClosed(new Set([...bookingAtomTree.flatMap(step=>[step.id,...step.sections.map(section=>section.code)])]));
 return <article className="booking-atom-tree" aria-labelledby={`${id}-title`}>
 <header className="bat-header"><p><Network size={16} aria-hidden="true"/> ECHO DOCS</p><h1 id={`${id}-title`}>Data Atoms Booking Tree</h1><p>The booking data model, from each step down to its saved fields. Generated from the shared booking contracts.</p><a href={bookingDataAtomsGuideRoute}>Read the Booking Data Atoms guide →</a></header>
 <div className="bat-toolbar"><label className="bat-search" htmlFor={`${id}-search`}><Search size={17} aria-hidden="true"/><span className="bat-sr-only">Search atoms by name, key, code or type</span><input id={`${id}-search`} type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Find an atom, key, code or type…"/></label><div className="bat-actions"><button type="button" onClick={()=>setClosed(new Set())} disabled={searching}>Expand all</button><button type="button" onClick={collapse} disabled={searching}>Collapse all</button><button type="button" onClick={()=>{if(!exportBookingAtomTreePdf())setMessage('Allow pop-ups to export the PDF.');}}>Export PDF</button></div></div>
 {token&&<div className="bat-actions">{edit?<><button type="button" disabled={busy} onClick={save}>{busy?'Saving…':'Save rules'}</button><button type="button" disabled={busy} onClick={()=>{setDraft(null);setMessage('');}}>Cancel</button></>:<button type="button" onClick={()=>{setDraft(structuredClone(rules));setMessage('');}}>Edit rules</button>}{message&&<span className="bat-note" role="status">{message}</span>}</div>}
 <p className="bat-count" role="status">{count} of {ATOM_KEYS.length} booking atoms</p>
 <ul className="bat-tree">{steps.map(step=><li key={step.id}><details open={isOpen(step.id)} onToggle={event=>toggle(event,step.id)}><summary><span className="bat-code">{step.code}</span><strong>{step.title}</strong><span className="bat-summary-count">{step.sections.reduce((sum,section)=>sum+section.atoms.length,0)} atoms</span></summary><ul>{step.sections.map(section=><li key={section.code}><details open={isOpen(section.code)} onToggle={event=>toggle(event,section.code)}><summary><span className="bat-code">{section.code}</span><strong>{section.title}</strong><span className="bat-summary-count">{section.atoms.length}</span></summary><ul>{section.atoms.map(atom=><Atom key={atom.key} atom={atom} rule={shown[atom.key]} edit={edit} onRule={onRule}/>)}</ul></details></li>)}</ul></details></li>)}
</ul>
 {count===0&&<p className="bat-empty">No atoms match “{query}”. <button type="button" onClick={()=>setQuery('')}>Clear search</button></p>}
 <footer className="bat-note">Music preferences follow the DJ/MC decision. Optional fields can stay unanswered; explicit No and zero remain saved answers. This tree describes the schema and does not show client booking data.</footer>
 </article>;
}
