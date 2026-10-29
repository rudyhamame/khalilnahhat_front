import {useRef} from 'react';
import {ArrowUpRight,Disc3,Layers3,Mic2,Music2,Radio,Shuffle} from 'lucide-react';
import {musicOntologyContract,recordingTypeLabel} from '../lib/musicOntology';
import {useViewportPhase} from './useViewportPhase';
import './homeWork.css';

// Use the archive's recording types; these are formats, not separate genres.
const WORKS=[
 {type:'MIX',Icon:Disc3,ar:'ميكس',line:['Different tracks. One journey.','مقطوعات مختلفة. رحلة واحدة.'],copy:['Khalil selects and sequences recordings, matching their energy and blending transitions into a continuous listening experience.','يختار خليل التسجيلات ويرتّبها وينسّق طاقتها ويمزج انتقالاتها لتصبح تجربة استماع متصلة.']},
 {type:'REMIX',Icon:Shuffle,ar:'ريميكس',line:['A familiar track, reimagined.','عمل مألوف برؤية جديدة.'],copy:['Khalil reshapes an existing recording with a new beat, arrangement and textures while keeping a connection to the original.','يعيد خليل تشكيل تسجيل موجود بإيقاع وتوزيع وملامح صوتية جديدة، مع الحفاظ على صلته بالعمل الأصلي.']},
 {type:'MASHUP',Icon:Layers3,ar:'ماش أب',line:['Separate songs. Shared chemistry.','أغانٍ مختلفة تنسجم معاً.'],copy:['Khalil brings vocals, melodies or rhythms from different recordings together, aligning their timing and musical key into a new combination.','يجمع خليل الغناء أو الألحان أو الإيقاعات من تسجيلات مختلفة، ويوحّد توقيتها ومقاماتها في تركيب موسيقي جديد.']},
 {type:'MEDLEY',Icon:Music2,ar:'ميدلي',line:['The moments you know, connected.','لحظات تعرفها، متصلة ببعضها.'],copy:['Khalil arranges selected passages from several works into one performance, connecting melodies and shaping how each passage leads to the next.','يرتّب خليل مقاطع مختارة من عدة أعمال في أداء واحد، ويربط ألحانها ويصوغ الانتقال من كل مقطع إلى التالي.']},
 {type:'COVER',Icon:Mic2,ar:'إعادة أداء',line:['Another interpretation. A personal touch.','قراءة أخرى بلمسة خاصة.'],copy:['Khalil creates a new interpretation of an existing work, giving its melody or lyrics a different arrangement, sound and performance feel.','يقدّم خليل قراءة جديدة لعمل موجود، فيمنح لحنه أو كلماته توزيعاً وصوتاً وإحساساً أدائياً مختلفاً.']},
 {type:'LIVE',Icon:Radio,ar:'أداء مباشر',line:['Made in the moment.','موسيقى تُصاغ في اللحظة.'],copy:['Khalil shapes the selection, transitions and dynamics in real time, responding to the room and capturing the flow of a live performance.','يشكّل خليل الاختيارات والانتقالات والديناميكية في الوقت الفعلي، ويتفاعل مع الجمهور ويلتقط انسياب الأداء المباشر.']},
];

export default function HomeWork({lang}){
 const ar=lang.lang==='ar',tr=(en,arabic)=>ar?arabic:en,section=useRef(null),phase=useViewportPhase(section);
 const works=WORKS.filter(work=>musicOntologyContract.recordingTypes.includes(work.type));
 const title=work=>ar?work.ar:recordingTypeLabel(work.type);
 return <section id="khalil-work" ref={section} className={`home-work echo-section${phase==='in'?' is-in':''}`} dir={ar?'rtl':'ltr'} aria-labelledby="home-work-title">
  <header className="home-work-heading"><p className="echo-eyebrow">02 / {tr('THE WORK','الأعمال')}</p><span>DJ KHALIL / ECHO</span></header>
  <div className="home-work-layout">
   <div className="home-work-feature">
    <div><p className="home-work-kicker">{tr('DJ KHALIL FEAT.','دي جي خليل يقدّم')}</p><h2 id="home-work-title">{tr('DJ Khalil’s','دي جي خليل')}<br/><em>{tr('Work.','وأعماله.')}</em></h2><p className="home-work-intro">{tr('One musical identity. Different ways to make it yours.','هوية موسيقية واحدة. وطرق مختلفة لتمنحها طابعك.')}</p></div>
    <figure className="home-work-studio"><img src="/echo/dj-khalil-studio-3d.webp" width="1536" height="1024" loading="lazy" decoding="async" alt={tr("3D portrait of DJ Khalil producing music in his studio with a laptop, three monitors, mixer, headphones and speakers.","مشهد ثلاثي الأبعاد لدي جي خليل ينتج الموسيقى في الاستوديو مع حاسوب محمول وثلاث شاشات ومازج صوت وسماعات رأس ومكبرات صوت.")}/></figure>
    <a className="home-work-listen" href="#home-music-archive">{tr('Hear the work in the Music Archive','استمع إلى الأعمال في الأرشيف الموسيقي')}<ArrowUpRight size={19} aria-hidden="true"/></a>
   </div>
   <div className="home-work-formats">{works.map((work,i)=>{const Icon=work.Icon;return <article className="home-work-card" key={work.type} style={{'--work-order':i}}><div className="home-work-card-top"><Icon size={23} strokeWidth={1.3} aria-hidden="true"/><span>{String(i+1).padStart(2,'0')}</span></div><h3>{title(work)}</h3><p className="home-work-line">{work.line[ar?1:0]}</p><p className="home-work-description">{work.copy[ar?1:0]}</p></article>;})}</div>
  </div>
 </section>;
}
