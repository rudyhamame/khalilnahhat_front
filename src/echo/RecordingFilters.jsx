import {useEffect,useState} from 'react';
import {Archive,Music2,Languages,Layers,Search} from 'lucide-react';
import {musicOntologyContract as contract,workTypeLabel} from '../lib/musicOntology';
import {ReferenceField,KeyField} from './OntologyFields';
import './recordingFilters.css';

// The Filters column of the Recordings page. It follows the shape of the data itself, exactly like the recording editor does:
//   Recording  (what the Recording information holds: status, type, content)
//   Atoms      (what each atom holds: tempo, key, rhythms, genres, musicians, instruments, language, vocalists)
// The filter keys are the archive's own, so the list queries stay the same.
const Section=({icon:Icon,title,note,children})=><section className="rf-section"><header><span className="rf-icon" aria-hidden="true"><Icon size={16}/></span><div><h3>{title}</h3>{note&&<p>{note}</p>}</div></header><div className="rf-fields">{children}</div></section>;
const Field=({label,children})=><label className="rf-field"><span>{label}</span>{children}</label>;

// A text box that applies its text to one filter key after a short pause, so the list is not refreshed on every keystroke.
function SearchField({label,filterKey,placeholder,value,onChange}){
 const [text,setText]=useState(value[filterKey]||'');
 useEffect(()=>{setText(value[filterKey]||'');},[value[filterKey]]);// eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{if((value[filterKey]||'')===text.trim())return undefined;const timer=setTimeout(()=>onChange({...value,[filterKey]:text.trim()}),300);return()=>clearTimeout(timer);},[text]);// eslint-disable-line react-hooks/exhaustive-deps
 return <Field label={label}><span className="rf-search"><Search size={14} aria-hidden="true"/><input type="search" aria-label={placeholder} placeholder={placeholder} value={text} onChange={event=>setText(event.target.value)}/></span></Field>;
}
const asList=v=>Array.isArray(v)?v:v?[v]:[];
const clock=minutes=>`${Math.floor(minutes)}:${String(Math.round((minutes%1)*60)).padStart(2,'0')}`;
// Two-point bar: the left point is the lowest value, the right point the highest. Both at the ends = no limit. (Used for duration and BPM.)
function RangeBar({min=0,max,low,high,step=1,format=value=>String(value),label,onChange}){
 const lo=Math.min(Math.max(low??min,min),max),hi=Math.max(Math.min(high??max,max),lo),span=Math.max(max-min,1e-9);
 const set=(a,b)=>onChange(a<=min&&b>=max?['','']:[a,b]);
 return <div className="rf-range"><div className="rf-range-values"><span>{format(lo)}</span><span>{format(hi)}</span></div>
  <div className="rf-range-bar"><i style={{left:`${(lo-min)/span*100}%`,right:`${100-(hi-min)/span*100}%`}}/>
   <input type="range" min={min} max={max} step={step} value={lo} aria-label={`Lowest ${label}`} onChange={event=>set(Math.min(Number(event.target.value),hi),hi)}/>
   <input type="range" min={min} max={max} step={step} value={hi} aria-label={`Highest ${label}`} onChange={event=>set(lo,Math.max(Number(event.target.value),lo))}/></div></div>;
}
export default function RecordingFilters({value,onChange,vocabulary=[],workTypes=[],collectionSelect=null,collectionTools=null,durationMax=10,bpmBounds=[60,200]}){
 const change=(key,v)=>{const next={...value,[key]:v??''};if(key==='contentType'&&v==='MUSIC')for(const k of ['language','dialect','region'])next[k]='';if(key==='language')next.dialect='';onChange(next);};
 const reference=(key,label,kind,extra={})=><ReferenceField allowCreate={false} label={label} kind={kind} vocabulary={vocabulary} value={value[key]} onChange={v=>change(key,v)} {...extra}/>;
 return <div className="rf">
  <Section icon={Layers} title="Recording" note="Recording information">
   <SearchField label="Recording name" filterKey="q" placeholder="Search recording names…" value={value} onChange={onChange}/>
   <Field label="Status"><select value={value.status||'ALL'} onChange={e=>change('status',e.target.value)}><option value="ALL">All</option>{contract.recordingStatuses.map(v=><option key={v}>{v}</option>)}</select></Field>
   <Field label="Work type"><select value={value.workType||''} onChange={e=>change('workType',e.target.value)}><option value="">All work types</option>{workTypes.map(type=><option key={type.id} value={type.id}>{type.name}</option>)}</select></Field>
   <Field label="Content"><select value={value.contentType||''} onChange={e=>change('contentType',e.target.value)}><option value="">All content</option>{contract.workTypes.map(v=><option key={v} value={v}>{workTypeLabel(v)}</option>)}</select></Field>
   <Field label="Duration (min)"><RangeBar max={durationMax} step={.25} format={clock} label="duration" low={asList(value.durationMin).length?Number(value.durationMin):null} high={asList(value.durationMax).length?Number(value.durationMax):null} onChange={([a,b])=>onChange({...value,durationMin:a,durationMax:b})}/></Field>
   {collectionSelect}
   {collectionTools}
  </Section>
  <Section icon={Music2} title="Atoms · Sound" note="Key, rhythm, genre, players">
   <KeyField multiple label="Musical keys" value={asList(value.key)} onChange={v=>change('key',v)}/>
   {reference('rhythm','Rhythms','rhythm',{multiple:true,value:asList(value.rhythm)})}
   {reference('genre','Genres','genre',{multiple:true,value:asList(value.genre)})}
   {reference('instrument','Instruments','instrument',{multiple:true,value:asList(value.instrument)})}
   {reference('musician','Musicians','musician',{multiple:true,value:asList(value.musician)})}
   <Field label="BPM"><RangeBar min={bpmBounds[0]} max={bpmBounds[1]} step={1} label="BPM" low={asList(value.bpmMin).length?Number(value.bpmMin):null} high={asList(value.bpmMax).length?Number(value.bpmMax):null} onChange={([a,b])=>onChange({...value,bpmMin:a,bpmMax:b})}/></Field>
  </Section>
  {value.contentType!=='MUSIC'&&<Section icon={Languages} title="Atoms · Lyrics" note="Language, dialect and vocalists">
   {reference('language','Language','language')}
   {reference('dialect','Dialect','dialect',{parentId:value.language})}
   {reference('artist','Vocalists','artist')}
  </Section>}
  {value.contentType==='MUSIC'&&<Section icon={Archive} title="Atoms · Credits" note="Vocalists">{reference('artist','Vocalists','artist')}</Section>}
 </div>;
}
