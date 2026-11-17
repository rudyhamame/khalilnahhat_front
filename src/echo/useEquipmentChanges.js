import {useEffect,useRef} from 'react';
import {useEventOrder} from './eventOrderContext';
import {equipmentChanges} from '../lib/equipmentChange';
// The latest non-empty equipment/service change, kept until the next one so a highlight can still find it after the draft re-renders.
export default function useEquipmentChanges(){
 const order=useEventOrder()?.order,last=useRef(order),changes=useRef({items:new Set(),services:new Set()});
 useEffect(()=>{if(!order)return;const found=equipmentChanges(last.current,order);if(found.items.size||found.services.size)changes.current=found;last.current=order;},[order]);
 return changes;
}
