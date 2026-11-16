import {useEffect,useState} from 'react';
import {apiRequest} from '../lib/api';

// The concept map toolbar choices. The admin "Concept map" tab and the map's own toolbar both read this list.
export const MAP_OPTIONS={
 layout:{label:['Branch layout','ترتيب الفروع'],values:[['tree','Tree','شجرة'],['mirror','Mirror tree','شجرة معكوسة'],['around','Around the stem','حول الجذع'],['net','Fish net','شبكة صيد']]},
 shape:{label:['Line shape','شكل الخطوط'],values:[['curved','Curved','منحنٍ'],['elbow','Elbow','زاوية'],['straight','Straight','مستقيم']]},
 format:{label:['Branch format','شكل الفروع'],values:[['groups','By status','حسب الحالة'],['single','One box','مربع واحد'],['atoms','Each field','كل حقل']]},
};
export const MAP_FALLBACK={layout:'tree',shape:'curved',format:'groups'};
let cached=null;
// The admin's default toolbar. A visitor's own choice (kept in their browser) still wins.
export function useConceptMapDefaults(){
 const [value,setValue]=useState(cached||MAP_FALLBACK);
 useEffect(()=>{let alive=true;if(!cached)apiRequest('/concept-map').then(({item})=>{cached={...MAP_FALLBACK,...item};if(alive)setValue(cached);}).catch(()=>{});return()=>{alive=false;};},[]);
 return value;
}
export const setCachedConceptMapDefaults=item=>{cached={...MAP_FALLBACK,...item};};
