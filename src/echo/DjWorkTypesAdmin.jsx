import {useCallback,useEffect,useMemo,useState} from 'react';
import {ArrowUpRight,Check,Disc3,ImagePlus,Languages,LoaderCircle,Plus,RefreshCw,Search,Trash2,X} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {ontologyPath,fetchDjWorkTypes,announceMusicArchiveChange} from '../lib/musicOntology';
import {djWorkTypeText} from '../lib/djWorkTypeText';
import GalleryPicker from './GalleryPicker';
import './djWorkTypesAdmin.css';

const blank=()=>({name:'',nameArabic:'',details:'',detailsArabic:'',artworkUrl:''});
const edit=row=>({id:row.id,revision:row.revision,value:{name:row.name,nameArabic:row.nameArabic||'',details:row.details||'',detailsArabic:row.detailsArabic||'',artworkUrl:row.artworkUrl||''},original:JSON.stringify({name:row.name,nameArabic:row.nameArabic||'',details:row.details||'',detailsArabic:row.detailsArabic||'',artworkUrl:row.artworkUrl||''})});
const hasArabic=row=>Boolean(row.nameArabic?.trim());

export function WorkTypeLibrary({rows,selectedId,loading,busy,onSelect,onCreate}){
 const [query,setQuery]=useState(''),[filter,setFilter]=useState('all');
 const filtered=useMemo(()=>rows.filter(row=>(filter!=='arabic'||!hasArabic(row))&&[row.name,row.nameArabic,row.details,row.detailsArabic].some(value=>String(value||'').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))),[rows,query,filter]);
 return <section className="dwt-library" aria-label="Work type library">
  <div className="dwt-library-heading"><h2>Work types <span>{rows.length}</span></h2><span>{filtered.length} shown</span></div>
  <label className="dwt-search"><Search size={16} aria-hidden="true"/><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search names or descriptions" aria-label="Search work types"/></label>
  <div className="dwt-filters" role="group" aria-label="Filter work types"><button type="button" aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>All types</button><button type="button" aria-pressed={filter==='arabic'} onClick={()=>setFilter('arabic')}>Needs Arabic <span>{rows.filter(row=>!hasArabic(row)).length}</span></button></div>
  {loading?<div className="dwt-empty" role="status"><LoaderCircle size={24} className="dwt-spinner"/><p>Loading work types…</p></div>:filtered.length?<ul className="dwt-list">{filtered.map(row=><li key={row.id}><button type="button" className="dwt-list-item" aria-current={selectedId===row.id?'true':undefined} disabled={busy} onClick={()=>onSelect(row)}>
   <span className="dwt-thumbnail">{row.artworkUrl?<img src={row.artworkUrl} alt="" loading="lazy"/>:<Disc3 size={24} strokeWidth={1.4}/>}</span>
   <span className="dwt-item-copy"><strong dir="auto">{row.name}</strong>{row.nameArabic&&<span className="dwt-arabic-name" lang="ar" dir="rtl">{row.nameArabic}</span>}<small dir="auto">{row.details||'No description yet'}</small><span className={`dwt-language-status${hasArabic(row)?' is-complete':''}`}><Languages size={12}/>{hasArabic(row)?'English + Arabic':'English only'}</span></span>
   <ArrowUpRight size={15} className="dwt-item-arrow" aria-hidden="true"/>
  </button></li>)}</ul>:<div className="dwt-empty"><Disc3 size={30} strokeWidth={1.2}/><h3>{rows.length?'No matching work types':'Your library starts here'}</h3><p>{rows.length?'Try another search or filter.':'Create the names and descriptions visitors see on your Music page.'}</p>{!rows.length&&<button type="button" className="dwt-primary" disabled={busy} onClick={onCreate}><Plus size={15}/>Create a work type</button>}</div>}
 </section>;
}

export function WorkTypeEditor({editor,setEditor,language,setLanguage,busy,dirty,onSave,onClose,onDelete,onArtwork}){
 if(!editor)return <section className="dwt-editor dwt-editor-empty"><span className="dwt-empty-disc"><Disc3 size={42} strokeWidth={1}/></span><h2>Make each sound your own.</h2><p>Select a work type to edit its name, description and artwork, or create a new one.</p><span className="dwt-empty-note">Your changes appear in the public music boxes after saving.</span></section>;
 const ar=language==='ar',nameKey=ar?'nameArabic':'name',detailsKey=ar?'detailsArabic':'details';
 const set=(key,value)=>setEditor(current=>({...current,value:{...current.value,[key]:value}}));
 const preview=djWorkTypeText(editor.value,ar);
 return <form className="dwt-editor" onSubmit={onSave}>
  <header className="dwt-editor-heading"><div><span className="dwt-eyebrow">{editor.id?'EDIT WORK TYPE':'NEW WORK TYPE'}</span><h2 dir="auto">{editor.id?editor.value.name||'Untitled work type':'Create a work type'}</h2></div><button type="button" className="dwt-icon" onClick={onClose} disabled={busy} aria-label="Close work type editor"><X size={18}/></button></header>
  <fieldset disabled={busy} className="dwt-editor-fields">
   <div className="dwt-language-tabs" role="group" aria-label="Editing language"><button type="button" lang="en" aria-pressed={!ar} onClick={()=>setLanguage('en')}><span>EN</span>English<small>Required name</small></button><button type="button" lang="ar" aria-pressed={ar} onClick={()=>setLanguage('ar')}><span>ع</span>العربية<small>Optional</small></button></div>
   <div className="dwt-field-group" dir={ar?'rtl':'ltr'} lang={ar?'ar':'en'}>
    <label htmlFor="dwt-name">{ar?'اسم نوع العمل':'Work type name'}<small>{editor.value[nameKey].length}/120</small></label><input id="dwt-name" maxLength={120} required={!ar} value={editor.value[nameKey]} onChange={event=>set(nameKey,event.target.value)} placeholder={ar?'اكتب الاسم بالعربية':'Name shown on the music box'} autoComplete="off"/>
    <label htmlFor="dwt-description">{ar?'الوصف':'Description'}<small>{ar?'اختياري':'Optional'}</small></label><textarea id="dwt-description" rows={5} maxLength={2000} value={editor.value[detailsKey]} onChange={event=>set(detailsKey,event.target.value)} placeholder={ar?'عرّف هذا النوع من العمل الموسيقي':'Tell visitors what they can discover in this collection.'}/>
    <p className="dwt-field-hint">{ar?'إذا تُركت الترجمة فارغة، سيظهر النص الإنجليزي على الموقع.':'Used on the music box and its collection section.'}</p>
   </div>
   <div className="dwt-artwork"><button type="button" className="dwt-artwork-image" onClick={onArtwork} aria-label="Choose work type artwork from Gallery">{editor.value.artworkUrl?<img src={editor.value.artworkUrl} alt="Current artwork"/>:<ImagePlus size={25} strokeWidth={1.4}/>}</button><div><h3>Collection artwork</h3><p>Choose an image from your Gallery.</p><div className="dwt-artwork-actions"><button type="button" className="dwt-text-button" onClick={onArtwork}>{editor.value.artworkUrl?'Change image':'Choose image'}</button>{editor.value.artworkUrl&&<button type="button" className="dwt-text-button" onClick={()=>set('artworkUrl','')}>Remove</button>}</div></div></div>
   <section className="dwt-preview-section" aria-label="Music box preview"><div className="dwt-preview-heading"><span>Music page preview</span><span>{ar?'Arabic':'English'}</span></div><div className="dwt-preview-card" dir={ar?'rtl':'ltr'}>{editor.value.artworkUrl&&<img src={editor.value.artworkUrl} alt=""/>}<Disc3 size={21} aria-hidden="true"/><div><strong dir="auto">{preview.name||(ar?'اسم نوع العمل':'Your work type')}</strong>{preview.details&&<p dir="auto">{preview.details}</p>}</div></div></section>
  </fieldset>
  <footer className="dwt-editor-footer"><div>{editor.id&&<button type="button" className="dwt-delete" disabled={busy} onClick={onDelete}><Trash2 size={15}/>Delete</button>}<small role="status">{busy?'Saving changes…':dirty?'Unsaved changes':'All changes saved'}</small></div><button type="submit" className="dwt-primary" disabled={busy||!dirty||!editor.value.name.trim()}>{busy?<LoaderCircle size={15} className="dwt-spinner"/>:<Check size={15}/>}Save work type</button></footer>
 </form>;
}

export default function DjWorkTypesAdmin({token}){
 const [rows,setRows]=useState([]),[editor,setEditor]=useState(null),[language,setLanguage]=useState('en'),[error,setError]=useState(''),[notice,setNotice]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[galleryOpen,setGalleryOpen]=useState(false);
 const dirty=Boolean(editor&&JSON.stringify(editor.value)!==editor.original);
 const load=useCallback(async()=>{const items=await fetchDjWorkTypes({token});setRows(items);return items;},[token]);
 useEffect(()=>{let active=true;setLoading(true);fetchDjWorkTypes({token}).then(items=>{if(active){setRows(items);setEditor(items[0]?edit(items[0]):null);setError('');}}).catch(problem=>{if(active)setError(problem.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[token]);
 const mayLeave=()=>!dirty||window.confirm('Discard your unsaved work type changes?');
 const choose=row=>{if(busy||row.id===editor?.id||!mayLeave())return;setEditor(edit(row));setError('');setNotice('');};
 const create=()=>{if(busy||!mayLeave())return;const value=blank();setEditor({id:'',value,original:JSON.stringify(value)});setLanguage('en');setError('');setNotice('');};
 const close=()=>{if(!busy&&mayLeave())setEditor(null);};
 const refresh=async()=>{if(busy||!mayLeave())return;setLoading(true);setError('');try{const items=await load();setEditor(current=>{const row=items.find(row=>row.id===current?.id);return row?edit(row):null;});}catch(problem){setError(problem.message);}finally{setLoading(false);}};
 const save=async event=>{event.preventDefault();if(!editor||busy||!dirty||!editor.value.name.trim())return;setBusy(true);setError('');setNotice('');try{const path=editor.id?`${ontologyPath}/work-types/${encodeURIComponent(editor.id)}`:`${ontologyPath}/work-types`;const {item}=await apiRequest(path,{token,method:editor.id?'PUT':'POST',body:{...editor.value,...(editor.id?{revision:editor.revision}:{})}});setEditor(edit(item));announceMusicArchiveChange();await load();setNotice('Work type saved. Your Music page now uses these details.');}catch(problem){if(!problem.cancelled)setError(problem.message);}finally{setBusy(false);}};
 const remove=async()=>{if(!editor?.id||busy)return;setBusy(true);setError('');setNotice('');try{await apiRequest(`${ontologyPath}/work-types/${encodeURIComponent(editor.id)}`,{token,method:'DELETE',deleteMessage:`Permanently delete the work type “${editor.value.name}”?`});setEditor(null);announceMusicArchiveChange();await load();setNotice('Work type deleted.');}catch(problem){if(!problem.cancelled)setError(problem.message);}finally{setBusy(false);}};
 return <section className="dj-work-types-admin" aria-labelledby="dj-work-types-title">
  <header className="dwt-page-heading"><div><span className="dwt-eyebrow">WORK / MUSIC LIBRARY</span><h1 id="dj-work-types-title">DJ Work Type</h1><p>Shape the names, stories and artwork of your public music boxes.</p></div><div className="dwt-page-actions"><button type="button" className="dwt-icon" disabled={busy||loading} onClick={refresh} aria-label="Refresh work types"><RefreshCw size={17}/></button><button type="button" className="dwt-primary" onClick={create} disabled={busy||loading}><Plus size={17}/>New work type</button></div></header>
  {error&&<div className="dwt-alert" role="alert">{error}<button type="button" onClick={()=>setError('')} aria-label="Dismiss error"><X size={15}/></button></div>}
  {notice&&<p className="dwt-notice" role="status"><Check size={15}/>{notice}</p>}
  <div className="dwt-workspace"><WorkTypeLibrary rows={rows} selectedId={editor?.id} loading={loading} busy={busy} onSelect={choose} onCreate={create}/><WorkTypeEditor editor={editor} setEditor={setEditor} language={language} setLanguage={setLanguage} busy={busy} dirty={dirty} onSave={save} onClose={close} onDelete={remove} onArtwork={()=>setGalleryOpen(true)}/></div>
  <GalleryPicker open={galleryOpen} onClose={()=>setGalleryOpen(false)} token={token} selectedUrl={editor?.value.artworkUrl||''} title="Choose work type artwork" allowUpload={false} onSelect={item=>{setEditor(current=>current?{...current,value:{...current.value,artworkUrl:item.mediaUrl}}:current);setGalleryOpen(false);}}/>
 </section>;
}
