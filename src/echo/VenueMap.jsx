import {useEffect,useMemo,useRef,useState} from 'react';
import {apiRequest} from '../lib/api';
import {VENUE_TYPES,venueTypeLabel,unknown,venueKey,editableVenue,filterExternal,emptyRoom} from './venueMapCore';
import VenueMapCanvas from './VenueMapCanvas';
import './venueMap.css';
const READ='/venue-map',ADMIN='/admin/venue-map';
const INITIAL_BOUNDS='-80.2,43.2,-78.4,44.4';
export default function VenueMap({token,isAdmin=false,ar=false,onChoose,active=true,initialVenue=null,heading=null}){
 const [bounds,setBounds]=useState(INITIAL_BOUNDS),[center,setCenter]=useState([-79.3832,43.72]),[query,setQuery]=useState(''),[type,setType]=useState(''),[capacity,setCapacity]=useState(''),[searchScope,setSearchScope]=useState('gta');
 const [records,setRecords]=useState([]),[external,setExternal]=useState([]),[selected,setSelected]=useState(null),[detail,setDetail]=useState(null),[events,setEvents]=useState([]),[draft,setDraft]=useState(null),[editId,setEditId]=useState(null),[picking,setPicking]=useState(false);
 const [status,setStatus]=useState(''),[error,setError]=useState(''),[searchError,setSearchError]=useState(''),[searchBusy,setSearchBusy]=useState(false),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0),[truncated,setTruncated]=useState(false),[detailBusy,setDetailBusy]=useState(false);
 const searchAbort=useRef(null),selectionAbort=useRef(null),saveAbort=useRef(null),initialLoaded=useRef(false),root=useRef(null);
 const tr=(en,arabic)=>ar?arabic:en;
 const visibleExternal=useMemo(()=>filterExternal(external,type,capacity),[external,type,capacity]);
 const items=useMemo(()=>[...records,...visibleExternal],[records,visibleExternal]);
 // Each bounds/filter generation owns its abort controller. A superseded result cannot replace this viewport.
 useEffect(()=>{
  if(!token||!active)return;
  const controller=new AbortController();setStatus(ar?'جارٍ تحميل الأماكن المحفوظة…':'Loading saved venues…');setError('');
  const timer=setTimeout(()=>apiRequest(READ+'/venues?'+new URLSearchParams({bounds,q:query,type,capacity}),{token,signal:controller.signal}).then(r=>{if(!controller.signal.aborted){setRecords(r.items);setTruncated(r.truncated);setStatus(r.items.length?'':ar?'لا توجد أماكن محفوظة في هذا النطاق.':'No saved venues in this view.');}}).catch(e=>{if(!controller.signal.aborted){setRecords([]);setStatus('');setError(e.message);}}),350);
  return()=>{clearTimeout(timer);controller.abort();};
 },[token,active,bounds,query,type,capacity,revision,ar]);
 useEffect(()=>{searchAbort.current?.abort();setSearchBusy(false);setExternal([]);setSearchError('');},[query,type,capacity,token,searchScope]);
 useEffect(()=>{searchAbort.current?.abort();setSearchBusy(false);},[bounds]);
 useEffect(()=>()=>{searchAbort.current?.abort();selectionAbort.current?.abort();saveAbort.current?.abort();},[]);
 useEffect(()=>{initialLoaded.current=false;setSelected(null);},[token]);
 useEffect(()=>{if(!initialLoaded.current&&initialVenue?.recordId&&token){initialLoaded.current=true;const controller=new AbortController();apiRequest(READ+'/venues/'+initialVenue.recordId,{token,signal:controller.signal}).then(r=>setSelected(r.item)).catch(()=>{});return()=>controller.abort();}},[initialVenue?.recordId,token]);
 const selectedId=selected?.saved?selected.id:null;
 useEffect(()=>{
  setDetail(null);setEvents([]);if(!selectedId||!token){setDetailBusy(false);return;}
  const controller=new AbortController();selectionAbort.current=controller;setDetailBusy(true);
  apiRequest((isAdmin?ADMIN:READ)+'/venues/'+selectedId,{token,signal:controller.signal}).then(r=>{if(!controller.signal.aborted){setDetail(r.item);setEvents(r.events||[]);}}).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setDetailBusy(false);});
  return()=>controller.abort();
 },[selectedId,token,isAdmin,revision]);
 const search=async()=>{
  if(query.trim().length<3||searchBusy)return;searchAbort.current?.abort();const controller=new AbortController();searchAbort.current=controller;setSearchBusy(true);setSearchError('');setExternal([]);setSelected(null);
  try{const r=await apiRequest(READ+'/search?'+new URLSearchParams({q:query.trim(),bounds:searchScope==='gta'?INITIAL_BOUNDS:bounds}),{token,signal:controller.signal});if(!controller.signal.aborted){setExternal(r.items);if(!r.items.length)setSearchError(tr('No matching places found. Try a shorter name, an address, or a wider search area.','لا توجد نتائج مطابقة. جرّب اسماً أقصر أو عنواناً أو نطاق بحث أوسع.'));}}
  catch(e){if(!controller.signal.aborted)setSearchError(e.message);}finally{if(!controller.signal.aborted)setSearchBusy(false);}
 };
 const select=v=>{setSelected(v);setDraft(null);setPicking(false);};
 const edit=v=>{setError('');setEditId(v.saved?v.id:null);setDraft(editableVenue(v));};
 const save=async e=>{
  e.preventDefault();if(busy)return;setBusy(true);setError('');const controller=new AbortController();saveAbort.current=controller;
  try{const r=await apiRequest(ADMIN+'/venues'+(editId?'/'+editId:''),{token,method:editId?'PUT':'POST',body:draft,signal:controller.signal});if(controller.signal.aborted)return;setDraft(null);setPicking(false);setSelected(r.item);setExternal([]);setRevision(n=>n+1);}
  catch(e){if(!controller.signal.aborted)setError(e.message);}finally{if(!controller.signal.aborted)setBusy(false);}
 };
 const show=detail||selected;
 const close=()=>{setSelected(null);setDraft(null);setPicking(false);root.current?.querySelector('.vm-search input')?.focus();};
 return <section ref={root} className="venue-map avail-venue" dir={ar?'rtl':'ltr'} aria-label={tr('Find your venue','ابحث عن مكان الفعالية')} onKeyDown={e=>{if(e.key==='Escape'&&(draft||selected)){e.stopPropagation();close();}}}>
  <div className="vm-controls">{heading}
  {isAdmin&&<button type="button" className="vm-add-venue" onClick={()=>edit({latitude:center[1],longitude:center[0],venueType:'other',source:'manual'})}>{tr('+ Add venue','+ إضافة مكان')}</button>}
  <div className="vm-search"><input aria-label={tr('Search venue name, address or city','ابحث بالاسم أو العنوان أو المدينة')} placeholder={tr('Name, address or city','الاسم أو العنوان أو المدينة')} value={query} maxLength={160} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();search();}}}/><button type="button" disabled={!token||query.trim().length<3||searchBusy} onClick={search}>{searchBusy?tr('Searching…','جارٍ البحث…'):tr('Search places','ابحث عن أماكن')}</button></div>
  <div className="vm-filters"><label>{tr('Search area','نطاق البحث')}<select aria-label={tr('Search area','نطاق البحث')} value={searchScope} onChange={e=>setSearchScope(e.target.value)}><option value="gta">{tr('Greater Toronto Area','تورونتو الكبرى')}</option><option value="view">{tr('This map view','نطاق الخريطة الحالي')}</option></select></label><label><select aria-label={tr('Type','النوع')} value={type} onChange={e=>setType(e.target.value)}><option value="">{tr('Type','النوع')}</option>{Object.entries(VENUE_TYPES).map(([k])=><option key={k} value={k}>{venueTypeLabel(k,ar)}</option>)}</select></label><label><select aria-label={tr('Capacity','السعة')} value={capacity} onChange={e=>setCapacity(e.target.value)}><option value="">{tr('Capacity','السعة')}</option><option value="known">{tr('Capacity available','السعة معروفة')}</option><option value="unknown">{tr('Unknown capacity','السعة غير معروفة')}</option></select></label></div>

   {(show||draft)&&<aside className="vm-details" aria-label={tr('Venue details','تفاصيل المكان')}><button type="button" className="vm-close" aria-label={tr('Close venue details','إغلاق التفاصيل')} onClick={close}>×</button>
    {draft?<VenueEditor key={editId||'new'} draft={draft} setDraft={setDraft} token={token} busy={busy} picking={picking} onPick={()=>setPicking(v=>!v)} onSave={save} ar={ar}/>:<>
     <span className="vm-badge">{show.saved?tr('Echo saved venue','مكان محفوظ لدى Echo'):tr('External search result','نتيجة بحث خارجية')}</span><h3>{show.name}</h3><p>{show.address}</p><p>{venueTypeLabel(show.venueType,ar)} · {show.verificationStatus==='verified'?tr('Verified','موثّق'):tr('Unverified','غير موثّق')}</p>{show.lastVerifiedAt&&<small>{tr('Last verified: ','آخر تحقق: ')}{new Date(show.lastVerifiedAt).toLocaleDateString(ar?'ar-CA':'en-CA')}</small>}
     <p className="vm-coordinates">{show.latitude.toFixed(5)}, {show.longitude.toFixed(5)}</p><h4>{tr('Rooms & spaces','القاعات والمساحات')}</h4>{!(show.rooms||[]).length?<p>{tr('Capacity: Unknown · Area: Unknown','السعة: غير معروفة · المساحة: غير معروفة')}</p>:show.rooms.map((r,i)=><article className="vm-room" key={i}><strong>{r.name}</strong><dl><dt>{tr('Seated','جلوس')}</dt><dd>{r.seatedCapacity==null?tr('Unknown','غير معروفة'):unknown(r.seatedCapacity)}</dd><dt>{tr('Standing','وقوف')}</dt><dd>{r.standingCapacity==null?tr('Unknown','غير معروفة'):unknown(r.standingCapacity)}</dd><dt>{tr('Interior area','المساحة الداخلية')}</dt><dd>{r.areaSqM==null?tr('Unknown','غير معروفة'):unknown(r.areaSqM,ar?' م²':' m²')}</dd></dl>{r.layoutNotes&&<p>{r.layoutNotes}</p>}{r.capacitySource&&<small>{tr('Capacity source: ','مصدر السعة: ')}{r.capacitySource}</small>}{r.areaSource&&<small>{r.areaMethod} · {r.areaSource}</small>}</article>)}
     {show.saved&&<><h4>{isAdmin?tr('Associated events','الفعاليات المرتبطة'):tr('Your associated events','فعالياتك المرتبطة')}</h4>{detailBusy?<p role="status">{tr('Loading details…','جارٍ التحميل…')}</p>:events.length?events.map(ev=><p key={ev.kind+ev.id}>{ev.label}</p>):<p>{tr('No associated events.','لا توجد فعاليات مرتبطة.')}</p>}</>}
     {show.sourceAttribution&&<p className="vm-source">{show.sourceAttribution}</p>}
     {onChoose&&<button type="button" className="vm-primary" disabled={detailBusy} onClick={()=>onChoose(show)}>{tr('Use this venue','استخدم هذا المكان')}</button>}{isAdmin&&<button type="button" disabled={detailBusy} onClick={()=>edit(show)}>{show.saved?tr('Edit venue','تعديل المكان'):tr('Save to Echo directory','حفظ في دليل Echo')}</button>}
    </>}
    {error&&<p className="vm-error" role="alert">{error}</p>}
   </aside>}
  <div className="vm-results" aria-live="polite">{!token?<p>{tr('Sign in to search and select a venue. The map is available without sharing your location.','سجّل الدخول للبحث واختيار مكان. لا تتطلب الخريطة مشاركة موقعك.')}</p>:<><div className="vm-results-heading"><strong>{tr('Venue results','نتائج الأماكن')}</strong><span>{records.length} {tr('saved','محفوظ')} · {visibleExternal.length} {tr('external','خارجي')}</span></div>{status&&<p role="status">{status}</p>}{error&&!draft&&<p role="alert" className="vm-error">{error} <button type="button" onClick={()=>setRevision(n=>n+1)}>{tr('Retry','إعادة المحاولة')}</button></p>}{searchError&&<p role="status">{searchError}</p>}{truncated&&<p>{tr('Showing 300 venues. Zoom in or narrow your search.','يتم عرض 300 مكان. قرّب الخريطة أو حدّد البحث.')}</p>}<div className="vm-list">{items.map(v=><button type="button" className={selected&&venueKey(selected)===venueKey(v)?'is-selected':''} key={venueKey(v)} onClick={()=>select(v)}><span className="vm-list-icon" aria-hidden="true">{({restaurant:'R',banquet_hall:'B',outdoor:'O',other:'V'})[v.venueType]}</span><span><strong>{v.name}</strong><small>{v.address}</small><small>{v.saved?tr('Echo directory','دليل Echo'):tr('External · Geoapify','خارجي · Geoapify')}</small></span></button>)}</div></>}
   {!!external.length&&<small className="vm-source"><a href="https://www.geoapify.com/">Geoapify</a> · <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a></small>}
  </div>
  </div>
  <div className="vm-stage"><VenueMapCanvas items={items} searchResults={external} selected={selected} draft={draft} picking={picking} onPick={([longitude,latitude])=>{setDraft(v=>v?{...v,longitude,latitude}:v);setPicking(false);}} onBounds={setBounds} onCenter={setCenter} onSelect={select}/></div>
 </section>;
}
function VenueEditor({draft,setDraft,token,busy,picking,onPick,onSave,ar}){
 const [eventQuery,setEventQuery]=useState(''),[choices,setChoices]=useState([]),[eventError,setEventError]=useState('');const tr=(en,a)=>ar?a:en;
 useEffect(()=>{const controller=new AbortController();const timer=setTimeout(()=>apiRequest(ADMIN+'/events?'+new URLSearchParams({q:eventQuery}),{token,signal:controller.signal}).then(r=>{if(!controller.signal.aborted){setChoices(r.items);setEventError('');}}).catch(e=>{if(!controller.signal.aborted)setEventError(e.message);}),350);return()=>{clearTimeout(timer);controller.abort();};},[eventQuery,token]);
 const update=(key,value)=>setDraft(v=>({...v,[key]:value}));
 const field=(key,label,type='text',required=false)=> type==='number'?<CoordinateField key={key} label={label} value={draft[key]} onChange={value=>update(key,value)}/>:<label key={key}>{label}<input type={type} value={draft[key]??''} required={required} maxLength={key==='address'?500:240} step={type==='number'?'any':undefined} onChange={e=>update(key,type==='number'?Number(e.target.value):e.target.value)}/></label>;
 const updateRoom=(i,key,value)=>setDraft(v=>({...v,rooms:v.rooms.map((r,j)=>i===j?{...r,[key]:value}:r)}));
 return <form className="vm-editor" onSubmit={onSave}><h3>{tr('Venue record','سجل المكان')}</h3>{field('name',tr('Name','الاسم'),'text',true)}{field('address',tr('Address','العنوان'),'text',true)}{field('city',tr('City','المدينة'))}{field('postalCode',tr('Postal code','الرمز البريدي'))}{field('country',tr('Country','الدولة'))}<label>{tr('Venue type','نوع المكان')}<select value={draft.venueType} onChange={e=>update('venueType',e.target.value)}>{Object.entries(VENUE_TYPES).map(([k])=><option key={k} value={k}>{venueTypeLabel(k,ar)}</option>)}</select></label>
  <button type="button" aria-pressed={picking} onClick={onPick}>{picking?tr('Cancel pin placement','إلغاء تحديد المكان'):tr('Place pin on map','حدد المكان على الخريطة')}</button><small>{tr('Drag the + pin or enter exact coordinates.','اسحب العلامة + أو أدخل الإحداثيات.')}</small>{field('latitude',tr('Latitude','خط العرض'),'number',true)}{field('longitude',tr('Longitude','خط الطول'),'number',true)}
  <label><input type="checkbox" checked={draft.verificationStatus==='verified'} onChange={e=>setDraft(v=>({...v,verificationStatus:e.target.checked?'verified':'unverified',lastVerifiedAt:e.target.checked?new Date().toISOString():null}))}/>{tr('I verified this venue and location','تحققت من هذا المكان وموقعه')}</label>
  <h4>{tr('Rooms & spaces','القاعات والمساحات')}</h4><p>{tr('Leave missing measurements blank. Enter only sourced interior areas.','اترك القياسات غير المتوفرة فارغة. أدخل مساحة داخلية بمصدر موثوق فقط.')}</p>
  {draft.rooms.map((r,i)=><fieldset key={i}><legend>{tr('Space','المساحة')} {i+1}</legend>{[['name','Room name','text'],['seatedCapacity','Seated capacity','number'],['standingCapacity','Standing capacity','number'],['layoutNotes','Layout notes','text'],['capacitySource','Capacity source','text'],['areaSqM','Interior area (m²)','number'],['areaMethod','Measurement method','text'],['areaSource','Area source','text']].map(([key,label,type])=><label key={key}>{label}<input type={type} min={type==='number'?1:undefined} step={key==='areaSqM'?'any':'1'} value={r[key]??''} required={key==='name'} maxLength={key==='layoutNotes'?2000:500} placeholder={type==='number'?'Unknown':undefined} onChange={e=>updateRoom(i,key,type==='number'?(e.target.value===''?null:Number(e.target.value)):e.target.value)}/></label>)}<button type="button" onClick={()=>update('rooms',draft.rooms.filter((_,j)=>j!==i))}>{tr('Remove space','حذف المساحة')}</button></fieldset>)}
  <button type="button" onClick={()=>update('rooms',[...draft.rooms,emptyRoom()])}>{tr('+ Add space','+ إضافة مساحة')}</button><h4>{tr('Link existing events','ربط فعاليات موجودة')}</h4><input aria-label="Find an existing event" value={eventQuery} onChange={e=>setEventQuery(e.target.value)} placeholder={tr('Search event reference or type','ابحث عن مرجع الفعالية أو نوعها')}/>{eventError&&<p role="alert">{eventError}</p>}
  {draft.eventLinks.map(l=><div className="vm-event-link" key={l.kind+l.id}><span>{choices.find(c=>c.kind===l.kind&&c.id===l.id)?.label||`${l.kind} · ${l.id}`}</span><button type="button" onClick={()=>update('eventLinks',draft.eventLinks.filter(v=>v.kind!==l.kind||v.id!==l.id))}>{tr('Unlink','إلغاء الربط')}</button></div>)}
  {choices.filter(c=>!draft.eventLinks.some(l=>l.kind===c.kind&&l.id===c.id)).map(c=><button type="button" key={c.kind+c.id} onClick={()=>update('eventLinks',[...draft.eventLinks,{kind:c.kind,id:c.id}])}>+ {c.label}</button>)}
  <button className="vm-primary" disabled={busy}>{busy?tr('Saving…','جارٍ الحفظ…'):tr('Save venue','حفظ المكان')}</button>
 </form>;
}

function CoordinateField({label,value,onChange}){
 const [raw,setRaw]=useState(String(value??'')),editing=useRef(false);
 useEffect(()=>{if(!editing.current)setRaw(String(value??''));},[value]);
 return <label>{label}<input type="number" step="any" required value={raw} onFocus={()=>{editing.current=true;}} onBlur={()=>{editing.current=false;setRaw(String(value??''));}} onChange={e=>{setRaw(e.target.value);if(e.target.value!==''&&Number.isFinite(Number(e.target.value)))onChange(Number(e.target.value));}}/></label>;
}
