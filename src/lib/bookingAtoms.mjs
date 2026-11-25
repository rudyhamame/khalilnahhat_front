import atomContract from './contracts/booking-atoms.json' with {type:'json'};
import {fields,getPath,isAnswered,missingOrderFields} from './eventOrderCore.mjs';

const byKey=new Map(fields.map(field=>[field.key,field]));
export const BOOKING_TREE=atomContract;
// Rental categories and their equipment are numbered from the tree: category N is section 03.(first+N-1), its equipment 03.(section).NN.
export const rentalCategoryCode=(index)=>`${atomContract.rentalCategories.step}.${String(atomContract.rentalCategories.firstSection+index).padStart(2,'0')}`;
// Names the viewers (dashboards, apps) show for two atoms; the Booking page keeps the question wording.
export const bookingTreeViewerName=(key,ar=false)=>atomContract.viewerNames?.[key]?.[ar?1:0]||null;
export const BOOKING_TREE_STEPS=Object.freeze(atomContract.steps.map(step=>Object.freeze({...step})));
export const bookingTreeStepForField=key=>atomContract.ownership[key]?.step||atomContract.pathOwners.find(([prefix])=>key?.startsWith(prefix))?.[1]||'additional';
export const bookingTreeSource=key=>{const {branch='client',ref=''}=atomContract.ownership[key]||{};return {branch,ref};};
export const bookingTreeStepMounted=(code,available)=>{const step=BOOKING_TREE_STEPS.find(step=>Number(step.code)===Number(code));return !step?.requiresAny||step.requiresAny.some(id=>Boolean(available[id]));};
export const bookingTreeAtomMounted=(code,available)=>{const section=atomContract.sectionDefinitions.find(section=>section.code===String(code).split('.').slice(0,2).join('.'));return !section?.requiresAny||section.requiresAny.some(id=>Boolean(available[id]));};
export const BOOKING_ATOM_SECTIONS=Object.freeze(atomContract.sections.map(([code,keys])=>Object.freeze({...atomContract.sectionDefinitions.find(section=>section.code===code),code,keys:Object.freeze([...keys])})));
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
