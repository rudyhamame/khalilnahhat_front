import {useEffect,useState} from 'react';
import {Search,MapPin} from 'lucide-react';
import './aiVenueSearch.css';

export default function AiVenueSearch({search,onSearch,onChoose,onCancel,disabled,ar=false}){
 const [query,setQuery]=useState(search.query),tr=(en,a)=>ar?a:en;
 useEffect(()=>setQuery(search.query),[search.query]);
 return <section className="ai-venue-search" aria-label={tr('Choose your venue','اختر مكان الفعالية')} aria-busy={search.busy}>
  <header><MapPin size={16}/><strong>{tr('Find a venue','ابحث عن مكان')}</strong></header>
  <p>{tr('Choose a result, then confirm its AI task to update your draft.','اختر نتيجة ثم أكّد مهمة المساعد لتحديث المسودة.')}</p>
  <div className="ai-venue-query"><input aria-label={tr('Venue search','البحث عن مكان')} value={query} maxLength={160} disabled={disabled||search.busy} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();if(query.trim().length>=3)onSearch(query);}}}/><button type="button" aria-label={tr('Search venues','ابحث عن أماكن')} disabled={disabled||search.busy||query.trim().length<3} onClick={()=>onSearch(query)}><Search size={15}/></button></div>
  <div className="ai-venue-results" aria-live="polite">{search.busy?<p>{tr('Searching venues…','جارٍ البحث عن أماكن…')}</p>:search.error?<p role="status">{search.error}</p>:<><small>{search.items.length} {tr('results','نتائج')}</small>{search.items.map((item,i)=><button key={`${item.sourceId||item.name}:${i}`} type="button" disabled={disabled} onClick={()=>onChoose(item)}><strong>{item.name}</strong><span>{item.address}</span><small>{tr('Choose this venue','اختر هذا المكان')}</small></button>)}</>}</div>
  <button type="button" className="ai-venue-cancel" disabled={disabled} onClick={onCancel}>{tr('Cancel search','إلغاء البحث')}</button>
 </section>;
}
