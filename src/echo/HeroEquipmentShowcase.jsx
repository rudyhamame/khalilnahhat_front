import {useEffect,useMemo,useRef,useState} from 'react';
import englishNarration from './data/heroIntroduction.en.json';
import arabicNarration from './data/heroIntroduction.ar.json';
import {EQUIPMENT_MODELS} from './equipmentModels';
import {loadModelViewer} from '../lib/modelViewer';
import {equipmentCues,equipmentCueAt,HERO_EQUIPMENT_TIMELINE} from './heroEquipmentCues';
import './heroEquipmentShowcase.css';

function EquipmentScene({cue,active,playing,ar,reducedMotion}){
 const model=EQUIPMENT_MODELS[cue.id],viewer=useRef(null);
 const [ready,setReady]=useState(false),[loaded,setLoaded]=useState(false),[failed,setFailed]=useState(false);
 useEffect(()=>{let alive=true;loadModelViewer().then(()=>{if(alive)setReady(true);}).catch(()=>{if(alive)setFailed(true);});return()=>{alive=false;};},[]);
 useEffect(()=>{
  const node=viewer.current;if(!node)return;
  const load=()=>setLoaded(true),error=()=>setFailed(true);
  node.addEventListener('load',load);node.addEventListener('error',error);if(node.loaded)load();
  return()=>{node.removeEventListener('load',load);node.removeEventListener('error',error);};
 },[ready]);
 useEffect(()=>{
  const node=viewer.current;if(!active||!loaded||!node)return;
  // A preloaded, transparent scene needs fresh framing when it becomes visible.
  const frame=requestAnimationFrame(()=>{node.updateFraming().then(()=>node.jumpCameraToGoal()).catch(()=>{});});
  return()=>cancelAnimationFrame(frame);
 },[active,loaded]);
 return <div className={`hero-equipment-scene${active?' is-active':''}`} aria-hidden={!active} style={{'--equipment-accent':cue.accent}}>
  <div className="hero-equipment-object" data-loaded={loaded&&!failed}>
   {model.profile&&<img className="hero-equipment-poster" src={model.profile} alt="" decoding="async"/>}
   {ready&&!failed&&<model-viewer ref={viewer} src={model.src} alt={cue.label[ar?1:0]} auto-rotate={active&&playing&&!reducedMotion?'':undefined} auto-rotate-delay="0" rotation-per-second="12deg" interaction-prompt="none" shadow-intensity="0.7" exposure="2.8" environment-image="neutral" camera-orbit={model.cameraOrbit||'-28deg 72deg 95%'} loading="eager" reveal="auto"/>}
  </div>
  <div className="hero-equipment-caption"><span>{cue.category[ar?1:0]}</span><h2>{cue.label[ar?1:0]}</h2><div className="hero-equipment-rule"/></div>
 </div>;
}
export default function HeroEquipmentShowcase(){
 const [transport,setTransport]=useState(null);
 useEffect(()=>{const update=event=>setTransport(event.detail);window.addEventListener(HERO_EQUIPMENT_TIMELINE,update);return()=>window.removeEventListener(HERO_EQUIPMENT_TIMELINE,update);},[]);
 const language=transport?.language==='ar'?'ar':'en',ar=language==='ar';
 const cues=useMemo(()=>equipmentCues(ar?arabicNarration:englishNarration,language),[ar,language]);
 const position=transport?.position||0,started=transport?.started;
 const cue=started?equipmentCueAt(cues,position):null;
 const [reducedMotion,setReducedMotion]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce)'),change=()=>setReducedMotion(query.matches);query.addEventListener('change',change);return()=>query.removeEventListener('change',change);},[]);
 // Warm the next models before their spoken cues; release earlier scenes after their exit transition.
 const visible=started?cues.filter(item=>position>=item.start-12&&position<item.end+0.65):[];
 return <aside className={`hero-equipment-showcase${cue?' is-visible':''}`} aria-label={ar?'تجهيزات مذكورة في المقدّمة':'Equipment featured in the introduction'} aria-hidden={!cue} dir={ar?'rtl':'ltr'}>
  <div className="hero-equipment-halo"/>
  {visible.map(item=><EquipmentScene key={`${language}:${item.id}`} cue={item} active={cue?.id===item.id} playing={transport?.playing} ar={ar} reducedMotion={reducedMotion}/>)}
 </aside>;
}
