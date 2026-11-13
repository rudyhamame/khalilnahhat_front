import {useState} from 'react';
import {Check,Plus} from 'lucide-react';
import {displayImageUrl} from '../lib/displayImage';
import {djServiceChanges} from '../lib/bookingFlow.mjs';
import {useRentalCatalog} from '../lib/useRentalCatalog';
import {useEventOrder} from './eventOrderContext';
import './homeWork.css';

// "DJ Khalil's Work": the featured DJ service card. It sits in the Rentals chapter, left of the rental workspace. Adding the DJ service
// opens the DJ booking form in the Work chapter (this card sends the visitor there).
export default function DjWorkFeature({ar=false}){
 const tr=(en,arabic)=>ar?arabic:en,[djOpen,setDjOpen]=useState(false),order=useEventOrder(),djAdded=Boolean(order?.order.services?.includes('dj'));
 const {catalog,equipment}=useRentalCatalog();
 const djInfo=equipment.find(row=>row.id==='dj-service')||{};
 const djCover=catalog.find(row=>row.kind==='service'&&row.id==='dj')?.imageUrl||'';
 const toggleFeature=()=>setDjOpen(value=>!value);
 // Stays on this page: adding sets the DJ service on the booking, pressing again removes it.
 const toggleDj=()=>{if(djAdded)order.removeService('dj');else djServiceChanges(order.order,'dj').forEach(({path,value})=>order.setField(path,value));};
 return (
   <div className={`home-work-feature${djOpen?' is-open':''}`} role="button" aria-expanded={djOpen} aria-label={djOpen?tr("Collapse DJ Khalil's Work",'تصغير أعمال دي جي خليل'):tr("Expand DJ Khalil's Work",'توسيع أعمال دي جي خليل')} tabIndex={0} onClick={event=>{if(!event.target.closest('button'))toggleFeature();}} onKeyDown={event=>{if(event.target===event.currentTarget&&(event.key==='Enter'||event.key===' ')){event.preventDefault();toggleFeature();}}}>
    <div><p className="home-work-kicker">{tr('The heart of Echo','قلب إيكو')}</p><h2 className="home-work-feature-title">{tr('DJ Khalil Service','خدمة دي جي خليل')}</h2></div>
    {djCover&&<figure className="home-work-studio"><img src={displayImageUrl(djCover)} alt="" loading="lazy" decoding="async"/></figure>}
    {order&&<button type="button" className="home-work-add-dj" aria-pressed={djAdded} onClick={toggleDj}>{djAdded?<Check size={18} aria-hidden="true"/>:<Plus size={18} aria-hidden="true"/>}<span>{djAdded?tr('Added to booking','تمت الإضافة إلى الحجز'):tr('Add to booking','أضف إلى الحجز')}</span></button>}
   </div>
 );
}
