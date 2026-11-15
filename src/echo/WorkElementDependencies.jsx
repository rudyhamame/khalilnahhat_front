import {ReferenceField} from './OntologyFields';
import {hasLanguageDependency} from './workElementsCatalog';
import {dialectsForLanguages} from '../lib/vocalistDependencies.mjs';
export default function WorkElementDependencies({value,onChange,vocabulary}){
 const change=patch=>onChange({...value,...patch});
 const dialects=dialectsForLanguages(vocabulary.filter(row=>row.kind==='dialect'),value.languageIds||[]);
 const changeLanguages=languageIds=>{
  const allowed=new Set(dialectsForLanguages(vocabulary.filter(row=>row.kind==='dialect'),languageIds).map(row=>row.id));
  change({languageIds,...(value.kind==='dialect'?{parentId:languageIds[0]||''}:{}),...(value.kind==='artist'?{dialectIds:(value.dialectIds||[]).filter(id=>allowed.has(id))}:{})});
 };
 return <>
  {value.kind==='musician'&&<ReferenceField allowCreate={false} multiple label="Instruments" kind="instrument" value={value.instrumentIds??(value.instrumentId?[value.instrumentId]:[])} vocabulary={vocabulary} onChange={instrumentIds=>change({instrumentIds,instrumentId:instrumentIds[0]||null})}/>}
  {hasLanguageDependency({id:value.kind,kind:value.kind})&&<ReferenceField allowCreate={false} multiple label="Languages" kind="language" value={value.languageIds||[]} vocabulary={vocabulary} onChange={changeLanguages}/>}
  {value.kind==='artist'&&<ReferenceField allowCreate={false} multiple label="Dialects" kind="dialect" value={value.dialectIds||[]} vocabulary={dialects} onChange={dialectIds=>change({dialectIds})}/>}
 </>;
}
