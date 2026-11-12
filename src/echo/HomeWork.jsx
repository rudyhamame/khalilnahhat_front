import {displayImageUrl} from '../lib/displayImage';
import {djServiceChanges} from '../lib/bookingFlow.mjs';
import {useRentalCatalog} from '../lib/useRentalCatalog';
import {useEffect,useRef,useState} from 'react';
import {Disc3,Layers3,ListMusic,Mic2,Music2,Pause,Play,Pencil,Plus,Radio,Shuffle} from 'lucide-react';
import DjBookingForm from './DjBookingForm';
import {fetchDjWorkTypes} from '../lib/musicOntology';
import {useViewportPhase} from './useViewportPhase';
import {useEventOrder} from './eventOrderContext';
import './homeWork.css';

const TYPE_ICONS={COVER:Mic2,REMIX:Shuffle,MASHUP:Layers3,MEDLEY:Music2,MIX:Disc3,LIVE:Radio};
export default function HomeWork({lang,embedded=false,onOpenWork}){
 const ar=lang.lang==='ar',tr=(en,arabic)=>ar?arabic:en,section=useRef(null),phase=useViewportPhase(section),[workTypes,setWorkTypes]=useState([]),[djOpen,setDjOpen]=useState(false),[djFormOpen,setDjFormOpen]=useState(false),order=useEventOrder(),grid=useRef(null),djAdded=Boolean(order?.order.services?.includes('dj'));
 // Adding the DJ service opens its form in place of this viewport's content; the form also removes it.
 const openDjForm=()=>{if(!djAdded)djServiceChanges(order.order,'dj').forEach(({path,value})=>order.setField(path,value));setDjFormOpen(true);};

 const {catalog,equipment}=useRentalCatalog();
 const djInfo=equipment.find(row=>row.id==='dj-service')||{};
 const djCover=catalog.find(row=>row.kind==='service'&&row.id==='dj')?.imageUrl||'';
 // The DJ Khalil service's own description and "what it does" text come from its equipment record in the admin.
 // The feature background is the DJ Services cover chosen in the admin (Events, Services & Equipment).
 const toggleFeature=()=>setDjOpen(value=>!value);
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
 return <Root id="khalil-work" ref={embedded?undefined:section} className={`home-work echo-section${phase==='in'?' is-in':''}`} dir={ar?'rtl':'ltr'} aria-labelledby="home-work-title">

  <div className={`home-work-layout${djFormOpen&&order?' is-dj-form':''}`} ref={embedded?section:undefined}>
  {djFormOpen&&order?<DjBookingForm ar={ar} ctx={order} djAdded={djAdded} onClose={()=>setDjFormOpen(false)}/>:<>
   <div className={`home-work-feature${djOpen?' is-open':''}`} role="button" aria-expanded={djOpen} aria-label={djOpen?tr("Collapse DJ Khalil's Work",'تصغير أعمال دي جي خليل'):tr("Expand DJ Khalil's Work",'توسيع أعمال دي جي خليل')} tabIndex={0} onClick={event=>{if(!event.target.closest('button'))toggleFeature();}} onKeyDown={event=>{if(event.target===event.currentTarget&&(event.key==='Enter'||event.key===' ')){event.preventDefault();toggleFeature();}}}>
    <div><p className="home-work-kicker">{tr('DJ KHALIL FEAT.','دي جي خليل يقدّم')}</p><h2 id="home-work-title">{tr('DJ Khalil’s','دي جي خليل')}<br/><em>{tr('Work.','وأعماله.')}</em></h2><p className="home-work-intro">{tr('One musical identity. Different ways to make it yours.','هوية موسيقية واحدة. وطرق مختلفة لتمنحها طابعك.')}</p>{djInfo.description&&<p className="home-work-bio"><span>{djInfo.description}</span></p>}{djInfo.functionSummary&&<div className="home-work-service-copy"><p>{djInfo.functionSummary}</p></div>}</div>
    {djCover&&<figure className="home-work-studio"><img src={displayImageUrl(djCover)} alt="" loading="lazy" decoding="async"/></figure>}
    {order&&<button type="button" className="home-work-add-dj" aria-pressed={djAdded} onClick={openDjForm}>{djAdded?<Pencil size={18} aria-hidden="true"/>:<Plus size={18} aria-hidden="true"/>}<span>{djAdded?tr('DJ Service added · Edit your music details','تمت إضافة خدمة الدي جي · عدّل تفاصيل موسيقاك'):tr('Add DJ Service to your booking','أضف خدمة الدي جي إلى حجزك')}</span></button>}
   </div>
   <audio ref={player} preload="none" onTimeUpdate={event=>{const node=event.currentTarget,end=Number(node.dataset.end);if(end&&node.currentTime>=end){stopSample();return;}if(end)setSampleTime(Math.max(0,node.currentTime-(end-Number(node.dataset.length||60))));}} onEnded={stopSample}/>
   <div className="home-work-formats" ref={grid}>{workTypes.map((work,index)=>{const Icon=TYPE_ICONS[work.id]||Disc3;const title=ar?(work.nameArabic||work.name):work.name;const details=ar?(work.detailsArabic||work.details):work.details;return <article className={`home-work-card${work.artworkUrl?' has-artwork':''}${playingId===work.id?' is-playing':''}`} key={work.id} style={{'--work-order':index}} aria-label={title}>{work.artworkUrl&&<img className="home-work-card-artwork" src={displayImageUrl(work.artworkUrl)} alt="" loading="lazy" decoding="async"/>}<div className="home-work-card-top"><Icon size={23} strokeWidth={1.3} aria-hidden="true"/><span>{String(index+1).padStart(2,'0')}</span></div>{onOpenWork&&<button type="button" className="home-work-playlist" aria-label={`${tr('Open the playlist of','فتح قائمة تشغيل')} ${title}`} title={tr('Open playlist','فتح قائمة التشغيل')} onClick={()=>onOpenWork(work.id)}><ListMusic size={16} aria-hidden="true"/></button>}<button type="button" className="home-work-play" title={work.sample?undefined:tr('No sample yet','لا توجد عينة بعد')} disabled={!work.sample} aria-pressed={playingId===work.id} aria-label={!work.sample?`${tr('No sample yet for','لا توجد عينة بعد لـ')} ${title}`:`${playingId===work.id?tr('Pause the sample of','إيقاف عينة'):tr('Play a one-minute sample of','تشغيل عينة من دقيقة من')} ${title}`} onClick={event=>toggleSample(work,event)}>{playingId===work.id?<Pause size={26} aria-hidden="true"/>:<Play size={26} aria-hidden="true"/>}</button><h3>{title}</h3><p className="home-work-description">{details}</p><i className="home-work-progress" aria-hidden="true" style={{width:`${work.sample&&playingId===work.id?Math.min(100,sampleTime/work.sample.durationSec*100):0}%`}}/></article>;})}</div>
  </>}
  </div>
 </Root>;
}
