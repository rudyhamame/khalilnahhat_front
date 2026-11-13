import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,Check,ChevronDown,FolderPlus,MoreHorizontal,Music2,Share2,Trash2,Globe,ArrowUpRight} from 'lucide-react';
import RecordingDownloadMenu from './RecordingDownloadMenu';
import './recordingEditorBar.css';

// Top bar of the recording editor: Back, "Save as" format, Download, a More menu, and Save.
// Delete Recording sits next to Save; Delete audio is in the Master toolbar of the waveform.
export default function RecordingEditorBar({step,locked,status,hasAudio,format,downloadMenu,onBack,more,save,onDelete,busy,saved,publish}){
 const menu=useRef(null),[picking,setPicking]=useState(false);
 const collections=more.collections||[];
 const closeMenu=()=>{if(menu.current)menu.current.open=false;};
 useEffect(()=>{
  const outside=event=>{if(menu.current&&!menu.current.contains(event.target))menu.current.open=false;};
  const escape=event=>{if(event.key==='Escape'&&menu.current?.open){menu.current.open=false;menu.current.querySelector('summary')?.focus();}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
 },[]);
 const menuKeys=event=>{
  if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
  const buttons=[...event.currentTarget.querySelectorAll('button:not(:disabled)')],at=buttons.indexOf(document.activeElement);
  if(!buttons.length)return;event.preventDefault();
  buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:(at+(event.key==='ArrowUp'?-1:1)+buttons.length)%buttons.length].focus();
 };
 return <header className="ontology-page-bar">
  <button type="button" className="ontology-page-back" disabled={locked} onClick={onBack}><ArrowLeft size={16} aria-hidden="true"/>{step===0?'Back':'Back to Recording'}</button>
  <span id="recording-save-status" className="ontology-page-status" role="status">{status||save.reason}</span>
  {hasAudio&&<div className="ontology-export-format" role="radiogroup" aria-label="Save as"><span>Save as</span>{format.options.map(option=>
   <button key={option.id} type="button" role="radio" aria-checked={format.active===option.id} disabled={locked||(!format.editable&&format.active!==option.id)} title={!format.editable?'This audio is already saved. Replace or trim it to pick another format.':option.title} onClick={()=>format.onPick(option.id)}>{option.label}{option.size&&<small>≈ {option.size}</small>}</button>)}</div>}
  {hasAudio&&<RecordingDownloadMenu busy={downloadMenu.busy} disabled={locked} channels={downloadMenu.channels} mergedInfo={downloadMenu.info} onMerged={downloadMenu.onMerged} onChannel={downloadMenu.onChannel}/>}
  <details className="recording-more-menu" ref={menu} onToggle={event=>{if(!event.currentTarget.open)setPicking(false);}}><summary aria-label="More actions" title="More actions"><MoreHorizontal size={16} aria-hidden="true"/><span>More</span><ChevronDown size={12} aria-hidden="true"/></summary>
   <div role="menu" aria-label="Recording tools" onKeyDown={menuKeys}>
    <div className="recording-menu-heading"><span>RECORDING TOOLS</span><span className={`recording-menu-state${more.published?' is-published':''}`}>{more.published?'Published':'Preview & prepare'}</span></div>
    <button type="button" role="menuitem" disabled={locked||!more.socialReady} onClick={()=>{closeMenu();more.onSocial();}}><span className="recording-menu-icon"><Share2 size={17} aria-hidden="true"/></span><span className="recording-menu-copy"><strong>Social card</strong><small>{more.published?'Create a post, story or reel':'Review the design before publishing'}</small></span><ArrowUpRight size={15} className="recording-menu-arrow" aria-hidden="true"/></button>
    {more.onCollection&&<>
     <button type="button" role="menuitem" aria-expanded={picking} disabled={locked||!more.collectionReady} title={!more.collectionReady?'Choose a work type first':undefined} onClick={()=>setPicking(open=>!open)}><span className="recording-menu-icon"><FolderPlus size={17} aria-hidden="true"/></span><span className="recording-menu-copy"><strong>Add to collection</strong><small>{collections.find(row=>row.id===more.collectionId)?.title||'Choose where this recording belongs'}</small></span><ChevronDown size={15} aria-hidden="true" className={`recording-menu-arrow${picking?' is-open':''}`}/></button>
     {picking&&<div className="recording-collection-list" role="group" aria-label="Collections of this work type">
      <button type="button" role="menuitemradio" aria-checked={!more.collectionId} disabled={locked} onClick={()=>{more.onCollection('');setPicking(false);}}>{!more.collectionId?<Check size={14} aria-hidden="true"/>:<span className="recording-collection-dot"/>}<span>No collection</span></button>
      {collections.map(collection=><button key={collection.id} type="button" role="menuitemradio" aria-checked={more.collectionId===collection.id} disabled={locked} onClick={()=>{more.onCollection(collection.id);setPicking(false);}}>{more.collectionId===collection.id?<Check size={14} aria-hidden="true"/>:<span aria-hidden="true" className="recording-collection-dot"/>}<span>{collection.title}</span></button>)}
      {!collections.length&&<p>{more.workTypeName?`No collections for ${more.workTypeName} yet.`:'Choose a work type first.'}</p>}
     </div>}
    </>}
    {more.canSample&&<button type="button" role="menuitem" disabled={locked||!more.sampleReady} title={!more.sampleReady?'Add audio and choose a work type first':undefined} onClick={()=>{closeMenu();more.onSample();}}><span className="recording-menu-icon"><Music2 size={17} aria-hidden="true"/></span><span className="recording-menu-copy"><strong>Set as sample</strong><small>{more.sampleStartSec!=null?`Selected · starts at ${Math.floor(more.sampleStartSec/60)}:${String(Math.floor(more.sampleStartSec%60)).padStart(2,'0')}`:'Choose and preview a one-minute excerpt'}</small></span><ArrowUpRight size={15} className="recording-menu-arrow" aria-hidden="true"/></button>}
    <p className="recording-menu-note">{more.published?'Save changes to archive, then publish when ready.':'Prepare now. Sharing and samples go live only after publication.'}</p>
   </div></details>

  <button type="button" className="ontology-delete-recording" disabled={locked||busy} title={saved?'Delete this recording permanently':'Delete this unsaved draft'} onClick={onDelete}><Trash2 size={16} aria-hidden="true"/><span>{saved?'Delete Recording':'Delete Draft'}</span></button>
  <button type="button" className="ontology-recording-save" disabled={!save.ready||locked} title={save.reason||undefined} aria-describedby={status||save.reason?'recording-save-status':undefined} onClick={save.onSave}>{save.busy?'Saving…':'Save recording'}</button>
  {publish?.visible&&<button type="button" className="ontology-recording-publish" disabled={locked||!publish.ready} title={publish.ready?'Publish this recording and activate its prepared sample':'Add audio and complete the recording details first'} onClick={publish.onPublish}><Globe size={15} aria-hidden="true"/>{publish.busy?'Publishing…':'Publish recording'}</button>}
 </header>;
}
