import {useEffect,useRef} from 'react';
import {isChangeTarget} from '../lib/equipmentChange';

// When Echo changes the draft, find every changed atom row inside `rootRef`, let `reveal` bring them into view
// (it may return a promise), then mark them with `flashClass` and keep them marked until the next change:
// React redraws of the list re-apply the mark. Shared by the Booking review and the concept map.
export default function useChangeHighlight({rootRef,changed,flashClass,delay=150,reveal,decorate}){
 const options=useRef({});options.current={flashClass,reveal,decorate};
 useEffect(()=>{
  let held=[],watcher=null,timer=0,alive=true;
  const rowsFor=(root,paths)=>[...root.querySelectorAll('[data-field]')].filter(element=>isChangeTarget(element.dataset.field,paths,changed.current));
  const mark=(root,paths,restart=false)=>{
   const rows=rowsFor(root,paths);
   rows.forEach(element=>{if(restart)void element.offsetWidth;element.classList.add(options.current.flashClass);});
   options.current.decorate?.(rows);
  };
  const show=event=>{
   clearTimeout(timer);
   timer=window.setTimeout(async()=>{
    const root=rootRef.current;if(!root)return;
    const paths=[...new Set([...(event.detail?.paths||[]),...changed.current.paths])],rows=rowsFor(root,paths);
    if(!rows.length)return;
    root.querySelectorAll('.'+options.current.flashClass).forEach(element=>element.classList.remove(options.current.flashClass));
    await options.current.reveal?.(rows,root);
    if(!alive||!rootRef.current)return;
    held=paths;mark(root,paths,true);
    if(!watcher){watcher=new MutationObserver(()=>{const current=rootRef.current;if(current&&held.length)mark(current,held);});watcher.observe(root,{childList:true,subtree:true});}
   },delay);
  };
  window.addEventListener('echo:draft-updated',show);
  return()=>{alive=false;window.removeEventListener('echo:draft-updated',show);clearTimeout(timer);watcher?.disconnect();};
 },[rootRef,changed]);
}
