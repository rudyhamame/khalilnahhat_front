import {Minus,Plus} from 'lucide-react';
import {equipmentLimit,equipmentQuantity} from './simulationLayout';
export default function EquipmentQuantityPicker({item,quantity=0,onChange,ar=false}){
 const limit=equipmentLimit(item),tr=(en,arabic)=>ar?arabic:en;
 return <div className="setup-quantity-picker" aria-label={`${tr('Requested quantity for','الكمية المطلوبة لـ')} ${item.name}`}><span>{tr('Qty','الكمية')}</span><button type="button" aria-label={`${tr('Decrease','تقليل')} ${item.name}`} disabled={!quantity} onClick={()=>onChange(item,quantity<=(item.minQuantity||1)?0:quantity-1)}><Minus size={13}/></button><input type="number" inputMode="numeric" min="0" max={limit} step="1" aria-label={`${tr('Quantity for','الكمية لـ')} ${item.name}`} value={quantity} disabled={!limit} onChange={event=>onChange(item,equipmentQuantity(item,event.target.value))}/><button type="button" aria-label={`${tr('Increase','زيادة')} ${item.name}`} disabled={quantity>=limit} onClick={()=>onChange(item,equipmentQuantity(item,quantity+1))}><Plus size={13}/></button></div>;
}
