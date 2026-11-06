import {Search,ChevronDown,SlidersHorizontal,Plus,ArrowRight,Send} from 'lucide-react';
import {useEffect,useMemo,useRef,useState} from 'react';
import {findVenues} from '../lib/venueSearch';
import {VENUE_TYPES,venueTypeLabel,venueKey} from './venueMapCore';
import VenueMapCanvas from './VenueMapCanvas';
import './venueMap.css';
export default function VenueMap({token,ar=false,onChoose,heading=null,setting='',onSetting=null,venue=null,aiSearch=null,onSendToAi=null,aiSendDisabled=false}){
 const [center,setCenter]=useState([-79.3832,43.72]),[query,setQuery]=useState(''),[submitted,setSubmitted]=useState(''),[refineOpen,setRefineOpen]=useState(false),[type,setType]=useState(''),[searchScope,setSearchScope]=useState('ontario');
 const [external,setExternal]=useState([]),[selected,setSelected]=useState(null),[draft,setDraft]=useState(null);
 const [searchError,setSearchError]=useState(''),[searchBusy,setSearchBusy]=useState(false),[aiMode,setAiMode]=useState(false);
 const searchAbort=useRef(null),root=useRef(null),aiScopeReset=useRef(false);
 const [sentVenueKey,setSentVenueKey]=useState(null);
 const tr=(en,arabic)=>ar?arabic:en;
 const items=useMemo(()=>external.filter(v=>!type||v.venueType===type),[external,type]);
 useEffect(()=>{if(aiScopeReset.current){aiScopeReset.current=false;return;}searchAbort.current?.abort();setSearchBusy(false);setExternal([]);setSearchError('');},[token,searchScope]);
 useEffect(()=>()=>searchAbort.current?.abort(),[]);
 useEffect(()=>setSelected(null),[token]);
 useEffect(()=>{
  if(!aiSearch?.query)return;
  searchAbort.current?.abort();setQuery(aiSearch.query);setSubmitted(aiSearch.query);
  setType('');if(searchScope!=='ontario'){aiScopeReset.current=true;setSearchScope('ontario');}setExternal(aiSearch.items||[]);setSentVenueKey(null);
  setSearchBusy(Boolean(aiSearch.busy));setSearchError(aiSearch.error||'');
  setSelected(null);setDraft(null);setAiMode(true);
 },[aiSearch?.id,aiSearch?.items,aiSearch?.busy,aiSearch?.error]);
 const search=async()=>{
  setSubmitted(query.trim());setAiMode(false);setSentVenueKey(null);
  if(query.trim().length<3||searchBusy)return;searchAbort.current?.abort();const controller=new AbortController();searchAbort.current=controller;setSearchBusy(true);setSearchError('');setExternal([]);setSelected(null);
  try{const found=await findVenues(query,{token,signal:controller.signal,scope:searchScope,type});if(!controller.signal.aborted){setExternal(found);if(!found.length)setSearchError(tr('No matching places found. Try a shorter name, an address, or a wider search area.','لا توجد نتائج مطابقة. جرّب اسماً أقصر أو عنواناً أو نطاق بحث أوسع.'));}}
  catch(e){if(!controller.signal.aborted)setSearchError(e.message);}finally{if(!controller.signal.aborted)setSearchBusy(false);}
 };
 const select=v=>{setSelected(v);setDraft(null);};
 const edit=(from={})=>{setSelected(null);setDraft({name:from.name||'',address:from.address||'',city:from.city||'',postalCode:from.postalCode||'',country:'Canada',latitude:null,longitude:null,venueType:'other',source:'manual'});};
 // Manually entered locations belong only to this booking.
 const useTypedVenue=e=>{e.preventDefault();const place={...draft,source:'manual',sourceId:'',sourceAttribution:'',latitude:null,longitude:null};if(aiMode&&onSendToAi){if(aiSendDisabled||!onSendToAi(place))return;}else onChoose(place);close();};
 const editing=!!draft;
 useEffect(()=>{if(editing)root.current?.querySelector('.vm-editor-panel')?.scrollTo({top:0});},[editing]);
 const show=selected;
 const confirmationKey=show&&!draft?venueKey(show):null;
 useEffect(()=>{if(confirmationKey){const card=root.current?.querySelector('.vm-confirmation');card?.focus({preventScroll:true});card?.scrollIntoView({block:'nearest'});}},[confirmationKey]);
 const close=()=>{setSelected(null);setDraft(null);root.current?.querySelector('.vm-search input')?.focus();};
 return <section ref={root} className="venue-map avail-venue" dir={ar?'rtl':'ltr'} aria-label={tr('Find your venue','ابحث عن مكان الفعالية')} onKeyDown={e=>{if(e.key==='Escape'&&(draft||selected)){e.stopPropagation();close();}}}>
  <div className="vm-controls">{heading}<div className="vm-controls-body">
  <div className="vm-discovery">
   {(venue?.name||venue?.address||venue?.city||venue?.postalCode)&&<section className="vm-filter-card" aria-live="polite"><strong>{tr('Your draft venue','مكان الفعالية في المسودة')}</strong><p>{[venue.name,venue.address,venue.city,venue.postalCode].filter(Boolean).join(' · ')}</p>{onChoose&&<button type="button" className="vm-add-venue" onClick={()=>edit(venue)}>{tr('Edit venue','تعديل المكان')}</button>}</section>}
   <div className="vm-filter-card"><button type="button" className="vm-filter-heading vm-filter-toggle" aria-expanded={refineOpen} aria-controls="vm-filters" onClick={()=>setRefineOpen(v=>!v)}><SlidersHorizontal size={14} aria-hidden="true"/><span>{tr('Refine your search','حدد بحثك')}</span><ChevronDown size={14} aria-hidden="true"/></button>{refineOpen&&<div className="vm-filters" id="vm-filters"><label className="vm-search-area">{tr('Search area','نطاق البحث')}<select aria-label={tr('Search area','نطاق البحث')} value={searchScope} onChange={e=>setSearchScope(e.target.value)}><option value="ontario">{tr('Ontario','أونتاريو')}</option><option value="outside">{tr('Outside Greater Toronto Area','خارج تورونتو الكبرى')}</option><option value="gta">{tr('Inside Greater Toronto Area','داخل تورونتو الكبرى')}</option></select></label><label>{tr('Venue type','نوع المكان')}<select aria-label={tr('Type','النوع')} value={type} onChange={e=>setType(e.target.value)}><option value="">{tr('All types','كل الأنواع')}</option>{Object.entries(VENUE_TYPES).map(([k])=><option key={k} value={k}>{venueTypeLabel(k,ar)}</option>)}</select></label></div>}</div>
   <div className="vm-search"><label className="vm-field-label" htmlFor="venue-place-search">{tr('Find a venue','ابحث عن مكان')}</label><div className="vm-search-field"><Search size={17} aria-hidden="true"/><input id="venue-place-search" autoComplete="off" aria-label={tr('Search venue name, address or city','ابحث بالاسم أو العنوان أو المدينة')} placeholder={tr('Name, address or city','الاسم أو العنوان أو المدينة')} value={query} maxLength={160} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();search();}}}/></div>{onSetting&&<label className="vm-setting"><select required aria-required="true" aria-label={tr('Indoor or outdoor? (required)','داخلي أم خارجي؟ (مطلوب)')} value={setting} onChange={e=>onSetting(e.target.value)}><option value="" disabled hidden>{tr('Indoor or outdoor? *','داخلي أم خارجي؟ *')}</option><option value="indoor">{tr('Indoor','داخلي')}</option><option value="outdoor">{tr('Outdoor','خارجي')}</option></select></label>}<button className="vm-search-submit" type="button" aria-label={tr('Search places','ابحث عن أماكن')} disabled={!token||query.trim().length<3||searchBusy} onClick={search}>{searchBusy?tr('Searching…','جارٍ البحث…'):tr('Search venues','ابحث عن أماكن')}<ArrowRight size={15} aria-hidden="true"/></button></div>
  </div>



  <div className="vm-results" aria-live="polite">{!token?<p>{tr('Sign in to search and select a venue. The map is available without sharing your location.','سجّل الدخول للبحث واختيار مكان. لا تتطلب الخريطة مشاركة موقعك.')}</p>:<><div className="vm-results-heading"><strong>{tr('Venue results','نتائج الأماكن')}</strong><span>{items.length} {tr('results','نتائج')}</span></div>{!submitted&&!searchBusy&&<p>{tr('Search by venue name, address or city.','ابحث باسم المكان أو العنوان أو المدينة.')}</p>}{searchBusy&&<p role="status">{tr('Searching venues…','جارٍ البحث عن أماكن…')}</p>}{searchError&&<p role="status">{searchError}</p>}<div className="vm-list">{items.map(v=><button type="button" className={selected&&venueKey(selected)===venueKey(v)?'is-selected':''} key={venueKey(v)} onClick={()=>select(v)}><span className="vm-list-icon" aria-hidden="true">{({restaurant:'R',banquet_hall:'B',outdoor:'O',other:'V'})[v.venueType]}</span><span><strong>{v.name}</strong><small>{v.address}</small><small>{tr('Geoapify result','نتيجة Geoapify')}</small></span></button>)}</div></>}
  </div>
  {onChoose&&<div className="vm-booking-action"><strong className="vm-booking-question">{tr('Did not see your venue?','لم تجد مكانك؟')}</strong><button type="button" className="vm-add-venue" onClick={()=>edit()}><Plus size={16} aria-hidden="true"/>{tr('Add a venue','إضافة مكان')}</button><small>{tr('Added to this booking only.','يُضاف إلى هذا الحجز فقط.')}</small></div>}
  {draft&&<BookingVenueForm draft={draft} setDraft={setDraft} setting={setting} onSetting={onSetting} needsSetting={!setting} onSubmit={useTypedVenue} onCancel={close} ar={ar}/>}
  </div></div>
  <div className="vm-stage"><VenueMapCanvas items={items} searchResults={external} selected={selected} draft={null} picking={false} onPick={()=>{}} onCenter={setCenter} onSelect={select}/>{show&&!draft&&<aside className="vm-details vm-confirmation" role="dialog" aria-modal="false" aria-labelledby="vm-confirm-title" tabIndex={-1}><button type="button" className="vm-close" aria-label={tr('Close venue details','إغلاق التفاصيل')} onClick={close}>×</button>
     <h3 id="vm-confirm-title">{tr('Use this venue?','هل تريد اختيار هذا المكان؟')}</h3><span className="vm-badge">{tr('Search result','نتيجة بحث')}</span><h4 className="vm-confirm-name">{show.name}</h4><p>{show.address}</p><p>{venueTypeLabel(show.venueType,ar)} · {show.verificationStatus==='verified'?tr('Verified','موثّق'):tr('Unverified','غير موثّق')}</p>{show.lastVerifiedAt&&<small>{tr('Last verified: ','آخر تحقق: ')}{new Date(show.lastVerifiedAt).toLocaleDateString(ar?'ar-CA':'en-CA')}</small>}
     <details className="vm-confirm-facts"><summary>{tr('Venue details','تفاصيل المكان')}</summary>     <p className="vm-coordinates">{show.latitude.toFixed(5)}, {show.longitude.toFixed(5)}</p></details>
     <div className="vm-confirm-actions"><button type="button" onClick={close}>{tr('Cancel','إلغاء')}</button>{onChoose&&!aiMode&&<button type="button" className="vm-primary" disabled={!setting} title={setting?undefined:tr('Choose indoor or outdoor first','اختر داخلي أو خارجي أولاً')} onClick={()=>{if(!show.city||!show.postalCode){edit(show);return;}onChoose(show);close();}}>{show.city&&show.postalCode?tr('Accept venue','اختيار المكان'):tr('Complete details','أكمل التفاصيل')}</button>}{onSendToAi&&<button type="button" className="vm-primary vm-send-ai" disabled={aiSendDisabled||sentVenueKey===venueKey(show)} aria-label={tr('Send selected venue to AI tasks','إرسال المكان المحدد إلى مهام المساعد')} title={tr('Send to AI · confirm in AI tasks','إرسال للمساعد · أكّد في مهام المساعد')} onClick={()=>{if(onSendToAi(show))setSentVenueKey(venueKey(show));}}><Send size={18} aria-hidden="true"/></button>}</div>
</aside>}</div>
 </section>;
}
function BookingVenueForm({draft,setDraft,setting,onSetting,needsSetting,onSubmit,onCancel,ar}){
 const tr=(en,a)=>ar?a:en,update=(key,value)=>setDraft(v=>({...v,[key]:value}));
 const field=(key,label,required=false)=><label key={key}>{label}<input type="text" autoComplete="off" value={draft[key]??''} required={required} maxLength={key==='address'?240:160} onChange={e=>update(key,e.target.value)}/></label>;
 return <form className="vm-editor" onSubmit={onSubmit}>
  <fieldset className="vm-form-section">{field('name',tr('Venue name','اسم المكان'),true)}{field('address',tr('Street address','العنوان'),true)}<div className="vm-field-pair">{field('city',tr('City','المدينة'),true)}{field('postalCode',tr('Postal code','الرمز البريدي'),true)}</div><label><select required aria-required="true" aria-label={tr('Indoor or outdoor? (required)','داخلي أم خارجي؟ (مطلوب)')} value={setting||''} disabled={!onSetting} onChange={e=>onSetting?.(e.target.value)}><option value="" disabled hidden>{tr('Indoor or outdoor? *','داخلي أم خارجي؟ *')}</option><option value="indoor">{tr('Indoor','داخلي')}</option><option value="outdoor">{tr('Outdoor','خارجي')}</option></select></label></fieldset>
  <div className="vm-editor-actions"><button type="button" onClick={onCancel}>{tr('Cancel','إلغاء')}</button><button className="vm-primary" disabled={needsSetting} title={needsSetting?tr('Choose indoor or outdoor first','اختر داخلي أو خارجي أولاً'):undefined}>{tr('Use this venue','استخدم هذا المكان')}</button></div>
 </form>;
}
