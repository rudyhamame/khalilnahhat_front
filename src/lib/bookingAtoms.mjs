import atomContract from './contracts/booking-atoms.json' with {type:'json'};
import {fields,getPath,isAnswered,missingOrderFields} from './eventOrderCore.mjs';

const byKey=new Map(fields.map(field=>[field.key,field]));
export const BOOKING_ATOM_SECTIONS=Object.freeze(atomContract.sections.map(([code,keys])=>Object.freeze({code,keys:Object.freeze([...keys])})));
const codes=Object.fromEntries(BOOKING_ATOM_SECTIONS.flatMap(section=>section.keys.map((key,index)=>[key,`${section.code}.${String(index+1).padStart(2,'0')}`])));
export const ATOM_KEYS=Object.freeze(Object.keys(codes));
export const fieldCode=key=>codes[key]||'';
export function bookingAtomRange(keys){
 const values=keys.map(fieldCode).filter(Boolean);
 if(!values.length)return '';
 const first=values[0],last=values.at(-1);
 return first===last?first:`${first}–${first.split('.').slice(0,2).join('.')===last.split('.').slice(0,2).join('.')?last.split('.').at(-1):last}`;
}
export const sectionCode=key=>fieldCode(key).split('.').slice(0,2).join('.');
export const bookingSectionAtoms=code=>BOOKING_ATOM_SECTIONS.find(section=>section.code===code)?.keys||[];
export function bookingAtom(key){
 const field=byKey.get(key);
 if(!field)throw new Error(`Unknown booking atom: ${key}`);
 return field;
}
export function bookingAtomApplies(order,key){
 const field=bookingAtom(key);
 if(field.gate&&getPath(order,field.gate)!==true)return false;
 // A stored custom event description remains editable after changing event type.
 if(key==='event.title')return order?.event?.type==='other'||isAnswered(getPath(order,key));
 return true;
}
export const bookingAtomRequired=(order,key)=>bookingAtomApplies(order,key)&&(Boolean(bookingAtom(key).required)||(key==='event.title'&&order?.event?.type==='other'));
export function bookingAtomInputProps(key,order){
 const field=bookingAtom(key),required=bookingAtomRequired(order,key);
 const props={'data-booking-field':key,'data-booking-atom':key,'aria-required':required||undefined,required};
 if(!field.options&&!['multi','links','songs','tags','pairs','attachments','boolean','coordinate','date','time','number'].includes(field.type))props.maxLength=field.maxLength||(field.type==='textarea'?3000:320);
 if(field.type==='number'){props.min=0;props.max=field.max||100000;props.step=1;}
 return props;
}
// Preserve false and zero as answers; the validator owns what is missing.
export function bookingAtomState(order,key){
 return {field:bookingAtom(key),code:fieldCode(key),value:getPath(order,key),applies:bookingAtomApplies(order,key),required:bookingAtomRequired(order,key),missing:missingOrderFields(order).some(field=>field.key===key)};
}
