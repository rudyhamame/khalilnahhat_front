import {ReferenceField} from './OntologyFields';
import {hasLanguageDependency} from './workElementsCatalog';
export default function WorkElementDependencies({value,onChange,vocabulary}){
 const change=patch=>onChange({...value,...patch});
 return <>
  {value.kind==='musician'&&<ReferenceField allowCreate={false} multiple label="Instruments" kind="instrument" value={value.instrumentIds??(value.instrumentId?[value.instrumentId]:[])} vocabulary={vocabulary} onChange={instrumentIds=>change({instrumentIds,instrumentId:instrumentIds[0]||null})}/>}
  {hasLanguageDependency({id:value.kind,kind:value.kind})&&<ReferenceField allowCreate={false} multiple label="Languages" kind="language" value={value.languageIds||[]} vocabulary={vocabulary} onChange={languageIds=>change({languageIds,...(value.kind==='dialect'?{parentId:languageIds[0]||''}:{})})}/>}
 </>;
}
