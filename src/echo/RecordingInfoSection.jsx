import {useEffect,useRef} from 'react';
import {Trash2} from 'lucide-react';
import {holdScroll} from '../lib/holdScroll';
import './recordingInfo.css';
import {recordingStage} from '../lib/recordingWorkflow';
import OntologyMediaUpload from './OntologyMediaUpload';
import RecordingAudioId,{audioHash} from './RecordingAudioId';
import RecordingQr from './RecordingQr';

// Duration is stored in seconds and shown as mm:ss; it is read from the uploaded audio file, never typed.
const formatDuration=seconds=>seconds==null||!Number.isFinite(seconds)?'':`${Math.floor(seconds/60)}:${String(Math.round(seconds%60)).padStart(2,'0')}`.replace(/^(\d+):60$/,(_,m)=>`${+m+1}:00`);
// Left column of the recording editor: name, type, dates, status, language, musical details, credits and cover artwork.
export default function RecordingInfoSection({collections=[],collectionId='',onCollection=()=>{},editor,value,allItems,audioDraft,token,vocabulary,workTypes,artworkPreview,recordingLocked,change,setArtworkBusy,setArtworkPreview}){
 const column=useRef(null);
 useEffect(()=>holdScroll(column.current),[]);
 return (
<section className="recording-info" aria-label="Recording information" ref={column}>
  <header className="ri-head">
   <div><h3>Recording information</h3><p title={!editor.id?'Save to keep this recording privately.':recordingStage(editor)==='PUBLISHED'?'Visible to visitors. Saving returns it to the archive.':'Saved privately. Publish when ready.'}>{!editor.id?'Not saved yet':recordingStage(editor)==='PUBLISHED'?'Visible to visitors':'Private draft'}</p></div>
   <span className={`recording-status-badge is-${recordingStage(editor).toLowerCase()}`}>{recordingStage(editor)}</span>
  </header>

  <div className="ri-artwork">
   <RecordingQr id={editor.id} title={value.name} published={recordingStage(editor)==='PUBLISHED'}/>
  <section className="ri-cover" aria-label="Cover artwork">
   <OntologyMediaUpload artwork compact token={token} value={value.coverImage} previewUrl={artworkPreview||value.coverImage} onBusyChange={setArtworkBusy} onUploaded={r=>{change('coverImage',r.url);setArtworkPreview(r.previewUrl||r.url);}}/>
   <div className="ri-cover-text"><strong>Cover artwork</strong><span>Optional · square image</span></div>
   {value.coverImage&&<button type="button" className="recording-remove-cover" disabled={recordingLocked} aria-label="Remove cover artwork" title="Remove cover artwork" onClick={()=>{change('coverImage','');setArtworkPreview('');}}><Trash2 size={16} aria-hidden="true"/></button>}
  </section>

  </div>

  <section className="ri-title-block" aria-label="Name and description">
   <label className="ri-name"><span className="ri-label">Name <b aria-hidden="true">*</b></span><input required aria-required="true" value={value.name} maxLength={240} placeholder="e.g. Christmas evening mix" onChange={e=>change('name',e.target.value)}/></label>
   <label className="ri-desc"><span className="ri-label">Description <small>(optional)</small></span><textarea rows={3} value={value.description||''} maxLength={8000} placeholder="What is this recording about?" onChange={e=>change('description',e.target.value)}/><small className="ri-count">{(value.description||'').length} / 8000</small></label>
  </section>

  <section className="ri-rows" aria-label="Details">
   <h4 className="ri-section-title">Organization &amp; release</h4>
   <label className="ri-row"><span className="ri-row-label">Work type <b aria-hidden="true">*</b></span><select required aria-required="true" value={value.workType||''} onChange={e=>{change('workType',e.target.value);const current=collections.find(c=>c.id===collectionId);if(current&&current.workTypeId!==e.target.value)onCollection('');}}><option value="" disabled>Choose a type</option>{workTypes.map(type=><option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
   <label className="ri-row"><span className="ri-row-label">Collection</span><select value={collectionId} disabled={!value.workType} onChange={e=>onCollection(e.target.value)}><option value="">No collection</option>{collections.filter(c=>c.workTypeId&&c.workTypeId===value.workType).map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
   <label className="ri-row"><span className="ri-row-label">Release date</span><input type="date" value={value.releaseDate} onChange={e=>change('releaseDate',e.target.value)}/></label>
   <div className="ri-row"><span className="ri-row-label">Duration</span><output title="Set automatically from the audio file">{formatDuration(value.durationSeconds)||'From the audio file'}</output></div>
  </section>

  <section className="ri-card ri-audio" aria-label="Audio file">
   <h4>Audio file</h4>
   <RecordingAudioId url={value.storedAudioUrl||value.audioUrl} recordingId={editor.id} stems={value.stems?.channels} file={audioDraft.current?.file} usedBy={(()=>{const hash=audioHash(audioDraft.current?.uploaded?.url||value.audioUrl);return hash?allItems.find(row=>row.id!==editor.id&&String(row.storedAudioUrl||row.audioUrl||'').includes(hash))?.name:'';})()}/>
  </section>
 </section>
 );
}
