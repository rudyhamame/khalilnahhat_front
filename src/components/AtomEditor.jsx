import {useEffect,useRef,useState} from 'react';
import {fields,getPath,optionName,validValue} from '../lib/eventOrderCore.mjs';
import './atomEditor.css';

// Atoms a booking edits through other flows: priced choices go through "Request changes", the account owns personal info, the map owns venue data.
const ELSEWHERE=new Set(['services','equipment','music.djRequested','music.mcRequested','rental.requested','customer.email','event.venue.latitude','event.venue.longitude','event.venue.source','event.venue.sourceId','event.venue.sourceAttribution']);
const LISTS={tags:()=> '',songs:()=>({phase:'',song:''}),pairs:()=>({language:'',dialect:''})};
const blank=field=>field.type in LISTS?[]:field.type==='boolean'||field.type==='number'||field.options?null:'';
// Edit, add, delete and reorder one data atom of a saved booking. The server keeps the history ("Booking modified") and re-checks availability.
export default function AtomEditor({line,order,ar=false,onSave,onClose}){
 const tr=(en,arabic)=>ar?arabic:en,path=line.reviewPath||line.key,field=fields.find(item=>item.key===path);
 const dialog=useRef(null),[value,setValue]=useState(()=>{const current=field?getPath(order,path):null;return current??blank(field||{})}),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{dialog.current?.showModal();},[]);
 const locked=!field||ELSEWHERE.has(path)||path.startsWith('customer.')||['attachments','links','multi'].includes(field.type);
 const list=field&&field.type in LISTS,move=(index,by)=>setValue(items=>{const next=[...items],to=index+by;if(to<0||to>=next.length)return items;[next[index],next[to]]=[next[to],next[index]];return next;});
 const clean=()=>list?value.filter(item=>typeof item==='string'?item.trim():Object.values(item).some(text=>String(text).trim())):typeof value==='string'&&!value.trim()?null:value;
 const save=async(next,acknowledgeReset=false)=>{setBusy(true);setError('');try{await onSave(path,next,acknowledgeReset);onClose();}catch(e){
  if(e.payload?.code==='RESET_REQUIRED'&&window.confirm(e.message)){setBusy(false);return save(next,true);}
  setError(e.message);setBusy(false);}};
 const set=(index,patch)=>setValue(items=>items.map((item,at)=>at===index?(typeof item==='string'?patch:{...item,...patch}):item));
 const row=(item,index)=><li key={index}>
  {field.type==='tags'&&<input value={item} aria-label={line.label} maxLength={80} onChange={e=>set(index,e.target.value)}/>}
  {field.type==='songs'&&<><input value={item.phase} aria-label={tr('Moment','اللحظة')} placeholder={tr('Moment','اللحظة')} maxLength={80} onChange={e=>set(index,{phase:e.target.value})}/><input value={item.song} aria-label={tr('Song','الأغنية')} placeholder={tr('Song','الأغنية')} maxLength={200} onChange={e=>set(index,{song:e.target.value})}/></>}
  {field.type==='pairs'&&<><input value={item.language} aria-label={tr('Language','اللغة')} placeholder={tr('Language','اللغة')} maxLength={80} onChange={e=>set(index,{language:e.target.value})}/><input value={item.dialect} aria-label={tr('Dialect','اللهجة')} placeholder={tr('Dialect','اللهجة')} maxLength={80} onChange={e=>set(index,{dialect:e.target.value})}/></>}
  <button type="button" onClick={()=>move(index,-1)} disabled={index===0} aria-label={tr('Move up','تحريك لأعلى')}>↑</button>
  <button type="button" onClick={()=>move(index,1)} disabled={index===value.length-1} aria-label={tr('Move down','تحريك لأسفل')}>↓</button>
  <button type="button" onClick={()=>setValue(items=>items.filter((_,at)=>at!==index))} aria-label={tr('Delete','حذف')}>✕</button></li>;
 const control=()=>{
  if(list)return <><ul className="atom-editor-list">{value.map(row)}</ul><button type="button" onClick={()=>setValue(items=>[...items,LISTS[field.type]()])}>+ {tr('Add','إضافة')}</button></>;
  if(field.type==='boolean')return <select value={value===null?'':String(value)} onChange={e=>setValue(e.target.value===''?null:e.target.value==='true')}><option value="">{tr('Not set','غير محدد')}</option><option value="true">{tr('Yes','نعم')}</option><option value="false">{tr('No','لا')}</option></select>;
  if(field.options)return <select value={value??''} onChange={e=>setValue(e.target.value||null)}><option value="">{tr('Not set','غير محدد')}</option>{field.options.map(option=><option key={option} value={option}>{optionName(path,option,ar)||option}</option>)}</select>;
  if(field.type==='textarea')return <textarea rows={4} value={value??''} maxLength={field.max||2000} onChange={e=>setValue(e.target.value)}/>;
  if(field.type==='number')return <input type="number" min="0" max={field.max} value={value??''} onChange={e=>setValue(e.target.value===''?null:Number(e.target.value))}/>;
  return <input type={['date','time','tel','email'].includes(field.type)?field.type:'text'} value={value??''} maxLength={field.max||200} onChange={e=>setValue(e.target.value)}/>;
 };
 const next=locked?null:clean(),invalid=!locked&&next!==null&&!(list&&!next.length)&&!validValue(field,next);
 return <dialog ref={dialog} className="atom-editor" onClose={onClose} dir={ar?'rtl':'ltr'} aria-labelledby="atom-editor-title">
  <form method="dialog" onSubmit={e=>{e.preventDefault();if(!locked&&!invalid)save(next);}}>
   <h3 id="atom-editor-title">{line.label}</h3>
   {locked?<p>{tr('This detail is changed elsewhere: personal info in your account, priced services and equipment with “Request changes”, venue map data by picking the venue.','تُعدّل هذه المعلومة من مكان آخر: المعلومات الشخصية من حسابك، والخدمات والمعدات المسعّرة عبر «طلب تعديلات»، وبيانات الخريطة باختيار المكان.')}</p>:control()}
   {invalid&&<p role="alert">{tr('That value is not valid for this detail.','هذه القيمة غير صالحة.')}</p>}
   {error&&<p role="alert">{error}</p>}
   <div className="atom-editor-actions">
    {!locked&&<button type="submit" disabled={busy||invalid}>{busy?tr('Saving…','جارٍ الحفظ…'):tr('Save','حفظ')}</button>}
    {!locked&&<button type="button" disabled={busy} onClick={()=>save(blank(field))}>{tr('Clear','مسح')}</button>}
    <button type="button" onClick={onClose}>{tr('Cancel','إلغاء')}</button>
   </div>
  </form>
 </dialog>;
}
