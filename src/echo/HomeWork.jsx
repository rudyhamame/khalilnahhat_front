import {useEffect,useRef,useState} from 'react';
import {Clapperboard,Disc3,Layers3,Mic2,Music2,Play,Shuffle} from 'lucide-react';
import DjBookingForm from './DjBookingForm';
import MusicContentLoader from './MusicContentLoader';
import WorkTypeJourney from './WorkTypeJourney';
import {fetchDjWorkTypes} from '../lib/musicOntology';
import {useViewportPhase} from './useViewportPhase';
import {useEventOrder} from './eventOrderContext';
import './homeWork.css';
import './glowCards.css';

const TYPE_ICONS={COVER:Mic2,REMIX:Shuffle,MASHUP:Layers3,MEDLEY:Music2,MIX:Disc3,LIVE:Clapperboard};
// The Live work type is presented as Reels.
const REELS={name:'Reels',nameArabic:'ريلز',details:'Short performance clips and moments from behind the decks, made to share.',detailsArabic:'مقاطع أداء قصيرة ولحظات من خلف الديكات، مصممة للمشاركة.'};
export default function HomeWork({lang,embedded=false,onOpenWork}){
 const ar=lang.lang==='ar',tr=(en,arabic)=>ar?arabic:en,section=useRef(null),phase=useViewportPhase(section),[workTypes,setWorkTypes]=useState([]),[djFormOpen,setDjFormOpen]=useState(false),order=useEventOrder(),djAdded=Boolean(order?.order.services?.includes('dj'));
 // The DJ form opens in place of this viewport's content; the DJ card (in the Rentals chapter) asks for it with an event.
 useEffect(()=>{const open=()=>setDjFormOpen(true);window.addEventListener('echo:dj-form-open',open);return()=>window.removeEventListener('echo:dj-form-open',open);},[]);

 // Clicking a card: the other cards fly off toward the screen edges, one after another in a random order, then the player opens.
 const cardNodes=useRef([]),[leaving,setLeaving]=useState(null);
 const openWork=work=>{
  if(leaving||!onOpenWork)return;
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){onOpenWork(work.id);return;}
  const w=window.innerWidth,h=window.innerHeight,others=workTypes.map((item,index)=>index).filter(index=>workTypes[index].id!==work.id).sort(()=>Math.random()-.5),vars={};
  workTypes.forEach((item,index)=>{
   const node=cardNodes.current[index];if(!node||item.id===work.id)return;
   const box=node.getBoundingClientRect(),cx=box.x+box.width/2,cy=box.y+box.height/2;
   const dx=cx<w*.4?-(box.right+80):cx>w*.6?w-box.left+80:0,dy=cy<h/2?-(box.bottom+80):h-box.top+80;
   vars[item.id]={'--fx':`${dx}px`,'--fy':`${dy}px`,'--fr':`${Math.round(Math.random()*30-15)}deg`,'--leave-delay':`${Math.round(others.indexOf(index)*110+Math.random()*80)}ms`};
  });
  setLeaving({id:work.id,vars});
  window.setTimeout(()=>{onOpenWork(work.id);window.setTimeout(()=>setLeaving(null),900);},1250);
 };
 const [status,setStatus]=useState('loading'),[retry,setRetry]=useState(0);
 useEffect(()=>{
  let active=true;setStatus('loading');
  fetchDjWorkTypes().then(rows=>{if(active){setWorkTypes(rows);setStatus('ready');}}).catch(()=>{if(active)setStatus('error');});
  return()=>{active=false;};
 },[retry]);
 const Root=embedded?'div':'section';
 return <Root id="khalil-work" ref={embedded?undefined:section} className={`home-work echo-section${phase==='in'?' is-in':''}`} dir={ar?'rtl':'ltr'} aria-labelledby="home-work-title">

  <div className={`home-work-layout${djFormOpen&&order?' is-dj-form':''}`} ref={embedded?section:undefined}>
  <h2 id="home-work-title" className="home-work-sr-title">{tr('DJ Khalil’s Work','أعمال دي جي خليل')}</h2>
  {djFormOpen&&order?<DjBookingForm ar={ar} ctx={order} djAdded={djAdded} onClose={()=>setDjFormOpen(false)}/>:status==='loading'?<MusicContentLoader ar={ar}/>:status==='error'?<div className="home-work-message" role="alert"><p>{tr('The music could not load.','تعذر تحميل الموسيقى.')}</p><button type="button" onClick={()=>setRetry(value=>value+1)}>{tr('Try again','حاول مجدداً')}</button></div>:workTypes.length===0?<p className="home-work-message" role="status">{tr('No music collections here yet.','لا توجد مجموعات موسيقية هنا بعد.')}</p>:<>
   <WorkTypeJourney ar={ar} workTypes={workTypes} onOpenWork={onOpenWork} renderCard={(work,index)=>{const Icon=TYPE_ICONS[work.id]||Disc3;const shown=work.id==='LIVE'?{...work,...REELS}:work;const title=ar?(shown.nameArabic||shown.name):shown.name;const details=ar?(shown.detailsArabic||shown.details):shown.details;const open=()=>openWork(work);return <article key={work.id} ref={node=>{cardNodes.current[index]=node;}} className={`glow-card${leaving?(leaving.id===work.id?' is-picked':' is-leaving'):''}`} data-tone={index%6} style={{'--glow-delay':`${index*-3.4}s`,...(leaving?.vars[work.id]||{})}} aria-label={title} aria-describedby={`work-story-description-${work.id}`} role={onOpenWork?'button':undefined} tabIndex={onOpenWork?0:undefined} onClick={open} onKeyDown={event=>{if(onOpenWork&&(event.key==='Enter'||event.key===' ')){event.preventDefault();open();}}}><span className="glow-card-face" aria-hidden="true"/><Icon className="glow-card-icon" strokeWidth={1.6} aria-hidden="true"/><span className="glow-card-open" aria-hidden="true"><Play size={14} fill="currentColor"/>{tr('Open to play','افتح للتشغيل')}</span><div className="glow-card-text"><h3>{title}</h3><p>{details}</p></div></article>;}} intro={
<div className="home-work-editorial">
     <span className="home-work-editorial-kicker">{tr('Explore the sound','استكشف الإيقاع')}</span>
     <h3>{tr('DJ Khalil’s Work','أعمال دي جي خليل')}</h3>
     <p>{tr('Every track is a chance to hear something familiar in a new way. Step into DJ Khalil’s world of covers, remixes, mashups, medleys, and mixes — where melodies meet fresh rhythms and songs flow into new connections. From a reimagined favourite to a moment behind the decks, explore the collections and find the sound that moves you.','كل مقطوعة فرصة لسماع ما تحبّه بروح جديدة. اكتشف عالم دي جي خليل من الكوفر والريمكس والماش أب والميدلي والميكس، حيث تلتقي الألحان بإيقاعات متجددة وتنساب الأغاني في توليفات جديدة. من أغنية مفضّلة بتوزيع مختلف إلى لحظة خلف الديكات، تصفّح المجموعات واعثر على الإيقاع الذي يحرّكك.')}</p>
    </div>
   }/>
  </>}
  </div>
 </Root>;
}
