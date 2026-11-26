import {BOOKING_TREE_STEPS,BOOKING_ATOM_SECTIONS,ATOM_KEYS,bookingAtom,bookingAtomInputProps,fieldCode} from '../../lib/bookingAtoms.mjs';
import {fields,fieldName,optionName,isAiEditableField} from '../../lib/eventOrderCore.mjs';

export const bookingAtomTreeRoute='/admin/echo?tab=data-atom-tree';
export function atomTreeEntry(field){
 const input=field.key==='equipment'?{}:bookingAtomInputProps(field.key);
 return {...field,code:fieldCode(field.key),name:fieldName(field.key),aiEditable:isAiEditableField(field.key),input,choices:field.options?.map(value=>({value,label:optionName(field.key,value)}))||[]};
}
export const bookingAtomTree=BOOKING_TREE_STEPS.map(({id,code,title})=>{
 return {id,code,title,sections:BOOKING_ATOM_SECTIONS.filter(section=>section.code.startsWith(code+'.')).map(section=>({code:section.code,title:section.title,atoms:section.keys.map(key=>atomTreeEntry(bookingAtom(key)))}))};
});
// Search keeps the parent branches of every matching atom visible.
export function filterAtomTree(query){
 const needle=query.trim().toLowerCase();
 const matches=(atom,parents='')=>!needle||[parents,atom.code,atom.key,atom.name,atom.shortAr,atom.label,atom.type,atom.gate,...atom.choices.flatMap(choice=>[choice.label,choice.value])].join(' ').toLowerCase().includes(needle);
 return {steps:bookingAtomTree.map(step=>({...step,sections:step.sections.map(section=>({...section,atoms:section.atoms.filter(atom=>matches(atom,`${step.code} ${step.title} ${section.code} ${section.title}`))})).filter(section=>section.atoms.length)})).filter(step=>step.sections.length)};
}
