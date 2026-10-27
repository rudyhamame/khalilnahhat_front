export default function EquipmentAvailability({item,ar=false}){
 if(!item)return null;
 const tr=(en,arabic)=>ar?arabic:en;
 const status=item.availabilityStatus||'on_request';
 return <div className={`setup-stage-stock is-${status}`} aria-label={tr('Equipment availability','توفر المعدات')}><strong>{status==='available'?tr('Available','متوفر'):status==='unavailable'?tr('Unavailable','غير متوفر'):tr('Confirm availability','يرجى تأكيد التوفر')}</strong><span>{tr('Available quantity','الكمية المتاحة')}: <b>{item.availableQuantity==null?tr('Not confirmed','غير مؤكدة'):item.availableQuantity}</b></span><small>{tr('Stock availability. Your event date is confirmed with your quote.','توفر المخزون. يتم تأكيد موعد فعاليتك مع عرض السعر.')}</small></div>;
}
