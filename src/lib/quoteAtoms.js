import {fieldCode} from './eventPageModel.js';
import {rentalServices,rentalServiceEquipment} from './numberedRentalCatalog.js';
import {MC_ID} from './treeCore.js';

// Quote lines are priced data atoms, not "services": DJ and MC are atoms 03.01.01 / 03.01.02, every equipment item is 04.<category>.<item>
// (the same numbers as the Booking page and review). Anything else (an old category line such as `svc-sound`) has no atom and no code.
export function quoteAtomCode(line,catalog=[],equipment=[]){
 const id=line?.serviceId||'';
 if(id==='svc-dj')return fieldCode('music.djRequested');
 if(id==='svc-mc')return fieldCode('music.mcRequested');
 if(id.startsWith('svc-'))return '';
 const categories=rentalServices(catalog).filter(service=>service.id!==MC_ID&&!service.selectionField);
 for(const [index,category] of categories.entries()){
  const position=rentalServiceEquipment(category,equipment).findIndex(item=>item.id===id);
  if(position>=0)return `04.${String(index+2).padStart(2,'0')}.${String(position+1).padStart(2,'0')}`;
 }
 return '';
}
// Lines in contract order: DJ, MC, then equipment by code; lines without an atom last.
export const sortQuoteLines=(lines,catalog,equipment)=>lines.map((line,index)=>({line,index,code:quoteAtomCode(line,catalog,equipment)})).sort((a,b)=>(a.code?0:1)-(b.code?0:1)||a.code.localeCompare(b.code)||a.index-b.index);

// A service line shows its name, never its id: the catalogue name ("DJ Khalil Nahhat"), else a readable fallback ("svc-dj" -> "DJ service").
export const quoteLineName=(line,catalog=[])=>{
 const id=line?.serviceId||'';
 if(!id.startsWith('svc-'))return line?.name||'';
 const key=id.slice(4),row=catalog.find(item=>item?.kind==='service'&&item.id===key);
 return row?.name||({dj:'DJ service',mc:'MC hosting'})[key]||(line?.name&&line.name!==key?line.name:key.replaceAll('-',' ').replace(/^./,char=>char.toUpperCase()));
};
