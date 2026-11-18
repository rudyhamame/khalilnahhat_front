import {useEffect,useRef,useState} from 'react';
import RecordingLoadingHint from './RecordingLoadingHint';
import SelfDestructHint from './SelfDestructHint';
import {ArrowLeft,Check,Download,Trash2,Globe,X} from 'lucide-react';
import './recordingEditorBar.css';

// Recording header: Back, export format, Delete, and one conditional Save/Publish action.
// Delete Recording sits next to Save; Delete audio is in the Master toolbar of the waveform.
export default function RecordingEditorBar({autosave='',exporting=false,step,locked,status,statusKind='info',onStatusDone,hasAudio,format,onBack,save,onDelete,busy,saved,publish}){
 const [exportChoice,setExportChoice]=useState(null),exportDialog=useRef(null);
 useEffect(()=>{const dialog=exportDialog.current;if(exportChoice&&!dialog.open)dialog.showModal();else if(!exportChoice&&dialog.open)dialog.close();},[exportChoice]);
 const publishMode=Boolean(publish?.visible);
 const autosaveText={pending:'Unsaved changes',saved:'All changes saved',local:'Saved in this browser',error:'Autosave failed'}[autosave]||'';
 const progressing=/^(Uploading|Saving|Preparing|Publishing|Loading|Building|Analyzing|Trimming|Converting)/.test(status||'');
 return <><header className="ontology-page-bar">
  <button type="button" className="ontology-page-back" disabled={locked} onClick={onBack}><ArrowLeft size={16} aria-hidden="true"/>{step===0?'Back':'Back to Recording'}</button>
  <span className="recording-toolbar-spacer"/>
  {hasAudio&&<div className="ontology-export-format" role="group" aria-label="Export as"><span>Export as</span>{format.options.map(option=>
   <button key={option.id} type="button" disabled={locked||exporting} title={`Download as ${option.id==='aac'?'AAC (M4A)':option.label}${option.size?` · ≈ ${option.size}`:''}`} onClick={()=>setExportChoice(option)}>{option.label}{option.size&&<small>≈ {option.size}</small>}</button>)}</div>}

  <button type="button" className="ontology-delete-recording" disabled={locked||busy} title={saved?'Delete this recording permanently':'Delete this unsaved draft'} onClick={onDelete}><Trash2 size={16} aria-hidden="true"/><span>{saved?'Delete Recording':'Delete Draft'}</span></button>
  <button type="button" className={`ontology-recording-submit ${publishMode?'ontology-recording-publish':'ontology-recording-save'}`} disabled={locked||!(publishMode?publish.ready:save.ready)} title={publishMode?(publish.ready?'Publish this recording and activate its prepared sample':'Add audio and complete the recording details first'):save.reason||(save.idle?'No unsaved changes':undefined)} aria-describedby={status||save.reason?'recording-save-status':undefined} onClick={publishMode?publish.onPublish:save.onSave}>{publishMode?<Globe size={15} aria-hidden="true"/>:<Check size={15} aria-hidden="true"/>}{publishMode?'Publish recording':'Save recording'}</button>
 </header><div className="recording-editor-subheader"><span id="recording-save-status" className="ontology-page-status">{status?(progressing?null:<SelfDestructHint kind={statusKind} onDone={onStatusDone}>{status}</SelfDestructHint>):save.reason?<span className="recording-save-reason">{save.reason}</span>:null}</span><span id="recording-loading-hints" className="recording-loading-hints"/>{autosaveText&&<span className={`recording-autosave-status is-${autosave}`} role="status">{autosave==='saved'&&<Check size={13} aria-hidden="true"/>}{autosaveText}</span>}</div><RecordingLoadingHint message={progressing?status:autosave==='saving'?'Autosaving…':save.busy?'Saving recording…':publish?.busy?'Publishing recording…':''}/><RecordingLoadingHint message={exporting?'Preparing audio export…':''}/>
 <dialog ref={exportDialog} className="recording-export-dialog" aria-labelledby="recording-export-title" onCancel={()=>setExportChoice(null)} onClose={()=>setExportChoice(null)}>
  {exportChoice&&<><header><span className="recording-export-icon" aria-hidden="true"><Download size={20}/></span><h3 id="recording-export-title">Download recording?</h3><button type="button" className="recording-export-close" aria-label="Close export confirmation" onClick={()=>setExportChoice(null)}><X size={18}/></button></header>
  <p>Download <strong>{format.name||'this recording'}</strong> as <strong>{exportChoice.id==='aac'?'AAC (M4A)':exportChoice.label}</strong>?</p>
  {exportChoice.size&&<small>Estimated file size · {exportChoice.size}</small>}
  <footer><button type="button" onClick={()=>setExportChoice(null)}>Cancel</button><button type="button" className="recording-export-confirm" onClick={()=>{const id=exportChoice.id;setExportChoice(null);void format.onExport(id);}}><Download size={14} aria-hidden="true"/>Download {exportChoice.label}</button></footer></>}
 </dialog></>;
}
