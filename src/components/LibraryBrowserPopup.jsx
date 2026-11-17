import {useState} from 'react';
import {Check,ChevronRight,Plus} from 'lucide-react';
import MovableWindow from './MovableWindow';
import {libraryTree} from '../lib/libraryTree.mjs';

// Drill-down: every click replaces the content of the window (work types, then the collections of one work type, then the recordings), with a breadcrumb to go back.
export default function LibraryBrowserPopup({workTypes,collections,recordings,isAdded,onAdd,onClose}){
 const tree=libraryTree(workTypes,collections,recordings),[path,setPath]=useState({type:null,collection:null});
 const group=tree.find(item=>item.id===path.type),collection=path.collection==='loose'?{id:'loose',title:'Not in a collection',recordings:group?.loose||[]}:group?.collections.find(item=>item.id===path.collection);
 // With no collections in a work type, its recordings are shown straight away.
 const showRecordings=Boolean(group)&&(Boolean(collection)||group.collections.length===0);
 const rows=collection?collection.recordings:group?.loose||[];
 const crumbs=[['Library',()=>setPath({type:null,collection:null})],...(group?[[group.name,()=>setPath({type:group.id,collection:null})]]:[]),...(collection?[[collection.title]]:[])];
 const row=item=><li key={item.id}><span><b>{item.title}</b>{item.artist&&<small>{item.artist}</small>}</span>{isAdded(item.id)?<em className="djb-added"><Check size={13}/>Added</em>:<button type="button" className="djb-add" onClick={()=>onAdd(item.id)}><Plus size={13}/>Add</button>}</li>;
 const choice=(title,count,onClick,kind)=><li key={title+kind}><button type="button" className="djb-lib-choice" onClick={onClick}><span>{kind&&<em>{kind}</em>}<b>{title}</b></span><i>{count}</i><ChevronRight size={16} aria-hidden="true"/></button></li>;
 return <MovableWindow title="Library" label="Work types, collections and recordings" subtitle={`${recordings.length} recordings`} onClose={onClose} width={560}>
  <nav className="djb-lib-crumbs" aria-label="Library location">{crumbs.map(([label,go],index)=>go&&index<crumbs.length-1?<span key={label}><button type="button" onClick={go}>{label}</button><ChevronRight size={13} aria-hidden="true"/></span>:<strong key={label} aria-current="page">{label}</strong>)}</nav>
  <div className="djb-prefs-body djb-lib-tree">
   {!group&&(tree.length?<ul className="djb-lib-list">{tree.map(item=>choice(item.name,item.count,()=>setPath({type:item.id,collection:null})))}</ul>:<p className="djb-empty">No recordings in the library yet.</p>)}
   {group&&!showRecordings&&<ul className="djb-lib-list">{group.collections.map(item=>choice(item.title,item.recordings.length,()=>setPath({type:group.id,collection:item.id}),'Collection'))}{group.loose.length>0&&choice('Not in a collection',group.loose.length,()=>setPath({type:group.id,collection:'loose'}))}</ul>}
   {showRecordings&&(rows.length?<ul className="djb-prefs-songs">{rows.map(row)}</ul>:<p className="djb-empty">No recordings yet.</p>)}
  </div>
 </MovableWindow>;
}
