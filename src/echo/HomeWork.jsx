import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,Disc3,Layers3,Mic2,Music2,Radio,Shuffle} from 'lucide-react';
import {fetchDjWorkTypes} from '../lib/musicOntology';
import {useViewportPhase} from './useViewportPhase';
import './homeWork.css';

const TYPE_ICONS={COVER:Mic2,REMIX:Shuffle,MASHUP:Layers3,MEDLEY:Music2,MIX:Disc3,LIVE:Radio};
export default function HomeWork({lang}){
 const ar=lang.lang==='ar',tr=(en,arabic)=>ar?arabic:en,section=useRef(null),phase=useViewportPhase(section),[workTypes,setWorkTypes]=useState([]);
 useEffect(()=>{let active=true;fetchDjWorkTypes().then(rows=>{if(active)setWorkTypes(rows);}).catch(()=>{});return()=>{active=false;};},[]);
 return <section id="khalil-work" ref={section} className={`home-work echo-section${phase==='in'?' is-in':''}`} dir={ar?'rtl':'ltr'} aria-labelledby="home-work-title">
  <header className="home-work-heading"><p className="echo-eyebrow">03 / {tr('DJ KHALIL','دي جي خليل')}</p><span>DJ KHALIL / ECHO</span></header>
  <div className="home-work-layout">
   <div className="home-work-feature">
    <div><p className="home-work-kicker">{tr('DJ KHALIL FEAT.','دي جي خليل يقدّم')}</p><h2 id="home-work-title">{tr('DJ Khalil’s','دي جي خليل')}<br/><em>{tr('Work.','وأعماله.')}</em></h2><p className="home-work-intro">{tr('One musical identity. Different ways to make it yours.','هوية موسيقية واحدة. وطرق مختلفة لتمنحها طابعك.')}</p></div>
    <figure className="home-work-studio"><img src="/echo/dj-khalil-studio-tall-3d.webp" width="1024" height="1536" loading="lazy" decoding="async" alt={tr("3D portrait of DJ Khalil producing music in his studio with a laptop, three monitors, mixer, headphones and speakers.","مشهد ثلاثي الأبعاد لدي جي خليل ينتج الموسيقى في الاستوديو مع حاسوب محمول وثلاث شاشات ومازج صوت وسماعات رأس ومكبرات صوت.")}/></figure>
    <a className="home-work-listen" href="#home-music-archive">{tr('Hear the work in the Music Archive','استمع إلى الأعمال في الأرشيف الموسيقي')}<ArrowUpRight size={19} aria-hidden="true"/></a>
   </div>
   <div className="home-work-formats" style={{gridTemplateRows:`repeat(${Math.max(1,Math.ceil(workTypes.length/2))},minmax(0,1fr))`}}>{workTypes.map((work,index)=>{const Icon=TYPE_ICONS[work.id]||Disc3;const title=ar?(work.nameArabic||work.name):work.name;const details=ar?(work.detailsArabic||work.details):work.details;return <article className={`home-work-card${work.artworkUrl?' has-artwork':''}`} key={work.id} style={{'--work-order':index}}>{work.artworkUrl&&<img className="home-work-card-artwork" src={work.artworkUrl} alt="" loading="lazy" decoding="async"/>}<div className="home-work-card-top"><Icon size={23} strokeWidth={1.3} aria-hidden="true"/><span>{String(index+1).padStart(2,'0')}</span></div><h3>{title}</h3><p className="home-work-description">{details}</p></article>;})}</div>
  </div>
 </section>;
}
