import RecordingLoadingHint from './RecordingLoadingHint';
import SelfDestructHint from './SelfDestructHint';
import {ArrowLeft,Check,Trash2,Globe} from 'lucide-react';
import './recordingEditorBar.css';

// Recording header: Back, export format, Delete, and one conditional Save/Publish action.
// Delete Recording sits next to Save; Delete audio is in the Master toolbar of the waveform.
export default function RecordingEditorBar({autosave='',exporting=false,step,locked,status,statusKind='info',onStatusDone,hasAudio,format,onBack,save,onDelete,busy,saved,publish}){
 const publishMode=Boolean(publish?.visible);
 const autosaveText={pending:'Unsaved changes',saved:'All changes saved',local:'Saved in this browser',error:'Autosave failed'}[autosave]||'';
 const progressing=/^(Uploading|Saving|Preparing|Publishing|Loading|Building|Analyzing|Trimming|Converting)/.test(status||'');
 return <><header className="ontology-page-bar">
  <button type="button" className="ontology-page-back" disabled={locked} onClick={onBack}><ArrowLeft size={16} aria-hidden="true"/>{step===0?'Back':'Back to Recording'}</button>
  <span className="recording-toolbar-spacer"/>
  {hasAudio&&<div className="ontology-export-format" role="radiogroup" aria-label="Export as"><span>Export as</span>{format.options.map(option=>
   <button key={option.id} type="button" role="radio" aria-checked={format.active===option.id} disabled={locked||(!format.editable&&format.active!==option.id)} title={!format.editable?'This audio is already saved. Replace or trim it to pick another format.':option.title} onClick={()=>format.onPick(option.id)}>{option.label}{option.size&&<small>≈ {option.size}</small>}</button>)}</div>}

  <button type="button" className="ontology-delete-recording" disabled={locked||busy} title={saved?'Delete this recording permanently':'Delete this unsaved draft'} onClick={onDelete}><Trash2 size={16} aria-hidden="true"/><span>{saved?'Delete Recording':'Delete Draft'}</span></button>
  <button type="button" className={`ontology-recording-submit ${publishMode?'ontology-recording-publish':'ontology-recording-save'}`} disabled={locked||!(publishMode?publish.ready:save.ready)} title={publishMode?(publish.ready?'Publish this recording and activate its prepared sample':'Add audio and complete the recording details first'):save.reason||undefined} aria-describedby={status||save.reason?'recording-save-status':undefined} onClick={publishMode?publish.onPublish:save.onSave}>{publishMode?<Globe size={15} aria-hidden="true"/>:<Check size={15} aria-hidden="true"/>}{publishMode?'Publish recording':'Save recording'}</button>
 </header><div className="recording-editor-subheader"><span id="recording-save-status" className="ontology-page-status">{status?(progressing?null:<SelfDestructHint kind={statusKind} onDone={onStatusDone}>{status}</SelfDestructHint>):save.reason?<span className="recording-save-reason">{save.reason}</span>:null}</span><span id="recording-loading-hints" className="recording-loading-hints"/>{autosaveText&&<span className={`recording-autosave-status is-${autosave}`} role="status">{autosave==='saved'&&<Check size={13} aria-hidden="true"/>}{autosaveText}</span>}</div><RecordingLoadingHint message={progressing?status:autosave==='saving'?'Autosaving…':save.busy?'Saving recording…':publish?.busy?'Publishing recording…':''}/><RecordingLoadingHint message={exporting?'Preparing audio export…':''}/></>;
}
