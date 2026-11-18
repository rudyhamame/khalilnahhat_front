import {ReferenceField} from './OntologyFields';
import KeyPicker from './KeyPicker';
import BpmPicker from './BpmPicker';
export const emptyAtomSound=()=>({bpm:null,key:null,rhythmIds:[],genreIds:[]});
export default function RecordingAtomElements({value,onChange,vocabulary,children,audioUrl='',range=null}){
 const sound={...emptyAtomSound(),...value};
 const change=(field,value)=>onChange({...sound,[field]:value});
 return <section className="recording-musical-details" aria-label="Sound details"><header><h3>Sound details</h3><p>Tempo, key, rhythm, genres and the musicians who played.</p></header><div className="recording-atom-elements">
  <BpmPicker label="Tempo (BPM)" audioUrl={audioUrl} range={range} value={sound.bpm==null?[]:[sound.bpm]} onChange={list=>change('bpm',list.find(item=>item!==sound.bpm)??null)}/>
  <KeyPicker label="Musical key" audioUrl={audioUrl} range={range} value={sound.key?[sound.key]:[]} onChange={list=>change('key',list.find(item=>item!==sound.key)??null)}/>
  <ReferenceField multiple label="Rhythms" kind="rhythm" vocabulary={vocabulary} value={sound.rhythmIds} onChange={value=>change('rhythmIds',value)}/>
  <ReferenceField multiple label="Genres" kind="genre" vocabulary={vocabulary} value={sound.genreIds} onChange={value=>change('genreIds',value)}/>
 {children}</div></section>;
}
