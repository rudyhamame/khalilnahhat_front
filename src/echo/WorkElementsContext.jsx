import {createContext,useContext} from 'react';
import {useWorkElementsCatalog} from './useWorkElementsCatalog';
import './workElementsFields.css';
const Context=createContext([]);
export function WorkElementsProvider({token,children}){
 const {elements}=useWorkElementsCatalog(token);
 return <Context.Provider value={elements}>{children}</Context.Provider>;
}
export const useWorkElements=()=>useContext(Context);
export function ElementPresetInput({element,...props}){return <input {...props}/>;}
export function ElementPresetSelect({element,value,onChange,...props}){
 const elements=useWorkElements(),options=elements.find(row=>row.id===element)?.options||[];
 return <select {...props} value={value||''} onChange={onChange}><option value="">Not specified</option>{[...new Set([value,...options.map(option=>option.value)].filter(Boolean))].map(option=><option key={option} value={option}>{option}</option>)}</select>;
}

export function PresetOptionsSelect({element,onChoose}){const options=useWorkElements().find(row=>row.id===element)?.options||[];return options.length?<select aria-label={`Use saved ${element} option`} value="" onChange={event=>{if(event.target.value)onChoose(event.target.value);}}><option value="">Use a saved option…</option>{options.map(option=><option key={option.id} value={option.value}>{option.value}</option>)}</select>:null;}
