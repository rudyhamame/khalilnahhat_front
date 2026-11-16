import {useMemo} from 'react';
import {ArrowUpRight,Box,Disc3,Layers,Minus,Plus,X} from 'lucide-react';
import {serviceIcon} from '../lib/serviceIcons';
import {rentalServices,rentalServiceEquipment} from '../lib/numberedRentalCatalog';
import {isEquipmentSet} from '../components/equipmentSets';
import {displayImageUrl} from '../lib/displayImage';
import {useCart} from './cart';
import {useEventOrder} from './eventOrderContext';
import {useRentalCatalog} from '../lib/useRentalCatalog';
import './rentalsSoFar.css';

// Third viewport of the Services page. Same idea as "Your event so far" on the Book page: the copy on one side, a review card on the other
// listing what has been chosen (or "Not set yet"), what is still missing, and a Continue button that opens the booking review.
export default function RentalsSoFar({ar=false}){
  const tr=(en,arabic)=>ar?arabic:en,cart=useCart(),order=useEventOrder(),{catalog,equipment:items}=useRentalCatalog();
  const lines=useMemo(()=>Object.values(cart||{}).filter(line=>line?.quantity>0).map(line=>({...items.find(item=>item.id===line.id),...line})).filter(line=>line.name),[cart,items]);
  // The selected equipment, grouped under the service it belongs to (sets belong to none and get their own group).
  const groups=useMemo(()=>{
    const taken=new Set(),out=[];
    for(const service of rentalServices(catalog)){
      const own=new Set(rentalServiceEquipment(service,items).filter(row=>!isEquipmentSet(row)).map(row=>row.id)),rows=lines.filter(line=>own.has(line.id)&&!taken.has(line.id));
      rows.forEach(line=>taken.add(line.id));
      if(rows.length)out.push({id:service.id,title:tr(service.name,service.nameAr||service.name),Icon:serviceIcon(service),rows});
    }
    const sets=lines.filter(line=>isEquipmentSet(line)&&!taken.has(line.id));sets.forEach(line=>taken.add(line.id));
    if(sets.length)out.push({id:'sets',title:tr('Sets','مجموعات'),Icon:Layers,rows:sets});
    const rest=lines.filter(line=>!taken.has(line.id));
    if(rest.length)out.push({id:'other',title:tr('Other equipment','معدات أخرى'),Icon:Box,rows:rest});
    return out;
  },[catalog,items,lines,ar]);// eslint-disable-line react-hooks/exhaustive-deps
  const djAdded=Boolean(order?.order.services?.includes('dj')),total=lines.reduce((sum,line)=>sum+line.quantity,0);
  const empty=!djAdded&&!lines.length;
  const missing=empty?[tr('Add the DJ service or at least one piece of equipment.','أضف خدمة الدي جي أو قطعة معدات واحدة على الأقل.')]:[];
  const goTo=id=>document.getElementById(id)?.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  return <section id="rentals-so-far" className="rsf rw-vp" aria-labelledby="rsf-title" dir={ar?'rtl':'ltr'}>
    <div className="rsf-copy">
      <span className="rsf-num">04</span>
      <h2 id="rsf-title">{tr('Looking good? Let’s keep going.','هل كل شيء جاهز؟ لنتابع.')}</h2>
      <p>{tr('Take a moment to check your choices. Next, we’ll bring them together with your event details for a quote request. You can still make changes before sending anything.','راجع اختياراتك للحظة. بعد ذلك نجمعها مع تفاصيل فعاليتك لطلب عرض سعر. يمكنك تعديل كل شيء قبل إرسال الطلب.')}</p>
    </div>
    <div className="rsf-card">
      <h3>{tr('Your services so far','خدماتك حتى الآن')}</h3>
      <div className="rsf-groups">
        {djAdded&&<section className="rsf-group"><header><span className="rsf-group-icon"><Disc3 size={18} strokeWidth={1.4} aria-hidden="true"/></span><h4>{tr('DJ Khalil Service','خدمة دي جي خليل')}</h4><small>{tr('Added to your booking','أُضيفت إلى حجزك')}</small></header></section>}
        {groups.map(group=><section key={group.id} className="rsf-group"><header><span className="rsf-group-icon"><group.Icon size={18} strokeWidth={1.4} aria-hidden="true"/></span><h4>{group.title}</h4><small>{group.rows.reduce((n,l)=>n+l.quantity,0)}</small></header>
          <ul className="rsf-lines" aria-label={group.title}>{group.rows.map(line=><li key={line.id}>
          <span className="rsf-art" aria-hidden="true">{displayImageUrl(line.imageUrl)?<img src={displayImageUrl(line.imageUrl)} alt="" loading="lazy" onError={event=>{event.currentTarget.style.display='none';}}/>:<Box size={22} strokeWidth={1.3}/>}</span>
          <span className="rsf-line-name">{tr(line.name,line.nameAr||line.name)}{line.brandModel&&<small>{line.brandModel}</small>}</span>
          <span className="rsf-qty"><button type="button" aria-label={`${tr('Decrease','تقليل')} ${line.name}`} onClick={()=>order?.setEquipment(line,line.quantity<=(line.minQuantity||1)?0:line.quantity-1)}><Minus size={14}/></button><b>{line.quantity}</b><button type="button" aria-label={`${tr('Increase','زيادة')} ${line.name}`} onClick={()=>order?.setEquipment(line,line.quantity+1)}><Plus size={14}/></button></span>
          <button type="button" className="rsf-x" aria-label={`${tr('Remove','إزالة')} ${line.name}`} onClick={()=>order?.setEquipment(line,0)}><X size={15}/></button>
        </li>)}</ul></section>)}
      </div>
      {!!missing.length&&<div className="rsf-hint" role="status"><strong>{tr('Still to add:','ما زال مطلوباً:')}</strong><ul>{missing.map(item=><li key={item}>{item}</li>)}</ul></div>}
      <div className="rsf-actions">
        <button type="button" className="rsf-continue" disabled={empty||!order} onClick={()=>order?.reviewDraft()}>{tr('Continue planning','تابع التخطيط')}<ArrowUpRight size={18} aria-hidden="true"/></button>
        <button type="button" className="rsf-more" onClick={()=>goTo('services')}>{tr('Add more','أضف المزيد')}</button>
      </div>
      <p className="rsf-note">{tr('This step does not send a request or reserve your date.','هذه الخطوة لا ترسل طلباً ولا تحجز موعدك.')}</p>
    </div>
  </section>;
}
