import {useEffect,useRef,useState} from 'react';
import {Wand2} from 'lucide-react';
import {decodeMono} from '../lib/decodeMono';
import {detectLanguageSegments} from '../lib/languageDetection';
import {detectDialect} from '../lib/dialectDetection';
import {ensureWorkerReady} from '../lib/workerLoad';
import {automate} from '../lib/recordingAutomation';
import './languageAuto.css';

const english=new Intl.DisplayNames(['en'],{type:'language'}),label=code=>{try{return english.of(code)||code;}catch{return code;}};
// Match a Whisper language code to a language in the vocabulary: by ISO code first, then by English name.
const match=(code,vocabulary)=>{const rows=vocabulary.filter(row=>row.kind==='language'),name=label(code).toLowerCase();return rows.find(row=>String(row.isoCode||'').toLowerCase()===code)||rows.find(row=>String(row.name||'').toLowerCase()===name);};
// Automatic language: listens to the recording (a small speech model that runs in this browser, nothing is uploaded) and fills the Languages field.
const DIALECT_WORDS={Lebanese:['lebanese'],Syrian:['syrian'],Palestinian:['palestinian'],Egyptian:['egyptian'],Gulf:['gulf','khaleeji','khaliji','emirati','saudi','kuwaiti','qatari','bahraini','omani'],Iraqi:['iraqi'],Maghrebi:['maghreb','moroccan','algerian','tunisian','darija'],Sudanese:['sudanese'],Yemeni:['yemeni'],Standard:['standard','msa','fusha','modern']};
const matchDialect=(name,vocabulary)=>vocabulary.filter(row=>row.kind==='dialect').find(row=>{const text=String(row.name||'').toLowerCase();return (DIALECT_WORDS[name]||[name.toLowerCase()]).some(word=>text.includes(word));});
export default function LanguageAuto({token,audioUrl,vocabulary=[],value={languageIds:[],dialectIds:[]},onChange}){
 const languageIds=value.languageIds||[],dialectIds=value.dialectIds||[];
 const [state,setState]=useState('idle'),[note,setNote]=useState(null),[progress,setProgress]=useState(''),latest=useRef(),autoId=useRef('');
 const run=async()=>{
  if(!audioUrl||state==='running')return;setState('running');setNote(null);setProgress('Checking the OVH server…');
  try{
   await ensureWorkerReady(token);setProgress('Sending the recording to the server…');
   const {samples}=await decodeMono(audioUrl,16000);
   const result=await detectLanguageSegments(samples,{token,onStep:(step,total)=>setProgress(`Listening for the language… clip ${step} of ${total}`)});
   const matched=result.languages.map(item=>({...item,name:label(item.code),row:match(item.code,vocabulary)}));
   const nextLanguages=[...languageIds,...matched.filter(item=>item.row).map(item=>item.row.id).filter(id=>!languageIds.includes(id))];
   let dialect=null,nextDialects=dialectIds;
   // Dialect: only for Arabic. Transcribe a few clips and look for dialect words; this is a suggestion with its evidence shown.
   if(result.languages.some(item=>item.code==='ar')){
    try{
     const found=await detectDialect(samples,{token,onStep:(step,total)=>setProgress(`Listening for dialect words… clip ${step} of ${total}`)});
     const items=found.dialects.map(item=>({...item,row:matchDialect(item.name,vocabulary)}));
     nextDialects=[...dialectIds,...items.filter(item=>item.row).map(item=>item.row.id).filter(id=>!dialectIds.includes(id))];
     dialect={...found,items};
    }catch(error){dialect={error:error?.message||'The dialect could not be detected.',items:[]};}
   }
   if(nextLanguages.length!==languageIds.length||nextDialects.length!==dialectIds.length)onChange({languageIds:nextLanguages,dialectIds:nextDialects});
   setNote({...result,matched,dialect});setState('done');
  }catch(error){setNote({error:error?.message||'The language could not be detected.'});setState('error');}
  finally{setProgress('');}
 };
 latest.current=run;
 // Automatic once per recording when nothing is chosen yet.
 useEffect(()=>{
  if(!audioUrl||languageIds.length||!vocabulary.length)return undefined;
  if(autoId.current===audioUrl)return undefined;
  autoId.current=audioUrl;automate(audioUrl,'language',()=>latest.current());
  return undefined;
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[audioUrl,languageIds.length,vocabulary.length]);
 if(!audioUrl)return null;
 return <div className="language-auto">
  <button type="button" disabled={state==='running'} onClick={run}><Wand2 size={13}/>{state==='running'?'Listening…':'Detect language automatically'}</button>
  {progress&&<small role="status">{progress}</small>}
  {note?.error&&<p className="is-error" role="alert">{note.error}</p>}
  {note&&!note.error&&(note.instrumental
   ?<p className="is-info" role="status">No clear speech or singing was found, so this looks instrumental. No language was set.</p>
   :<p className={note.multiple?'is-multiple':'is-single'} role="status"><strong>{note.multiple?`${note.matched.length} languages found in this recording: `:'One language found: '}</strong>{note.matched.map(item=>`${item.name}${note.multiple?` (${Math.round(item.share*100)}%)`:''}${item.row?'':' — not in your language list yet'}`).join(', ')}.{!note.multiple||' Both were added.'}</p>)}
  {note?.dialect&&(note.dialect.error
   ?<p className="is-error" role="alert">{note.dialect.error}</p>
   :note.dialect.items.length
    ?<p className={note.dialect.items.length>1?'is-multiple':'is-single'} role="status"><strong>{note.dialect.items.length>1?'More than one dialect found: ':'Dialect: '}</strong>{note.dialect.items.map(item=>`${item.name}${note.dialect.items.length>1?` (${Math.round(item.share*100)}%)`:''} — words like ${item.found.slice(0,4).join('، ')}${item.row?'':' — not in your dialect list yet'}`).join('; ')}.{note.dialect.sample&&<small className="language-auto-hint"> Heard: “{note.dialect.sample}…”</small>}</p>
    :<p className="is-info" role="status">Dialect: {note.dialect.reason||'not clear enough to judge.'} Choose it yourself below.</p>)}
  {note&&!note.error&&!note.instrumental&&!note.dialect&&<small className="language-auto-hint">The dialect is only suggested for Arabic. Choose it yourself below.</small>}
 </div>;
}
