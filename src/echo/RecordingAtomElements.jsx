import {ReferenceField} from './OntologyFields';
import {ElementPresetMultiSelect} from './WorkElementsContext';
export const emptyAtomSound=()=>({key:null,rhythmId:null,keys:[],rhythmIds:[],genreIds:[],influences:[]});
export default function RecordingAtomElements({value,onChange,vocabulary,children}){
 const sound={...emptyAtomSound(),...value,keys:value?.keys??(value?.key?[value.key]:[]),rhythmIds:value?.rhythmIds??(value?.rhythmId?[value.rhythmId]:[])};
 const change=(field,value)=>onChange({...sound,[field]:value,...(field==='keys'?{key:value[0]||null}:{}),...(field==='rhythmIds'?{rhythmId:value[0]||null}:{})});
 return <section className="recording-musical-details" aria-label="Musical details"><header><h3>Musical details</h3><p>Key, rhythm, genres and the musicians who played.</p></header><div className="recording-atom-elements">
  <ElementPresetMultiSelect element="key" label="Recording Musical keys" value={sound.keys} onChange={value=>change('keys',value)}/>
  <ReferenceField multiple label="Recording Rhythms" kind="rhythm" vocabulary={vocabulary} value={sound.rhythmIds} onChange={value=>change('rhythmIds',value)}/>
  <ReferenceField multiple label="Recording Genres" kind="genre" vocabulary={vocabulary} value={sound.genreIds} onChange={value=>change('genreIds',value)}/>
  <ElementPresetMultiSelect element="influences" label="Recording Musical influences" value={sound.influences} onChange={value=>change('influences',value)}/>
 {children}</div></section>;
}
