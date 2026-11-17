import {useEffect,useRef} from 'react';
import {useEventOrder} from './eventOrderContext';
import {equipmentChanges,changedPaths} from '../lib/equipmentChange';
// The latest non-empty draft change (changed atoms, and which equipment items or services), kept until the next one so a highlight can still find it after the draft re-renders.
export default function useEquipmentChanges(){
 const order=useEventOrder()?.order,last=useRef(order),changes=useRef({items:new Set(),services:new Set(),paths:[]});
 useEffect(()=>{if(!order)return;const found={...equipmentChanges(last.current,order),paths:changedPaths(last.current,order)};if(found.items.size||found.services.size||found.paths.length)changes.current={items:found.items.size||found.services.size?found.items:new Set(),services:found.items.size||found.services.size?found.services:new Set(),paths:found.paths};last.current=order;},[order]);
 return changes;
}
