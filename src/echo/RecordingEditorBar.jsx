import {useRef,useState} from 'react';
import {ArrowLeft,Check,ChevronDown,FolderPlus,MoreHorizontal,Music2,Share2,Trash2} from 'lucide-react';
import RecordingDownloadMenu from './RecordingDownloadMenu';
import './recordingEditorBar.css';

// Top bar of the recording editor: Back, "Save as" format, Download, a More menu, and Save.
// Delete Recording sits next to Save; Delete audio is in the Master toolbar of the waveform.
export default function RecordingEditorBar({step,locked,status,hasAudio,format,downloadMenu,onBack,more,save,onDelete,busy,saved}){
 const menu=useRef(null),[picking,setPicking]=useState(false);
 const collections=more.collections||[];
 return <header className="ontology-page-bar">
  <button type="button" className="ontology-page-back" disabled={locked} onClick={onBack}><ArrowLeft size={16} aria-hidden="true"/>{step===0?'Back':'Back to Recording'}</button>
  <span id="recording-save-status" className="ontology-page-status" role="status">{status||save.reason}</span>
  {hasAudio&&<div className="ontology-export-format" role="radiogroup" aria-label="Save as"><span>Save as</span>{format.options.map(option=>
   <button key={option.id} type="button" role="radio" aria-checked={format.active===option.id} disabled={locked||(!format.editable&&format.active!==option.id)} title={!format.editable?'This audio is already saved. Replace or trim it to pick another format.':option.title} onClick={()=>format.onPick(option.id)}>{option.label}{option.size&&<small>≈ {option.size}</small>}</button>)}</div>}
  {hasAudio&&<RecordingDownloadMenu busy={downloadMenu.busy} disabled={locked} channels={downloadMenu.channels} mergedInfo={downloadMenu.info} onMerged={downloadMenu.onMerged} onChannel={downloadMenu.onChannel}/>}
  {hasAudio&&<details className="recording-more-menu" ref={menu} onToggle={event=>{if(!event.currentTarget.open)setPicking(false);}}><summary aria-label="More actions" title="More actions"><MoreHorizontal size={16} aria-hidden="true"/><span>More</span></summary>
   <div role="menu">
    {more.canSample&&<button type="button" role="menuitem" disabled={locked||!more.sampleReady} title="Choose the one-minute sample for this work type" onClick={more.onSample}><Music2 size={15} aria-hidden="true"/>Set as sample</button>}
    <button type="button" role="menuitem" disabled={locked||!more.socialReady} title={more.socialReady?'Design an Instagram post, story or reel':'Save the recording first'} onClick={more.onSocial}><Share2 size={15} aria-hidden="true"/>Social card</button>
    {more.onCollection&&<>
     <button type="button" role="menuitem" aria-expanded={picking} disabled={locked||!more.collectionReady} title={more.collectionReady?'Add this recording to a collection of its work type':'Save the recording first'} onClick={()=>setPicking(open=>!open)}><FolderPlus size={15} aria-hidden="true"/>Add to collection<ChevronDown size={14} aria-hidden="true" className={picking?'is-open':''}/></button>
     {picking&&<div className="recording-collection-list" role="group" aria-label="Collections of this work type">
      {collections.length?collections.map(collection=><button key={collection.id} type="button" role="menuitemradio" aria-checked={more.collectionId===collection.id} disabled={locked||more.collectionId===collection.id} title={more.collectionId===collection.id?'Already in this collection':`Add to ${collection.title}`} onClick={()=>{more.onCollection(collection.id);setPicking(false);if(menu.current)menu.current.open=false;}}>{more.collectionId===collection.id?<Check size={14} aria-hidden="true"/>:<span aria-hidden="true" className="recording-collection-dot"/>}<span>{collection.title}</span></button>)
       :<p>{more.workTypeName?`No collections for ${more.workTypeName} yet.`:'No collections for this work type yet.'}</p>}
     </div>}</>}
   </div></details>}
  <button type="button" className="ontology-delete-recording" disabled={locked||busy} title={saved?'Delete this recording permanently':'Delete this unsaved draft'} onClick={onDelete}><Trash2 size={16} aria-hidden="true"/><span>{saved?'Delete Recording':'Delete Draft'}</span></button>
  <button type="button" className="ontology-recording-save" disabled={!save.ready||locked} title={save.reason||undefined} aria-describedby={status||save.reason?'recording-save-status':undefined} onClick={save.onSave}>{save.busy?'Saving…':'Save recording'}</button>
 </header>;
}
