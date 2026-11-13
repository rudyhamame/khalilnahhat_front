// draft = quantity of this item already in the client's booking draft; it is taken off what is left to choose.
export default function EquipmentAvailability({item,ar=false,draft=0}){
 if(!item)return null;
 const tr=(en,arabic)=>ar?arabic:en;
 const base=Number.isSafeInteger(item.availableQuantity)&&item.availableQuantity>=0?item.availableQuantity:null;
 const quantity=base===null?null:Math.max(0,base-(Number.isSafeInteger(draft)&&draft>0?draft:0));
 const baseStatus=['available','unavailable'].includes(item.availabilityStatus)?item.availabilityStatus:'on_request';
 const used=baseStatus==='available'&&quantity===0&&draft>0;
 const status=used?'unavailable':baseStatus;
 const label=used?tr('All selected','تم اختيارها كلها'):status==='available'?tr('Available','متوفر'):status==='unavailable'?tr('Unavailable','غير متوفر'):tr('On request','حسب الطلب');
 return <span className={`setup-equipment-stock is-${status}`} aria-label={`${item.name}: ${label}${quantity===null||used?'':`, ${tr('quantity','الكمية')} ${quantity}`}`}><i aria-hidden="true"/><span>{label}</span>{quantity!==null&&!used&&<b title={tr('Quantity','الكمية')}>{quantity}</b>}</span>;
}
