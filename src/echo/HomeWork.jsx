import {useEffect,useRef,useState} from 'react';
import {Disc3,Layers3,Mic2,Music2,Pause,Play,Radio,Shuffle} from 'lucide-react';
import {fetchDjWorkTypes} from '../lib/musicOntology';
import {useViewportPhase} from './useViewportPhase';
import {useEventOrder} from './eventOrderContext';
import './homeWork.css';

const TYPE_ICONS={COVER:Mic2,REMIX:Shuffle,MASHUP:Layers3,MEDLEY:Music2,MIX:Disc3,LIVE:Radio};
export default function HomeWork({lang,embedded=false,onOpenWork}){
 const ar=lang.lang==='ar',tr=(en,arabic)=>ar?arabic:en,section=useRef(null),phase=useViewportPhase(section),[workTypes,setWorkTypes]=useState([]),order=useEventOrder(),grid=useRef(null),djAdded=Boolean(order?.order.services?.includes('dj')),toggleDj=()=>{const current=order.order.services||[];order.setField('services',djAdded?current.filter(id=>id!=='dj'):[...current,'dj']);};

 // Hovering a card grows only that card (the grid tracks never change) until it has its artwork's own proportions and shows it uncropped,
 // centred on its cell and kept inside the grid; neighbours stay where they are underneath it.
 const growCard=(index,event)=>{
  const el=grid.current,card=event.currentTarget,img=card.querySelector('.home-work-card-artwork');
  if(!el||!img?.naturalWidth||!matchMedia('(hover:hover) and (min-width:1001px)').matches)return;
  const box=el.getBoundingClientRect(),cell=card.getBoundingClientRect(),ratio=img.naturalWidth/img.naturalHeight;
  let w=box.width*.62,h=w/ratio;if(h>box.height*.9){h=box.height*.9;w=h*ratio;}
  w=Math.max(w,cell.width);h=Math.max(h,cell.height);
  const left=Math.min(Math.max(cell.left+cell.width/2-w/2,box.left),box.right-w),top=Math.min(Math.max(cell.top+cell.height/2-h/2,box.top),box.bottom-h);
  card.style.setProperty('--grow-w',`${w}px`);card.style.setProperty('--grow-h',`${h}px`);
  card.style.setProperty('--grow-x',`${left-(cell.left+cell.width/2-w/2)}px`);card.style.setProperty('--grow-y',`${top-(cell.top+cell.height/2-h/2)}px`);
  card.classList.add('is-grown');
 };
 const shrinkCard=event=>event.currentTarget.classList.remove('is-grown');
 const player=useRef(null),[playingId,setPlayingId]=useState(''),[sampleTime,setSampleTime]=useState(0);
 const stopSample=()=>{player.current?.pause();setPlayingId('');setSampleTime(0);};
 const toggleSample=(work,event)=>{
  event.stopPropagation();
  if(playingId===work.id){stopSample();return;}
  const node=player.current;if(!node||!work.sample)return;
  const {audioUrl,startSec,durationSec}=work.sample;
  node.pause();node.dataset.end=String(startSec+durationSec);node.dataset.length=String(durationSec);setSampleTime(0);
  const go=()=>{node.currentTime=startSec;node.play().then(()=>setPlayingId(work.id)).catch(()=>setPlayingId(''));};
  if(node.getAttribute('src')!==audioUrl){node.src=audioUrl;node.addEventListener('loadedmetadata',go,{once:true});node.load();}else go();
 };
 useEffect(()=>()=>player.current?.pause(),[]);
 useEffect(()=>{let active=true;fetchDjWorkTypes().then(rows=>{if(active)setWorkTypes(rows);}).catch(()=>{});return()=>{active=false;};},[]);
 const Root=embedded?'div':'section';
 return <Root id="khalil-work" ref={section} className={`home-work echo-section${phase==='in'?' is-in':''}`} dir={ar?'rtl':'ltr'} aria-labelledby="home-work-title">
  <header className="home-work-heading"><p className="echo-eyebrow">03 / {tr('DJ KHALIL','دي جي خليل')}</p><span>DJ KHALIL / ECHO</span></header>
  <div className="home-work-layout">
   <div className="home-work-feature">
    <div><p className="home-work-kicker">{tr('DJ KHALIL FEAT.','دي جي خليل يقدّم')}</p><h2 id="home-work-title">{tr('DJ Khalil’s','دي جي خليل')}<br/><em>{tr('Work.','وأعماله.')}</em></h2><p className="home-work-intro">{tr('One musical identity. Different ways to make it yours.','هوية موسيقية واحدة. وطرق مختلفة لتمنحها طابعك.')}</p></div>
    <figure className="home-work-studio"><img src="/echo/dj-khalil-studio-tall-3d.webp" width="1024" height="1536" loading="lazy" decoding="async" alt={tr("3D portrait of DJ Khalil producing music in his studio with a laptop, three monitors, mixer, headphones and speakers.","مشهد ثلاثي الأبعاد لدي جي خليل ينتج الموسيقى في الاستوديو مع حاسوب محمول وثلاث شاشات ومازج صوت وسماعات رأس ومكبرات صوت.")}/></figure>
    {order&&<button type="button" className="home-work-add-dj" aria-pressed={djAdded} onClick={toggleDj}>{djAdded?tr('DJ Service added to your booking','تمت إضافة خدمة الدي جي إلى حجزك'):tr('Add DJ Service to your booking','أضف خدمة الدي جي إلى حجزك')}</button>}
   </div>
   <audio ref={player} preload="none" onTimeUpdate={event=>{const node=event.currentTarget,end=Number(node.dataset.end);if(end&&node.currentTime>=end){stopSample();return;}if(end)setSampleTime(Math.max(0,node.currentTime-(end-Number(node.dataset.length||60))));}} onEnded={stopSample}/>
   <div className="home-work-formats" ref={grid}>{workTypes.map((work,index)=>{const Icon=TYPE_ICONS[work.id]||Disc3;const title=ar?(work.nameArabic||work.name):work.name;const details=ar?(work.detailsArabic||work.details):work.details;return <article className={`home-work-card${work.artworkUrl?' has-artwork':''}`} key={work.id} style={{'--work-order':index}} onMouseEnter={event=>growCard(index,event)} onMouseLeave={shrinkCard} {...(onOpenWork?{role:'button',tabIndex:0,'aria-label':`${title} — ${ar?'عرض التسجيلات':'show recordings'}`,onClick:()=>onOpenWork(work.id),onKeyDown:event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onOpenWork(work.id);}}}:{})}>{work.artworkUrl&&<img className="home-work-card-artwork" src={work.artworkUrl} alt="" loading="lazy" decoding="async"/>}<div className="home-work-card-top"><Icon size={23} strokeWidth={1.3} aria-hidden="true"/><span>{String(index+1).padStart(2,'0')}</span></div><h3>{title}</h3><p className="home-work-description">{details}</p>{<div className={`home-work-sample${playingId===work.id?' is-playing':''}${work.sample?'':' is-empty'}`} onClick={event=>{if(work.sample)toggleSample(work,event);else event.stopPropagation();}} onKeyDown={event=>event.stopPropagation()}><button type="button" disabled={!work.sample} aria-pressed={playingId===work.id} aria-label={!work.sample?`${tr('No sample yet for','لا توجد عينة بعد لـ')} ${title}`:`${playingId===work.id?tr('Stop the sample of','إيقاف عينة'):tr('Hear a one-minute sample of','استمع إلى عينة من دقيقة من')} ${title}`} onClick={event=>toggleSample(work,event)}>{playingId===work.id?<Pause size={15} aria-hidden="true"/>:<Play size={15} aria-hidden="true"/>}</button><span className="home-work-sample-label">{!work.sample?tr('No sample yet','لا توجد عينة بعد'):playingId===work.id?tr('Playing · click to pause','قيد التشغيل · اضغط للإيقاف'):tr('Press play to hear a sample','اضغط تشغيل للاستماع إلى عينة')}</span><span className="home-work-sample-track" aria-hidden="true"><i style={{width:`${work.sample&&playingId===work.id?Math.min(100,sampleTime/work.sample.durationSec*100):0}%`}}/></span><span className="home-work-sample-time" dir="ltr">{work.sample?<>{(t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`)(playingId===work.id?sampleTime:0)} / {(t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`)(work.sample.durationSec)}</>:'– / –'}</span></div>}</article>;})}</div>
  </div>
 </Root>;
}
