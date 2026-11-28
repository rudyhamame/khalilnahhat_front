import {BOOKING_TREE_STEPS,BOOKING_ATOM_SECTIONS,bookingAtom,bookingAtomInputProps,fieldCode} from '../../lib/bookingAtoms.mjs';
import {rentalCategoryCode} from '../../lib/bookingAtoms.mjs';
import {numberedRentalCatalog} from '../../lib/numberedRentalCatalog.js';
import {fieldName,optionName,isAiEditableField} from '../../lib/eventOrderCore.mjs';

export const bookingAtomTreeRoute='/admin/echo?tab=data-atom-tree';
export function atomTreeEntry(field){
 const input=field.key==='equipment'?{}:bookingAtomInputProps(field.key);
 return {...field,code:fieldCode(field.key),name:fieldName(field.key),aiEditable:isAiEditableField(field.key),input,choices:field.options?.map(value=>({value,label:optionName(field.key,value)}))||[]};
}
export const bookingAtomTree=BOOKING_TREE_STEPS.map(({id,code,title})=>{
 return {id,code,title,sections:BOOKING_ATOM_SECTIONS.filter(section=>section.code.startsWith(code+'.')).map(section=>({code:section.code,title:section.title,atoms:section.keys.map(key=>atomTreeEntry(bookingAtom(key)))}))};
});
// Search keeps the parent branches of every matching atom visible.
// Every catalogue category (MC is a real service) and every equipment item of it is an atom of Step 3, numbered like the Booking page: 03.04.01...
export function withRentalAtoms({catalog=[],equipment=[]}={}){
 const categories=numberedRentalCatalog(catalog,equipment).filter(service=>service.selectionField!=='music.mcRequested');
 const sections=categories.map((service,index)=>({code:rentalCategoryCode(index),title:service.name,atoms:service.equipment.map((item,position)=>({key:`equipment:${service.id}:${item.id}`,code:`${rentalCategoryCode(index)}.${String(position+1).padStart(2,'0')}`,name:item.name,type:'number',required:false,aiEditable:false,input:{min:0,max:item.availableQuantity},choices:[]}))}));
 return bookingAtomTree.map(step=>step.code==='03'?{...step,sections:[...step.sections,...sections].sort((a,b)=>a.code.localeCompare(b.code))}:step);
}
export function filterAtomTree(query,tree=bookingAtomTree){
 const needle=query.trim().toLowerCase();
 const matches=(atom,parents='')=>!needle||[parents,atom.code,atom.key,atom.name,atom.shortAr,atom.label,atom.type,atom.gate,...atom.choices.flatMap(choice=>[choice.label,choice.value])].join(' ').toLowerCase().includes(needle);
 return {steps:tree.map(step=>({...step,sections:step.sections.map(section=>({...section,atoms:section.atoms.filter(atom=>matches(atom,`${step.code} ${step.title} ${section.code} ${section.title}`))})).filter(section=>section.atoms.length)})).filter(step=>step.sections.length)};
}
