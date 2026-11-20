import {useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import englishNarration from './data/heroIntroduction.en.json';
import arabicNarration from './data/heroIntroduction.ar.json';
import {EQUIPMENT_MODELS} from './equipmentModels';
import {loadModelViewer} from '../lib/modelViewer';
import HeroRoomPreview from './HeroRoomPreview';
import {Clapperboard,Disc3,Layers3,Mic2,Music2,Shuffle} from 'lucide-react';
import {equipmentCues,equipmentCueAt,musicBoxStarts,HERO_EQUIPMENT_TIMELINE} from './heroEquipmentCues';
import './heroEquipmentShowcase.css';

// Models rotate inside a fixed box: pull the camera back 30% so no corner is cut off as they turn.
const roomy=orbit=>orbit.replace(/(\d+(?:\.\d+)?)%$/,(_,radius)=>`${Math.round(Number(radius)*1.3)}%`);
const BOXES={MIX:[Disc3,'Mix','ميكس'],REMIX:[Shuffle,'Remix','ريمكس'],MASHUP:[Layers3,'Mashup','ماش أب'],MEDLEY:[Music2,'Medley','ميدلي'],COVER:[Mic2,'Cover','كوفر'],LIVE:[Clapperboard,'Reels','ريلز']};
// The music boxes of the Music page, each popping in as the greeting says its name (Live is the Reels box).
function MusicScene({active,ar,starts,position}){
 return <div className={`hero-equipment-scene hero-music-scene${active?' is-active':''}`} aria-hidden={!active}>
  <div className="hero-music-grid">{Object.entries(BOXES).map(([id,[Icon,en,arabic]],index)=>{const at=starts[id],shown=at!==undefined&&position>=at-.05,now=shown&&position<at+1.1;return <div key={id} className={`hero-music-box${shown?' is-shown':''}${now?' is-now':''}`} data-tone={index}><Icon size={30} strokeWidth={1.5}/><b>{ar?arabic:en}</b></div>;})}</div>
  <div className="hero-equipment-caption"><span>{ar?'الموسيقى':'MUSIC'}</span><h2>{ar?'أعمال دي جي خليل':'DJ Khalil’s work'}</h2><div className="hero-equipment-rule"/></div>
 </div>;
}
// The 6 music boxes are not mounted on portrait screens.
function usePortrait(){
 const [portrait,setPortrait]=useState(()=>matchMedia('(orientation:portrait)').matches);
 useEffect(()=>{const query=matchMedia('(orientation:portrait)'),change=()=>setPortrait(query.matches);query.addEventListener('change',change);return()=>query.removeEventListener('change',change);},[]);
 return portrait;
}
function EquipmentScene({cue,active,playing,ar,reducedMotion,starts,position}){
 const portrait=usePortrait();
 if(cue.id==='music-boxes')return portrait?null: <MusicScene active={active} ar={ar} starts={starts} position={position}/>;
 if(cue.id==='room-3d')return <RoomScene cue={cue} active={active} ar={ar} reducedMotion={reducedMotion}/>;
 return <ModelScene cue={cue} active={active} playing={playing} ar={ar} reducedMotion={reducedMotion}/>;
}
// The 3D Room cue shows the real room scene instead of a product model.
function RoomScene({cue,active,ar,reducedMotion}){
 return <div className={`hero-equipment-scene${active?' is-active':''}`} aria-hidden={!active} style={{'--equipment-accent':cue.accent}}>
  <div className="hero-equipment-object" data-loaded="true"><HeroRoomPreview active={active} reducedMotion={reducedMotion}/></div>
  <div className="hero-equipment-caption"><span>{cue.category[ar?1:0]}</span><h2>{cue.label[ar?1:0]}</h2><div className="hero-equipment-rule"/></div>
 </div>;
}
function ModelScene({cue,active,playing,ar,reducedMotion}){
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
   {/* The equipment shows as its 3D model only: no reference-photo artwork while it loads. */}
   {ready&&!failed&&<model-viewer ref={viewer} src={model.src} alt={cue.label[ar?1:0]} auto-rotate={active&&playing&&!reducedMotion?'':undefined} auto-rotate-delay="0" rotation-per-second="12deg" interaction-prompt="none" shadow-intensity="0.7" exposure="2.8" environment-image="neutral" camera-orbit={roomy(model.cameraOrbit||'-28deg 72deg 95%')} loading="eager" reveal="auto"/>}
  </div>
  <div className="hero-equipment-caption"><span>{cue.category[ar?1:0]}</span><h2>{cue.label[ar?1:0]}</h2><div className="hero-equipment-rule"/></div>
 </div>;
}
// Phones skip the 3D showcase entirely (nothing is drawn and no model is downloaded while the greeting plays).
const PHONE='(max-width:600px), (max-height:600px) and (orientation:landscape) and (any-pointer:coarse)';
export default function HeroEquipmentShowcase(){
 const [phone,setPhone]=useState(()=>typeof matchMedia==='function'&&matchMedia(PHONE).matches);
 useEffect(()=>{const query=matchMedia(PHONE),change=()=>setPhone(query.matches);query.addEventListener('change',change);return()=>query.removeEventListener('change',change);},[]);
 return phone?null:<HeroEquipmentShowcaseScene/>;
}
function HeroEquipmentShowcaseScene(){
 const [transport,setTransport]=useState(null);
 useEffect(()=>{const update=event=>setTransport(event.detail);window.addEventListener(HERO_EQUIPMENT_TIMELINE,update);return()=>window.removeEventListener(HERO_EQUIPMENT_TIMELINE,update);},[]);
 const language=transport?.language==='ar'?'ar':'en',ar=language==='ar';
 const cues=useMemo(()=>equipmentCues(ar?arabicNarration:englishNarration,language),[ar,language]);
 const position=transport?.position||0,started=transport?.started;
 const starts=useMemo(()=>musicBoxStarts(ar?arabicNarration:englishNarration,language),[ar,language]);
 const cue=started?equipmentCueAt(cues,position):null;
 const [reducedMotion,setReducedMotion]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce)'),change=()=>setReducedMotion(query.matches);query.addEventListener('change',change);return()=>query.removeEventListener('change',change);},[]);
 const visible=cue?cues.filter(item=>item.id===cue.id):[]; // an object is mounted only while it is being mentioned, and unmounted the moment its cue ends
 // Landscape tablet/desktop: the 3D object is drawn inside the greeting player's square (its .hero-intro-stage), which grows to fit it while an object is on show.
 const [host,setHost]=useState(null),[wide,setWide]=useState(()=>matchMedia('(min-width:721px) and (orientation:landscape)').matches);
 useEffect(()=>{const query=matchMedia('(min-width:721px) and (orientation:landscape)'),change=()=>setWide(query.matches);query.addEventListener('change',change);return()=>query.removeEventListener('change',change);},[]);
 useEffect(()=>{
  const find=()=>setHost(document.querySelector('.hero-intro-stage'));find();
  const observer=new MutationObserver(find);observer.observe(document.body,{childList:true,subtree:true});
  return()=>observer.disconnect();
 },[]);
 useEffect(()=>{if(!host)return undefined;host.dataset.active=cue?'true':'false';return()=>{host.dataset.active='false';};},[host,cue]);
 const aside=<aside className={`hero-equipment-showcase${cue?' is-visible':''}`} aria-label={ar?'تجهيزات مذكورة في المقدّمة':'Equipment featured in the introduction'} aria-hidden={!cue} dir={ar?'rtl':'ltr'}>
  <div className="hero-equipment-halo"/>
  {visible.map(item=><EquipmentScene key={`${language}:${item.id}`} cue={item} active={cue?.id===item.id} playing={transport?.playing} ar={ar} reducedMotion={reducedMotion} starts={starts} position={position}/>)}
 </aside>;
 return host?createPortal(aside,host):aside;
}
