import {useCallback,useEffect,useState} from 'react';
import {Pencil,Plus,Trash2,X,Check,Tags,Languages} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {ontologyPath,fetchDjWorkTypes} from '../lib/musicOntology';
import GalleryPicker from './GalleryPicker';
import './djWorkTypesAdmin.css';

const blank=()=>({name:'',nameArabic:'',amount:'INDIVIDUAL',details:'',detailsArabic:'',artworkUrl:''});
export default function DjWorkTypesAdmin({token}){
 const [ar,setAr]=useState(false),[rows,setRows]=useState([]),[editor,setEditor]=useState(()=>({id:'',value:blank()})),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[selectedId,setSelectedId]=useState(''),[artworkRow,setArtworkRow]=useState(null);
 const load=useCallback(async()=>{setError('');setRows(await fetchDjWorkTypes({token}));},[token]);
 useEffect(()=>{let live=true;setLoading(true);fetchDjWorkTypes({token}).then(items=>{if(live){setRows(items);setError('');}}).catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[token]);
 const save=async event=>{event.preventDefault();if(!editor)return;setBusy(true);setError('');try{const path=editor.id?`${ontologyPath}/work-types/${encodeURIComponent(editor.id)}`:`${ontologyPath}/work-types`;await apiRequest(path,{token,method:editor.id?'PUT':'POST',body:{...editor.value,...(editor.id?{revision:editor.revision}:{})}});resetEditor();await load();}catch(e){setError(e.message);}finally{setBusy(false);}};
 const remove=async row=>{if(!window.confirm(`Delete the DJ work type “${row.name}”?`))return;setBusy(true);setError('');try{await apiRequest(`${ontologyPath}/work-types/${encodeURIComponent(row.id)}`,{token,method:'DELETE'});await load();}catch(e){setError(e.message);}finally{setBusy(false);}};
 const setArtwork=async url=>{if(!artworkRow)return;setBusy(true);setError('');try{await apiRequest(`${ontologyPath}/work-types/${encodeURIComponent(artworkRow.id)}`,{token,method:'PUT',body:{name:artworkRow.name,nameArabic:artworkRow.nameArabic||'',amount:artworkRow.amount,details:artworkRow.details||'',detailsArabic:artworkRow.detailsArabic||'',artworkUrl:url,revision:artworkRow.revision}});setArtworkRow(null);await load();}catch(e){setError(e.message);}finally{setBusy(false);}};
 const resetEditor=()=>setEditor({id:'',value:blank()});
 const selected=rows.find(row=>row.id===selectedId)||null;

 return <section className="ontology-admin dj-work-types-admin dj-work-types-split" aria-labelledby="dj-work-types-title">
  <aside className="dj-work-types-aside" aria-label="Work type form"><form className="dj-work-type-form" onSubmit={save}><header><h2>{editor.id?'Edit work type':'New work type'}</h2><button type="button" className="dj-work-type-close" aria-label="Close form" disabled={busy} onClick={()=>resetEditor()}><X size={17}/></button></header><div className="dj-work-type-langs"><section className="dj-work-type-lang-card"><h3><b>EN</b>English</h3><label>Work type name<input required autoFocus maxLength={120} value={editor.value.name} placeholder="e.g. Remix" onChange={e=>setEditor(row=>({...row,value:{...row.value,name:e.target.value}}))}/></label><label>Details <small>Optional</small><textarea rows={2} maxLength={2000} value={editor.value.details} placeholder="Describe this kind of DJ work" onChange={e=>setEditor(row=>({...row,value:{...row.value,details:e.target.value}}))}/></label></section><section className="dj-work-type-lang-card is-ar" dir="rtl"><h3><b>ع</b>العربية · اختياري</h3><label>الاسم<input dir="rtl" maxLength={120} value={editor.value.nameArabic} onChange={e=>setEditor(row=>({...row,value:{...row.value,nameArabic:e.target.value}}))}/></label><label>التفاصيل<textarea dir="rtl" rows={2} maxLength={2000} value={editor.value.detailsArabic} onChange={e=>setEditor(row=>({...row,value:{...row.value,detailsArabic:e.target.value}}))}/></label></section></div><footer><button type="button" disabled={busy} onClick={()=>resetEditor()}>Cancel</button><button type="submit" disabled={busy||!editor.value.name.trim()}><Check size={15}/>{busy?'Saving…':'Save work type'}</button></footer></form></aside>
  <div className="dj-work-types-main">
  <h1 id="dj-work-types-title" className="ontology-sr-title">DJ Work Type</h1>
  {error&&<p role="alert" className="ontology-alert">{error}</p>}
  
  <div className="dj-work-types-toolbar" role="toolbar" aria-label="Work type actions">
    <button type="button" className="dj-work-type-lang" aria-pressed={ar} onClick={()=>setAr(value=>!value)}><Languages size={15}/>{ar?"English view":"عرض بالعربية"}</button>
    <button type="button" className="dj-work-type-icon" aria-label="Add Work Type" title="Add Work Type" disabled={busy} onClick={()=>{setError('');setEditor({id:'',value:blank()});}}><Plus size={18}/></button>
    <button type="button" className="dj-work-type-icon" aria-label="Edit selected work type" title={selected?`Edit ${selected.name}`:'Select a work type to edit'} disabled={busy||!selected} onClick={()=>{setError('');setEditor({id:selected.id,revision:selected.revision,value:{name:selected.name,nameArabic:selected.nameArabic||'',amount:selected.amount,details:selected.details||'',detailsArabic:selected.detailsArabic||'',artworkUrl:selected.artworkUrl||''}});}}><Pencil size={17}/></button>
    <button type="button" className="dj-work-type-icon is-delete" aria-label="Delete selected work type" title={selected?`Delete ${selected.name}`:'Select a work type to delete'} disabled={busy||!selected} onClick={()=>remove(selected)}><Trash2 size={17}/></button>
  </div>
  <div className="dj-work-types-table-wrap"><table aria-label="DJ work types" dir={ar?"rtl":undefined}><thead><tr><th scope="col">{ar?"نوع العمل":"Work type"}</th><th scope="col">{ar?"التفاصيل":"Details"}</th><th scope="col">{ar?"الصورة":"Artwork"}</th></tr></thead><tbody>{rows.map(row=><tr key={row.id} className={row.id===selectedId?'is-selected':''} aria-selected={row.id===selectedId} onClick={()=>setSelectedId(row.id===selectedId?'':row.id)}><th scope="row"><span className="dj-work-type-name"><Tags size={15} aria-hidden="true"/>{ar&&row.nameArabic?row.nameArabic:row.name}</span></th><td dir="auto">{(ar&&row.detailsArabic)||row.details||<span className="dj-work-type-empty">{ar?"لا توجد تفاصيل":"No details"}</span>}</td><td><button type="button" className="dj-work-type-artwork" disabled={busy} aria-label={`Choose artwork for ${row.name} from Gallery`} onClick={event=>{event.stopPropagation();setArtworkRow(row);}}>{row.artworkUrl&&<img src={row.artworkUrl} alt="" loading="lazy"/>}<span>{row.artworkUrl?'Change':'Choose from Gallery'}</span></button></td></tr>)}</tbody></table>{loading&&!rows.length&&<p className="dj-work-types-empty">Loading work types…</p>}{!loading&&!rows.length&&!error&&<p className="dj-work-types-empty">No DJ work types yet. Add one to begin.</p>}</div>
  
  <GalleryPicker open={Boolean(artworkRow)} onClose={()=>setArtworkRow(null)} token={token} selectedUrl={artworkRow?.artworkUrl||''} title={`Choose artwork for ${artworkRow?.name||'work type'}`} allowUpload={false} onSelect={item=>setArtwork(item.mediaUrl)}/>
  </div>
 </section>;
}
