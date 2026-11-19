import {ReferenceField} from './OntologyFields';
import {useId,useState} from 'react';
import KeyPicker from './KeyPicker';
import BpmPicker from './BpmPicker';
import Metronome3D from './Metronome3D';
import {Gauge,Music4} from 'lucide-react';
import './soundDetailsCards.css';
// One card per sound property, each in its own wrapper: icon, title, unit, then the control.
const SoundCard=({icon:Icon,title,unit,className,children})=><section className={`sound-card ${className}`} aria-label={title}><header><span className="sound-card-icon" aria-hidden="true"><Icon size={17}/></span><h4>{title}</h4>{unit&&<small>{unit}</small>}</header><div className="sound-card-body">{children}</div></section>;
export const emptyAtomSound=()=>({bpm:null,key:null,rhythmIds:[],genreIds:[]});
export default function RecordingAtomElements({value,onChange,vocabulary,children,audioUrl='',range=null}){
 const previewSlotId=`tempo-preview-${useId()}`;
 const sound={...emptyAtomSound(),...value},[beatStart,setBeatStart]=useState(null);
 const change=(field,value)=>onChange({...sound,[field]:value});
 return <section className="recording-musical-details" aria-label="Sound details"><header><h3>Sound details</h3><p>Tempo, key, rhythm, genres and the musicians who played.</p></header><div className="sound-cards">
  <SoundCard icon={Gauge} title="Tempo" unit="BPM" className="sound-card--tempo"><Metronome3D previewSlotId={previewSlotId} bpm={sound.bpm??null} range={range} audioUrl={audioUrl} beatStart={beatStart} onBeatStart={setBeatStart}/><BpmPicker previewSlotId={previewSlotId} label="" audioUrl={audioUrl} range={range} onFirstBeat={found=>setBeatStart(found?.start??null)} value={sound.bpm??null} onChange={bpm=>change('bpm',bpm)}/></SoundCard>
  <SoundCard icon={Music4} title="Musical key" unit="Camelot" className="sound-card--key"><KeyPicker label="" audioUrl={audioUrl} range={range} value={sound.key?[sound.key]:[]} onChange={list=>change('key',list.at(-1)??null)}/></SoundCard>
  </div><div className="recording-atom-elements">
  <ReferenceField multiple label="Rhythms" kind="rhythm" vocabulary={vocabulary} value={sound.rhythmIds} onChange={value=>change('rhythmIds',value)}/>
  <ReferenceField multiple label="Genres" kind="genre" vocabulary={vocabulary} value={sound.genreIds} onChange={value=>change('genreIds',value)}/>
 {children}</div></section>;
}
