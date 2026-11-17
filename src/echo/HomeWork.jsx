import {useEffect,useRef,useState} from 'react';
import {Clapperboard,Disc3,Layers3,Mic2,Music2,Play,Shuffle} from 'lucide-react';
import {djWorkTypeText} from '../lib/djWorkTypeText';
import DjBookingForm from './DjBookingForm';
import MusicContentLoader from './MusicContentLoader';
import WorkTypeJourney from './WorkTypeJourney';
import WorkPlayerBox from './WorkPlayerBox';
import {fetchDjWorkTypes,fetchOntologyRecordings} from '../lib/musicOntology';
import {useViewportPhase} from './useViewportPhase';
import {useEventOrder} from './eventOrderContext';
import './homeWork.css';
import './glowCards.css';

const TYPE_ICONS={COVER:Mic2,REMIX:Shuffle,MASHUP:Layers3,MEDLEY:Music2,MIX:Disc3,LIVE:Clapperboard};
export default function HomeWork({lang,embedded=false}){
 const ar=lang.lang==='ar',tr=(en,arabic)=>ar?arabic:en,section=useRef(null),phase=useViewportPhase(section),[workTypes,setWorkTypes]=useState([]),[djFormOpen,setDjFormOpen]=useState(false),order=useEventOrder(),djAdded=Boolean(order?.order.services?.includes('dj'));
 // The DJ form opens in place of this viewport's content; the DJ card (in the Services chapter) asks for it with an event.
 useEffect(()=>{const open=()=>setDjFormOpen(true);window.addEventListener('echo:dj-form-open',open);return()=>window.removeEventListener('echo:dj-form-open',open);},[]);

 // Hovering a work card tints the page with its rim colours.
 const tint=useRef(null);
 useEffect(()=>{
  const layer=tint.current;if(!layer)return undefined;
  const on=event=>{const card=event.target.closest?.('.glow-card');if(!card||card.classList.contains('is-leaving'))return;const style=getComputedStyle(card);['--c1','--c2','--c3'].forEach((name,i)=>layer.style.setProperty(`--tint-${i+1}`,style.getPropertyValue(name).trim()));layer.classList.add('is-on');};
  const off=event=>{if(event.target.closest?.('.glow-card')&&!event.relatedTarget?.closest?.('.glow-card'))layer.classList.remove('is-on');};
  document.addEventListener('pointerover',on);document.addEventListener('pointerout',off);document.addEventListener('focusin',on);document.addEventListener('focusout',off);
  return()=>{document.removeEventListener('pointerover',on);document.removeEventListener('pointerout',off);document.removeEventListener('focusin',on);document.removeEventListener('focusout',off);};
 },[]);
 const [activeType,setActiveType]=useState(()=>new URLSearchParams(window.location.search).get('play')||'');
 // Opens the player that really holds the playing song: its own work type, or (when the song carries none) the work type whose recordings include it. It never falls back to the first box.
 useEffect(()=>{
  const open=async event=>{
   const {type,trackId}=event.detail||{},wanted=String(type||'').toUpperCase();let target=workTypes.some(work=>work.id===wanted)?wanted:'';
   if(!target&&trackId){for(const work of workTypes){try{const rows=await fetchOntologyRecordings({recordingType:work.id});if(rows.some(row=>row.id===trackId)){target=work.id;break;}}catch{/* try the next type */}}}
   if(target)setActiveType(target);
  };
  window.addEventListener('echo:work-player-open',open);return()=>window.removeEventListener('echo:work-player-open',open);
 },[workTypes]);
 const openWork=type=>{tint.current?.classList.remove('is-on');setActiveType(typeof type==='string'?type:type.id);};
 const onOpenWork=openWork;
 const [status,setStatus]=useState('loading'),[retry,setRetry]=useState(0);
 useEffect(()=>{
  let active=true,revision=0;setStatus('loading');
  const load=()=>{const request=++revision;fetchDjWorkTypes().then(rows=>{if(active&&request===revision){setWorkTypes(rows);setActiveType(current=>rows.some(work=>work.id===current)?current:'');setStatus('ready');}}).catch(()=>{if(active&&request===revision)setStatus('error');});};
  load();window.addEventListener('focus',load);window.addEventListener('echo:music-archive-changed',load);
  return()=>{active=false;window.removeEventListener('focus',load);window.removeEventListener('echo:music-archive-changed',load);};
 },[retry]);
 const Root=embedded?'div':'section';
 return <Root id="khalil-work" ref={embedded?undefined:section} className={`home-work echo-section${phase==='in'?' is-in':''}`} dir={ar?'rtl':'ltr'} aria-labelledby="home-work-title">

  <div ref={tint} className="home-work-tint" aria-hidden="true"/>
  <div className={`home-work-layout${djFormOpen&&order?' is-dj-form':''}`} ref={embedded?section:undefined}>
  <h2 id="home-work-title" className="home-work-sr-title">{tr('DJ Khalil’s Work','أعمال دي جي خليل')}</h2>
  {djFormOpen&&order?<DjBookingForm ar={ar} ctx={order} djAdded={djAdded} onClose={()=>setDjFormOpen(false)}/>:status==='loading'?<MusicContentLoader ar={ar}/>:status==='error'?<div className="home-work-message" role="alert"><p>{tr('The music could not load.','تعذر تحميل الموسيقى.')}</p><button type="button" onClick={()=>setRetry(value=>value+1)}>{tr('Try again','حاول مجدداً')}</button></div>:workTypes.length===0?<p className="home-work-message" role="status">{tr('No music collections here yet.','لا توجد مجموعات موسيقية هنا بعد.')}</p>:<>
   <WorkTypeJourney ar={ar} activeType={activeType} workTypes={workTypes} onOpenWork={onOpenWork} renderCard={(work,index,card={})=>{const Icon=TYPE_ICONS[work.id]||Disc3;const {name:title,details}=djWorkTypeText(work,ar);const open=card.onOpen||(()=>openWork(work));return <WorkPlayerBox tone={index%6} active={card.active??activeType===work.id} lang={lang} type={work.id} workType={work} onClose={()=>setActiveType('')}><article key={work.id} className="glow-card" data-tone={index%6} style={{'--glow-delay':`${index*-3.4}s`}} aria-label={title} aria-describedby={details?`work-story-description-${work.id}`:undefined} role={onOpenWork?'button':undefined} tabIndex={onOpenWork?0:undefined} onClick={open} onKeyDown={event=>{if(onOpenWork&&(event.key==='Enter'||event.key===' ')){event.preventDefault();open();}}}><span className="glow-card-face" aria-hidden="true"/><Icon className="glow-card-icon" strokeWidth={1.6} aria-hidden="true"/><span className="glow-card-open" aria-hidden="true"><Play size={14} fill="currentColor"/>{tr('Open to play','افتح للتشغيل')}</span><div className="glow-card-text"><h3>{title}</h3>{!card.compact&&<p>{details}</p>}</div></article></WorkPlayerBox>;}} intro={
<div className="home-work-editorial">
     <span className="home-work-editorial-kicker">{tr('Explore the sound','استكشف الإيقاع')}</span>
     <h3>{ar?'أعمال دي جي خليل':<>DJ Khalil’s<br/>{' '}Work</>}</h3>
     <p>{tr('Explore DJ Khalil’s music collections. Choose a work type below to discover its recordings and find the sound that moves you.','استكشف مجموعات دي جي خليل الموسيقية. اختر نوع عمل أدناه لاكتشاف تسجيلاته والعثور على الإيقاع الذي يحرّكك.')}</p>
    </div>
   }/>
  </>}
  </div>
 </Root>;
}
