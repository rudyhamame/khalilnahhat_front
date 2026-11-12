import {useEffect,useId,useRef,useState} from 'react';
import {Check,X} from 'lucide-react';
import './multipleReferences.css';
import ReferenceSearchInput,{normalizeReference} from './ReferenceSearchInput';
const pickerOpened='echo:reference-picker-opened';
export default function MultipleReferences({label,rows,value=[],onChange,onCreate,maxSelections=100}){
 const id=useId(),[query,setQuery]=useState(''),[open,setOpen]=useState(false),picker=useRef(null),trigger=useRef(null);
 const selected=Array.isArray(value)?value:[];
 const available=rows.filter(row=>row&&typeof row.id==='string'&&typeof row.name==='string');
 const names=new Map(available.map(row=>[row.id,row.name]));
 const normalized=normalizeReference(query);
 const matches=open?available.filter(row=>normalizeReference(row.name).includes(normalized)):[];
 useEffect(()=>{
  if(!open)return;
  const closeOutside=event=>{if(!picker.current?.contains(event.target))setOpen(false);};
  const closeOther=event=>{if(event.detail!==id)setOpen(false);};
  const escape=event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setOpen(false);trigger.current?.focus();}};
  document.addEventListener('pointerdown',closeOutside,true);
  document.addEventListener('focusin',closeOutside,true);
  document.addEventListener('keydown',escape,true);
  window.addEventListener(pickerOpened,closeOther);
  return()=>{document.removeEventListener('pointerdown',closeOutside,true);document.removeEventListener('focusin',closeOutside,true);document.removeEventListener('keydown',escape,true);window.removeEventListener(pickerOpened,closeOther);};
 },[open,id]);
 const toggle=()=>{if(!open)window.dispatchEvent(new CustomEvent(pickerOpened,{detail:id}));setOpen(!open);};
 const choose=(row,checked)=>onChange(checked?[...new Set([...selected,row.id])]:selected.filter(id=>id!==row.id));
 return <div className="work-multiselect">
  <span id={id}>{label}</span>
  <div className="work-selected-tags">{selected.map(id=><span key={id} className="work-selected-tag"><span className="work-selected-tag-label">{names.get(id)||id}</span><button type="button" className="work-selected-tag-remove" aria-label={`Remove ${names.get(id)||id}`} title={`Remove ${names.get(id)||id}`} onClick={()=>onChange(selected.filter(value=>value!==id))}><X size={14} strokeWidth={2.5} aria-hidden="true"/></button></span>)}</div>
  <div ref={picker} className={`work-reference-dropdown${open?' is-open':''}`}>
   <button ref={trigger} type="button" className="work-reference-trigger" aria-expanded={open} aria-controls={`${id}-options`} onClick={toggle}><span>Choose {label.toLowerCase()}</span><span>{selected.length||'+'}</span></button>
   {open&&<div id={`${id}-options`} className="work-multiselect-menu" role="group" aria-labelledby={id}>
    <ReferenceSearchInput label={label} query={query} onQueryChange={setQuery} rows={available} onCreate={onCreate?async name=>{await onCreate(name);setOpen(false);}:undefined}/>
    <div role="listbox" aria-multiselectable="true" aria-labelledby={id}>{matches.map(row=>{const on=selected.includes(row.id);return <button key={row.id} type="button" role="option" aria-selected={on} className={`work-option${on?' is-on':''}`} disabled={!on&&selected.length>=maxSelections} onClick={()=>choose(row,!on)}><span>{row.name}</span>{on&&<Check size={14} strokeWidth={2.5} aria-hidden="true"/>}</button>;})}{!matches.length&&<p>{available.length?'No matches.':'No entries available yet.'}</p>}</div>
   </div>}
  </div>
 </div>;
}
