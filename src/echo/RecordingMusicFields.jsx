import {useState} from 'react';
import {Plus,X} from 'lucide-react';
import {KeyField,MetadataStates} from './OntologyFields';

export default function RecordingMusicFields({value,onChange,vocabulary}){
 const [bpm,setBpm]=useState('');
 const bpms=value.bpms||[],keys=value.keys||[],genreIds=value.genreIds||[];
 const genres=vocabulary.filter(v=>v.kind==='genre');
 const change=(field,entries)=>{
  const states={...value.states,[field]:entries.length?'SPECIFIED':'MISSING'};
  const next={...value,[field]:entries,states};
  if(field==='bpms'){next.bpm=entries[0]??null;states.bpm=states.bpms;}
  if(field==='keys'){next.key=entries[0]??null;states.key=states.keys;}
  onChange(next);
 };
 const addBpm=()=>{const number=Number(bpm);if(!bpm||!Number.isFinite(number)||number<=0||number>1000)return;if(!bpms.includes(number))change('bpms',[...bpms,number]);setBpm('');};
 const chips=(field,entries,label)=> <div className="recording-value-chips">{entries.map(entry=><span key={entry}>{label(entry)}<button type="button" aria-label={`Remove ${label(entry)}`} onClick={()=>change(field,entries.filter(v=>v!==entry))}><X size={12}/></button></span>)}</div>;
 return <div className="recording-music-fields">
  <div className="recording-music-field"><header><strong>Recording BPM</strong><small>Add each tempo used in the recording.</small></header>{chips('bpms',bpms,n=>`${n} BPM`)}<div className="recording-bpm-add"><label className="recording-bpm-input">Add BPM<input type="number" min="0.01" max="1000" step="any" placeholder="e.g. 120" value={bpm} onChange={e=>setBpm(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addBpm();}}}/></label><button type="button" aria-label="Add recording BPM" disabled={!bpm||Number(bpm)<=0||Number(bpm)>1000||bpms.length>=100} onClick={addBpm}><Plus size={15}/>Add</button></div></div>
  <div className="recording-music-field"><header><strong>Recording key</strong><small>Choose all keys used in this recording.</small></header>{chips('keys',keys,key=>key)}<KeyField label="Add key" value="" onChange={key=>{if(key&&!keys.includes(key)&&keys.length<100)change('keys',[...keys,key]);}}/></div>
  <div className="recording-music-field"><header><strong>Recording genre</strong><small>Choose one or more genres for this recording.</small></header>{chips('genreIds',genreIds,id=>genres.find(g=>g.id===id)?.name||id)}<label>Add genre<select value="" disabled={genreIds.length>=100} onChange={e=>{if(e.target.value)change('genreIds',[...genreIds,e.target.value]);}}><option value="">Choose genre…</option>{genres.filter(g=>!genreIds.includes(g.id)).map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>{!genres.length&&<small>No genre entries yet. Add them through Manage detail entries in Content.</small>}</div>
  <MetadataStates fields={['bpms','keys','genreIds']} value={value.states} onChange={states=>onChange({...value,states:{...states,bpm:bpms.length?'SPECIFIED':states.bpms||'MISSING',key:keys.length?'SPECIFIED':states.keys||'MISSING'}})}/>
 </div>;
}
