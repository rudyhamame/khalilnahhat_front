import {Trash2} from 'lucide-react';
import './recordingInfo.css';
import {musicOntologyContract as contract} from '../lib/musicOntology';
import {workElementListId} from './WorkElementsContext';
import OntologyMediaUpload from './OntologyMediaUpload';
import RecordingAtomElements,{emptyAtomSound} from './RecordingAtomElements';
import RecordingAudioId,{audioHash} from './RecordingAudioId';
import RecordingInfoAuto from './RecordingInfoAuto';
import RecordingQr from './RecordingQr';
import LanguageAuto from './LanguageAuto';
import {MusicianCredits,ItemCredits,LyricsLanguageFields} from './RecordingItemsEditor';

// Duration is stored in seconds and shown as mm:ss; it is read from the uploaded audio file, never typed.
const formatDuration=seconds=>seconds==null||!Number.isFinite(seconds)?'':`${Math.floor(seconds/60)}:${String(Math.round(seconds%60)).padStart(2,'0')}`.replace(/^(\d+):60$/,(_,m)=>`${+m+1}:00`);
function DurationField({value}){
 return <label className="ri-field"><span className="ri-label">Duration <small>mm:ss</small></span><input readOnly aria-readonly="true" tabIndex={-1} value={formatDuration(value)} placeholder="Set from the audio file" title="Set automatically from the audio file"/></label>;
}

// Left column of the recording editor: name, type, dates, status, language, musical details, credits and cover artwork.
export default function RecordingInfoSection({editor,value,allItems,audioDraft,token,vocabulary,workTypes,artworkPreview,recordingLocked,change,setEditor,setArtworkBusy,setArtworkPreview}){
 return (
<section className="recording-info" aria-label="Recording information">
  <header className="ri-head"><h3>Recording information</h3><p>Name it, classify it, and describe what is in it.</p></header>

  <section className="ri-card ri-cover" aria-label="Cover artwork">
   <h4>Cover artwork <small>optional · square image</small>{value.coverImage&&<button type="button" className="recording-remove-cover" disabled={recordingLocked} aria-label="Remove cover artwork" title="Remove cover artwork" onClick={()=>{change('coverImage','');setArtworkPreview('');}}><Trash2 size={16} aria-hidden="true"/></button>}</h4>
   <OntologyMediaUpload artwork compact token={token} value={value.coverImage} previewUrl={artworkPreview||value.coverImage} onBusyChange={setArtworkBusy} onUploaded={r=>{change('coverImage',r.url);setArtworkPreview(r.previewUrl||r.url);}}/>
  </section>

  <section className="ri-card" aria-label="Basics">
   <h4>Basics</h4>
   <label className="ri-field"><span className="ri-label">Name <b aria-hidden="true">*</b></span><input required aria-required="true" value={value.title} maxLength={240} placeholder="e.g. Christmas evening mix" onChange={e=>change('title',e.target.value)}/></label>
   <RecordingInfoAuto token={token} file={audioDraft.current?.file} filename={audioDraft.current?.file?.name} value={value} workTypes={workTypes} vocabulary={vocabulary} onApply={patch=>{for(const [key,next] of Object.entries(patch))if(key!=='releaseYearHint')change(key,next);}}/>
   <div className="ri-grid">
    <label className="ri-field"><span className="ri-label">Work type <b aria-hidden="true">*</b></span><select required aria-required="true" value={value.recordingType||''} onChange={e=>change('recordingType',e.target.value)}><option value="" disabled>Choose a type</option>{workTypes.map(type=><option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
    <label className="ri-field"><span className="ri-label">Status</span><select value={value.archivalStatus==='ARCHIVED'?'ARCHIVED':value.publicationStatus} onChange={e=>{const status=e.target.value;if(status==='ARCHIVED')setEditor(current=>({...current,value:{...current.value,publicationStatus:'WITHDRAWN',archivalStatus:'ARCHIVED'}}));else setEditor(current=>({...current,value:{...current.value,publicationStatus:status,archivalStatus:'ACTIVE'}}));}}>{contract.publicationStatuses.filter(v=>v!=='WITHDRAWN'||value.publicationStatus==='WITHDRAWN'&&value.archivalStatus!=='ARCHIVED').map(v=><option key={v}>{v}</option>)}<option value="ARCHIVED">ARCHIVED</option></select></label>
    <label className="ri-field"><span className="ri-label">Release date <small>(DJ production date)</small></span><input list={workElementListId('releaseDate')} type="date" value={value.releaseDate} onChange={e=>change('releaseDate',e.target.value)}/></label>
    <DurationField value={value.durationSeconds}/>
   </div>
  </section>

  <section className="ri-card" aria-label="Audio file">
   <h4>Audio file</h4>
   <RecordingQr id={editor.id} title={value.title}/>
   <RecordingAudioId url={value.audioUrl} file={audioDraft.current?.file} usedBy={(()=>{const hash=audioHash(audioDraft.current?.uploaded?.url||value.audioUrl);return hash?allItems.find(row=>row.id!==editor.id&&String(row.storedAudioUrl||row.audioUrl||'').includes(hash))?.title:'';})()}/>
  </section>

  <section className="ri-card recording-language-details" aria-label="Language and dialect">
   <h4>Language &amp; dialect</h4>
   <p className="ri-hint">Pick every language and dialect used in this recording.</p>
   <LanguageAuto token={token} audioUrl={value.audioUrl} vocabulary={vocabulary} value={{languageIds:value.languages?.languageIds||[],dialectIds:value.languages?.dialectIds||[]}} onChange={next=>change('languages',next)}/>
   <LyricsLanguageFields lyrics={{languageIds:[],dialectIds:[],...(value.languages||{})}} vocabulary={vocabulary} onChange={next=>change('languages',{languageIds:next.languageIds||[],dialectIds:next.dialectIds||[]})}/>
  </section>

  <RecordingAtomElements audioUrl={value.audioUrl} value={value.musical||emptyAtomSound()} vocabulary={vocabulary} onChange={musical=>change('musical',musical)}/>

  <section className="ri-card recording-credits-details" aria-label="Credits">
   <h4>Credits</h4>
   <p className="ri-hint">Who sang and who played on this recording.</p>
   <div className="recording-atom-elements">
    <ItemCredits kind="artist" label="Vocalists" value={value.recordingCredits?.vocalists||[]} vocabulary={vocabulary} onChange={vocalists=>change('recordingCredits',{...(value.recordingCredits||{musicians:[]}),vocalists})}/><MusicianCredits label="Musicians" value={value.recordingCredits?.musicians||[]} vocabulary={vocabulary} onChange={musicians=>change('recordingCredits',{...(value.recordingCredits||{vocalists:[]}),musicians})}/>
   </div>
  </section>

 </section>
 );
}
