import {useId,useState} from 'react';
import {Network,Search} from 'lucide-react';
import {ATOM_KEYS} from '../lib/bookingAtoms.mjs';
import {bookingAtomTree,filterAtomTree} from './docs/bookingAtomTree';
import {bookingDataAtomsGuideRoute} from './docs/bookingDataAtomsGuide';
import './bookingAtomTree.css';

function Atom({atom}){
 const required=atom.key==='event.title'?'Required when event.type = other':atom.required?'Required':'Optional';
 return <li className="bat-atom"><div className="bat-atom-heading">{atom.code&&<span className="bat-code">{atom.code}</span>}<strong>{atom.name}</strong><span className="bat-type">{atom.type}</span></div><code className="bat-key">{atom.key}</code>
 <div className="bat-rules"><span>{required}</span>{atom.gate&&<span>Shown when <code>{atom.gate} = true</code></span>}{atom.key==='event.title'&&<span>Also shown while a saved description exists</span>}{atom.input.maxLength&&<span>Up to {atom.input.maxLength} characters</span>}{atom.type==='number'&&<span>Whole number · {atom.input.min}–{atom.input.max}</span>}{atom.locked==='account'&&<span>From account when signed in</span>}<span>{atom.aiEditable?'AI can update':'Manual or account entry'}</span></div>
 {atom.choices.length>0&&<details className="bat-options"><summary>Allowed values ({atom.choices.length})</summary><ul>{atom.choices.map(choice=><li key={choice.value}><code>{choice.value}</code><span>{choice.label}</span></li>)}</ul></details>}</li>;
}
export default function BookingAtomTree(){
 const [query,setQuery]=useState(''),[closed,setClosed]=useState(new Set()),id=useId();
 const {steps,support}=filterAtomTree(query),searching=Boolean(query.trim()),count=steps.reduce((total,step)=>total+step.sections.reduce((sum,section)=>sum+section.atoms.length,0),0);
 const isOpen=key=>searching||!closed.has(key);
 const toggle=(event,key)=>{if(event.target!==event.currentTarget)return;const open=event.currentTarget.open;setClosed(previous=>{if(previous.has(key)===!open)return previous;const next=new Set(previous);if(open)next.delete(key);else next.add(key);return next;});};
 const collapse=()=>setClosed(new Set([...bookingAtomTree.flatMap(step=>[step.id,...step.sections.map(section=>section.code)]),'support']));
 return <article className="booking-atom-tree" aria-labelledby={`${id}-title`}>
 <header className="bat-header"><p><Network size={16} aria-hidden="true"/> ECHO DOCS</p><h1 id={`${id}-title`}>Data Atoms Booking Tree</h1><p>The booking data model, from each step down to its saved fields. Generated from the shared booking contracts.</p><a href={bookingDataAtomsGuideRoute}>Read the Booking Data Atoms guide →</a></header>
 <div className="bat-toolbar"><label className="bat-search" htmlFor={`${id}-search`}><Search size={17} aria-hidden="true"/><span className="bat-sr-only">Search atoms by name, key, code or type</span><input id={`${id}-search`} type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Find an atom, key, code or type…"/></label><div className="bat-actions"><button type="button" onClick={()=>setClosed(new Set())} disabled={searching}>Expand all</button><button type="button" onClick={collapse} disabled={searching}>Collapse all</button></div></div>
 <p className="bat-count" role="status">{count} of {ATOM_KEYS.length} booking atoms · {support.length} supporting fields</p>
 <ul className="bat-tree">{steps.map(step=><li key={step.id}><details open={isOpen(step.id)} onToggle={event=>toggle(event,step.id)}><summary><span className="bat-code">{step.code}</span><strong>{step.title}</strong><span className="bat-summary-count">{step.sections.reduce((sum,section)=>sum+section.atoms.length,0)} atoms</span></summary><ul>{step.sections.map(section=><li key={section.code}><details open={isOpen(section.code)} onToggle={event=>toggle(event,section.code)}><summary><span className="bat-code">{section.code}</span><strong>{section.title}</strong><span className="bat-summary-count">{section.atoms.length}</span></summary><ul>{section.atoms.map(atom=><Atom key={atom.key} atom={atom}/>)}</ul></details></li>)}</ul></details></li>)}
 {support.length>0&&<li><details open={isOpen('support')} onToggle={event=>toggle(event,'support')}><summary><strong>Supporting fields</strong><span className="bat-summary-count">{support.length}</span></summary><p className="bat-note">Service selections and venue coordinates/provenance support the booking. They do not have client atom numbers. Equipment is a separate catalogue selection of item IDs, names and whole quantities.</p><ul>{support.map(atom=><Atom key={atom.key} atom={atom}/>)}</ul></details></li>}</ul>
 {count===0&&support.length===0&&<p className="bat-empty">No atoms match “{query}”. <button type="button" onClick={()=>setQuery('')}>Clear search</button></p>}
 <footer className="bat-note">Music preferences follow the DJ/MC decision. Optional fields can stay unanswered; explicit No and zero remain saved answers. This tree describes the schema and does not show client booking data.</footer>
 </article>;
}
