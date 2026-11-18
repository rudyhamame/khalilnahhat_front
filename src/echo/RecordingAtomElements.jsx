import {ReferenceField} from './OntologyFields';
import KeyPicker from './KeyPicker';
import BpmPicker from './BpmPicker';
export const emptyAtomSound=()=>({bpms:[],keys:[],rhythmIds:[],genreIds:[]});
export default function RecordingAtomElements({value,onChange,vocabulary,children,audioUrl='',range=null}){
 const sound={...emptyAtomSound(),...value};
 const change=(field,value)=>onChange({...sound,[field]:value});
 return <section className="recording-musical-details" aria-label="Musical details"><header><h3>Musical details</h3><p>Key, rhythm, genres and the musicians who played.</p></header><div className="recording-atom-elements">
  <BpmPicker audioUrl={audioUrl} range={range} value={sound.bpms} onChange={value=>change('bpms',value)}/>
  <KeyPicker label="Recording Musical keys" audioUrl={audioUrl} range={range} value={sound.keys} onChange={value=>change('keys',value)}/>
  <ReferenceField multiple label="Recording Rhythms" kind="rhythm" vocabulary={vocabulary} value={sound.rhythmIds} onChange={value=>change('rhythmIds',value)}/>
  <ReferenceField multiple label="Recording Genres" kind="genre" vocabulary={vocabulary} value={sound.genreIds} onChange={value=>change('genreIds',value)}/>
 {children}</div></section>;
}
