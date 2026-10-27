import {useState} from 'react';
import {MapPin} from 'lucide-react';
import {formatCanadianPostalCode,recentEventAddresses} from '../lib/recentEventAddresses';

export default function EventAddress({ar,value,onChange}){
  const tr=(en,arabic)=>ar?arabic:en;
  const [recent,setRecent]=useState(recentEventAddresses);
  const [focused,setFocused]=useState(false);
  const matches=recent.filter(item=>`${item.venueAddress} ${item.city} ${item.postalCode}`.toLowerCase().includes(value.venueAddress.toLowerCase()));
  const editAddress=venueAddress=>{
    const postal=venueAddress.match(/\b[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\s?\d[ABCEGHJ-NPRSTV-Z]\d\b/i);
    onChange({...value,venueAddress,...(postal?{postalCode:formatCanadianPostalCode(postal[0])}:{})});
  };
  return <div className="fast-booking-address">
    <label htmlFor="event-planner-address"><MapPin size={13} aria-hidden="true"/>{tr('EVENT ADDRESS','عنوان الفعالية')}</label>
    <input id="event-planner-address" type="text" value={value.venueAddress} maxLength={250} autoComplete="section-event street-address" placeholder={tr('Street address or venue','عنوان الشارع أو القاعة')} onChange={event=>editAddress(event.target.value)} onFocus={()=>{setRecent(recentEventAddresses());setFocused(true);}} onBlur={event=>{if(!event.currentTarget.parentElement.contains(event.relatedTarget))setFocused(false);}} onKeyDown={event=>{if(event.key==='Escape')setFocused(false);}} aria-describedby="event-address-hint"/>
    {focused&&matches.length>0&&<div className="event-address-suggestions" role="group" aria-label={tr('Recently used event addresses','عناوين الفعاليات المستخدمة مؤخراً')} onFocus={()=>setFocused(true)} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setFocused(false);}}>
      <span>{tr('RECENT VENUES · THIS DEVICE','أماكن حديثة · على هذا الجهاز')}</span>
      {matches.map(item=><button key={item.venueAddress} type="button" onMouseDown={event=>event.preventDefault()} onClick={()=>{onChange(item);setFocused(false);}}><strong>{item.venueAddress}</strong><small>{[item.city,item.postalCode].filter(Boolean).join(' · ')}</small></button>)}
    </div>}
    <div className="event-address-locality">
      <label htmlFor="event-planner-city">{tr('City','المدينة')}<input id="event-planner-city" value={value.city} maxLength={100} autoComplete="section-event address-level2" placeholder={tr('Toronto','تورونتو')} onChange={event=>onChange({...value,city:event.target.value})}/></label>
      <label htmlFor="event-planner-postal">{tr('Postal code','الرمز البريدي')}<input id="event-planner-postal" value={value.postalCode} maxLength={16} autoComplete="section-event postal-code" placeholder="A1A 1A1" onChange={event=>onChange({...value,postalCode:formatCanadianPostalCode(event.target.value)})}/></label>
    </div>
    <small id="event-address-hint">{tr('Recent venues stay on this device. Address can be confirmed later.','تبقى الأماكن الحديثة على هذا الجهاز. يمكن تأكيد العنوان لاحقاً.')}</small>
  </div>;
}
