import {ArrowLeft,MoreHorizontal,Music2,Share2} from 'lucide-react';
import RecordingDownloadMenu from './RecordingDownloadMenu';
import './recordingEditorBar.css';

// Top bar of the recording editor: Back, "Save as" format, Download, a More menu, and Save.
// Destructive actions (Delete audio, Delete Recording) live in RecordingDangerZone, not here.
export default function RecordingEditorBar({step,locked,status,hasAudio,format,downloadMenu,onBack,more,save}){
 return <header className="ontology-page-bar">
  <button type="button" className="ontology-page-back" disabled={locked} onClick={onBack}><ArrowLeft size={16} aria-hidden="true"/>{step===0?'Back':'Back to Recording'}</button>
  <span className="ontology-page-status" role="alert">{status}</span>
  {hasAudio&&<div className="ontology-export-format" role="radiogroup" aria-label="Save as"><span>Save as</span>{format.options.map(option=>
   <button key={option.id} type="button" role="radio" aria-checked={format.active===option.id} disabled={locked||(!format.editable&&format.active!==option.id)} title={!format.editable?'This audio is already saved. Replace or trim it to pick another format.':option.title} onClick={()=>format.onPick(option.id)}>{option.label}{option.size&&<small>≈ {option.size}</small>}</button>)}</div>}
  {hasAudio&&<RecordingDownloadMenu busy={downloadMenu.busy} disabled={locked} channels={downloadMenu.channels} mergedInfo={downloadMenu.info} onMerged={downloadMenu.onMerged} onChannel={downloadMenu.onChannel}/>}
  {hasAudio&&<details className="recording-more-menu"><summary aria-label="More actions" title="More actions"><MoreHorizontal size={16} aria-hidden="true"/><span>More</span></summary>
   <div role="menu">
    {more.canSample&&<button type="button" role="menuitem" disabled={locked||!more.sampleReady} title="Choose the one-minute sample for this work type" onClick={more.onSample}><Music2 size={15} aria-hidden="true"/>Set as sample</button>}
    <button type="button" role="menuitem" disabled={locked||!more.socialReady} title={more.socialReady?'Design an Instagram post, story or reel':'Save the recording first'} onClick={more.onSocial}><Share2 size={15} aria-hidden="true"/>Social card</button>
   </div></details>}
  <button type="button" className="ontology-recording-save" disabled={!save.ready||locked} onClick={save.onSave}>{save.busy?'Saving…':'Save recording'}</button>
 </header>;
}
