import {ReferenceField} from './OntologyFields';
import {ElementPresetMultiSelect} from './WorkElementsContext';
import KeyPicker from './KeyPicker';
import BpmPicker from './BpmPicker';
export const emptyAtomSound=()=>({bpm:null,bpms:[],key:null,rhythmId:null,keys:[],rhythmIds:[],genreIds:[],influences:[]});
export default function RecordingAtomElements({value,onChange,vocabulary,children,audioUrl='',range=null}){
 const sound={...emptyAtomSound(),...value,bpms:value?.bpms??(value?.bpm?[value.bpm]:[]),keys:value?.keys??(value?.key?[value.key]:[]),rhythmIds:value?.rhythmIds??(value?.rhythmId?[value.rhythmId]:[])};
 const change=(field,value)=>onChange({...sound,[field]:value,...(field==='keys'?{key:value[0]||null}:{}),...(field==='bpms'?{bpm:value[0]??null}:{}),...(field==='rhythmIds'?{rhythmId:value[0]||null}:{})});
 return <section className="recording-musical-details" aria-label="Musical details"><header><h3>Musical details</h3><p>Key, rhythm, genres and the musicians who played.</p></header><div className="recording-atom-elements">
  <BpmPicker audioUrl={audioUrl} range={range} value={sound.bpms} onChange={value=>change('bpms',value)}/>
  <KeyPicker label="Recording Musical keys" audioUrl={audioUrl} range={range} value={sound.keys} onChange={value=>change('keys',value)}/>
  <ReferenceField multiple label="Recording Rhythms" kind="rhythm" vocabulary={vocabulary} value={sound.rhythmIds} onChange={value=>change('rhythmIds',value)}/>
  <ReferenceField multiple label="Recording Genres" kind="genre" vocabulary={vocabulary} value={sound.genreIds} onChange={value=>change('genreIds',value)}/>
  <ElementPresetMultiSelect element="influences" label="Recording Musical influences" value={sound.influences} onChange={value=>change('influences',value)}/>
 {children}</div></section>;
}
