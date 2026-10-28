export default function EquipmentAvailability({item,ar=false}){
 if(!item)return null;
 const tr=(en,arabic)=>ar?arabic:en;
 const status=['available','unavailable'].includes(item.availabilityStatus)?item.availabilityStatus:'on_request';
 const label=status==='available'?tr('Available','متوفر'):status==='unavailable'?tr('Unavailable','غير متوفر'):tr('On request','حسب الطلب');
 const quantity=Number.isSafeInteger(item.availableQuantity)&&item.availableQuantity>=0?item.availableQuantity:null;
 return <span className={`setup-equipment-stock is-${status}`} aria-label={`${item.name}: ${label}${quantity===null?'':`, ${tr('quantity','الكمية')} ${quantity}`}`}><i aria-hidden="true"/><span>{label}</span>{quantity!==null&&<b>· {quantity}</b>}</span>;
}
