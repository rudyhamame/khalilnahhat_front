import {ReferenceField} from './OntologyFields';
import {useEffect,useId,useRef,useState} from 'react';
import KeyPicker from './KeyPicker';
import BpmPicker from './BpmPicker';
import AtomBeatMeasure from './AtomBeatMeasure';
import {analyzeAtomRhythm} from '../lib/analyzeAtomRhythm';
import Metronome3D from './Metronome3D';
import {Gauge,Music4} from 'lucide-react';
import './soundDetailsCards.css';
// One card per sound property, each in its own wrapper: icon, title, unit, then the control.
const SoundCard=({icon:Icon,title,unit,className,children})=><section className={`sound-card ${className}`} aria-label={title}><header><span className="sound-card-icon" aria-hidden="true"><Icon size={17}/></span><h4>{title}</h4>{unit&&<small>{unit}</small>}</header><div className="sound-card-body">{children}</div></section>;
export const emptyAtomSound=()=>({bpm:null,key:null,rhythmIds:[],genreIds:[]});
export default function RecordingAtomElements({value,onChange,vocabulary,children,audioUrl='',range=null,stems=null,duration=0}){
 const previewSlotId=`tempo-preview-${useId()}`;
 const sound={...emptyAtomSound(),...value},[beatStart,setBeatStart]=useState(value?.rhythmTiming?.beatStartSec??null);
 const [analyzing,setAnalyzing]=useState(false),[analysis,setAnalysis]=useState(null),[analysisError,setAnalysisError]=useState('');
 const live=useRef(null),job=useRef(null),mounted=useRef(true);live.current={sound,onChange};
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;job.current?.abort();};},[]);
 useEffect(()=>()=>job.current?.abort(),[audioUrl,range?.startSec,range?.endSec]);
 const applyAnalysis=result=>{const latest=live.current;latest.onChange({...latest.sound,bpm:result.bpm,rhythmTiming:{timeSignature:latest.sound.rhythmTiming?.timeSignature||result.suggestedMeter||'4/4',beatStartSec:result.barStartSec,source:result.source}});setBeatStart(result.barStartSec);};
 const analyze=async()=>{if(analyzing)return;const controller=new AbortController(),submittedBpm=live.current.sound.bpm,submittedTiming=JSON.stringify(live.current.sound.rhythmTiming);job.current=controller;setAnalyzing(true);setAnalysisError('');try{const result=await analyzeAtomRhythm({audioUrl,stems,range,signal:controller.signal});if(controller.signal.aborted)return;const latest=live.current,applied=latest.sound.bpm===submittedBpm&&JSON.stringify(latest.sound.rhythmTiming)===submittedTiming;if(applied)applyAnalysis(result);setAnalysis({...result,applied});return {...result,applied};}catch(error){if(error.name!=='AbortError'&&mounted.current)setAnalysisError(error.message);}finally{if(mounted.current)setAnalyzing(false);}};
 const change=(field,value)=>onChange({...sound,[field]:value});
 const syncBeat=seconds=>{setBeatStart(seconds);const latest=live.current;latest.onChange({...latest.sound,rhythmTiming:{timeSignature:latest.sound.rhythmTiming?.timeSignature||'4/4',beatStartSec:seconds,source:latest.sound.rhythmTiming?.source||'manual'}});};
 return <section className="recording-musical-details" aria-label="Sound details"><header><h3>Sound details</h3><p>Tempo, key, rhythm, genres and the musicians who played.</p></header><div className="sound-cards">
  <SoundCard icon={Music4} title="Musical key" unit="Camelot" className="sound-card--key"><KeyPicker label="" audioUrl={audioUrl} range={range} value={sound.key?[sound.key]:[]} onChange={list=>change('key',list.at(-1)??null)}/></SoundCard>
  <SoundCard icon={Gauge} title="Beat & measure" unit="Quarter-note BPM" className="sound-card--beat-grid"><AtomBeatMeasure bpm={sound.bpm} timing={sound.rhythmTiming} range={range||(duration?{startSec:0,endSec:duration}:null)} onChange={rhythmTiming=>{setBeatStart(rhythmTiming.beatStartSec);change('rhythmTiming',rhythmTiming);}} onAnalyze={analyze} onApplyAnalysis={()=>analysis&&applyAnalysis(analysis)} analyzing={analyzing} result={analysis} error={analysisError}/></SoundCard>
  </div><div className="recording-atom-elements">
  <ReferenceField multiple label="Rhythms" kind="rhythm" vocabulary={vocabulary} value={sound.rhythmIds} onChange={value=>change('rhythmIds',value)}/>
  <ReferenceField multiple label="Genres" kind="genre" vocabulary={vocabulary} value={sound.genreIds} onChange={value=>change('genreIds',value)}/>
 {children}</div></section>;
}
