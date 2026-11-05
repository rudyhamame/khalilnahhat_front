import {Trash2,Minus,Plus} from 'lucide-react';
import {equipmentLimit,equipmentQuantity} from './simulationLayout';
export default function EquipmentQuantityPicker({item,quantity=0,onChange,ar=false,quantityLabel,badge}){
 const limit=equipmentLimit(item),tr=(en,arabic)=>ar?arabic:en;
 return <div className="setup-quantity-picker" aria-label={`${tr('Requested quantity for','الكمية المطلوبة لـ')} ${item.name}`}><span>{quantityLabel||tr('Qty','الكمية')}{badge}</span><button type="button" aria-label={`${tr('Decrease','تقليل')} ${item.name}`} disabled={!quantity} onClick={()=>onChange(item,quantity<=(item.minQuantity||1)?0:quantity-1)}><Minus size={13}/></button><input type="number" inputMode="numeric" min="0" max={limit} step="1" aria-label={`${tr('Quantity for','الكمية لـ')} ${item.name}`} value={quantity} disabled={!limit} onChange={event=>onChange(item,equipmentQuantity(item,event.target.value))}/><button type="button" aria-label={`${tr('Increase','زيادة')} ${item.name}`} disabled={quantity>=limit} onClick={()=>onChange(item,equipmentQuantity(item,quantity+1))}><Plus size={13}/></button></div>;
}

export function RemoveFromBookingButton({item,quantity=0,onChange,ar=false}){
 if(quantity<=0)return null;
 const label=ar?'إزالة من الحجز':'Remove from booking';
 return <button type="button" className="setup-add-booking is-added" aria-label={`${label}: ${item.name}`} title={label} onClick={()=>onChange(item,0)}><Trash2 size={16} aria-hidden="true"/></button>;
}
