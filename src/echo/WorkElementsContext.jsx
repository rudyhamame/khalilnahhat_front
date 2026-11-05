import {createContext,useContext} from 'react';
import {apiRequest} from '../lib/api';
import {workElementsEndpoint} from './workElementsCatalog';
import {useWorkElementsCatalog} from './useWorkElementsCatalog';
import MultipleReferences from './MultipleReferences';
import './workElementsFields.css';
const Context=createContext([]);
const CreatePresetContext=createContext(null);
export const workElementListId=key=>`work-element-options-${key}`;
export function WorkElementsProvider({token,children}){
 const {elements,update}=useWorkElementsCatalog(token);
 const createPreset=async(element,value)=>{const data=await apiRequest(`${workElementsEndpoint}/${encodeURIComponent(element)}/options`,{token,method:'POST',body:{value}});update(data.items);return data.items.find(row=>row.id===element)?.options.find(option=>option.value===value)?.value||value;};
 return <Context.Provider value={elements}><CreatePresetContext.Provider value={createPreset}>{children}{elements.filter(element=>!['recording','work'].includes(element.source)).map(element=><datalist id={workElementListId(element.id)} key={element.id}>{element.options.map(option=><option key={option.id} value={option.value}/>)}</datalist>)}</CreatePresetContext.Provider></Context.Provider>;
}
export const useWorkElements=()=>useContext(Context);
export function ElementPresetInput({element,...props}){return <input {...props} list={workElementListId(element)}/>;}
export function ElementPresetSelect({element,value,onChange,...props}){
 const elements=useWorkElements(),options=elements.find(row=>row.id===element)?.options||[];
 return <select {...props} value={value||''} onChange={onChange}><option value="">Not specified</option>{[...new Set([value,...options.map(option=>option.value)].filter(Boolean))].map(option=><option key={option} value={option}>{option}</option>)}</select>;
}

export function PresetOptionsSelect({element,onChoose}){const options=useWorkElements().find(row=>row.id===element)?.options||[];return options.length?<select aria-label={`Use saved ${element} option`} value="" onChange={event=>{if(event.target.value)onChoose(event.target.value);}}><option value="">Use a saved option…</option>{options.map(option=><option key={option.id} value={option.value}>{option.value}</option>)}</select>:null;}
export function ElementPresetMultiSelect({element,label='Musical influences',value=[],onChange}){
 const createPreset=useContext(CreatePresetContext);
 const options=useWorkElements().find(row=>row.id===element)?.options||[];
 const rows=[...new Set([...value,...options.map(option=>option.value)])].map(name=>({id:name,name}));
 return <MultipleReferences label={label} rows={rows} value={value} onChange={onChange} onCreate={createPreset?async name=>{const saved=await createPreset(element,name);onChange([...new Set([...value,saved])]);}:undefined}/>;
}
