import {useViewportPhase} from './useViewportPhase';
import {useRef} from 'react';
import {AudioLines,Globe2,Sparkles} from 'lucide-react';
import './homeAbout.css';

export default function HomeAbout({lang}) {
  const ar=lang.lang==='ar';
  const tr=(en,arabic)=>ar?arabic:en;
  // Entrance and outro in both scroll directions: the portrait rises into the light, and the badges drop in one at a time.
  const sectionRef=useRef(null);
  const phase=useViewportPhase(sectionRef);
  const pillars=[
    {Icon:Globe2,title:tr('CULTURE, IN THE DETAILS','الثقافة في التفاصيل'),copy:tr('Arabic, Middle Eastern and multicultural celebrations shaped around the people in the room.','احتفالات عربية وشرق أوسطية ومتعددة الثقافات تنسجم مع الحاضرين.')},
    {Icon:AudioLines,title:tr('A NIGHT THAT FLOWS','ليلة تنساب بانسجام'),copy:tr('Music, entrances and transitions paced to bring every part of the celebration together.','موسيقى ودخول وانتقالات تجمع أجزاء الاحتفال بإيقاع متناسق.')},
    {Icon:Sparkles,title:tr('ONE CONNECTED SHOW','عرض متكامل'),copy:tr('DJ Khalil’s performance, delivered with Echo’s sound, lighting and visual production.','أداء دي جي خليل مع إنتاج إيكو للصوت والإضاءة والمؤثرات المرئية.')},
  ];
  const facts=[
    {value:'10+',label:tr('Years of experience','سنوات من الخبرة')},
    {value:tr('GTA','تورونتو'),label:tr('Toronto & the Greater Toronto Area','تورونتو ومنطقتها الكبرى')},
    {value:'MC',label:tr('Hosting & announcements on request','تقديم وإعلانات عند الطلب')},
  ];
  const svg={width:20,height:20,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.6,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true};
  const badges=[
    {key:'instagram',href:'https://www.instagram.com/khalil_nahhat/',label:'Instagram',handle:'@khalil_nahhat',icon:<svg {...svg}><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r=".6" fill="currentColor"/></svg>},
    {key:'youtube',href:'https://www.youtube.com/@djkhalilnahhat8943',label:'YouTube',handle:'@djkhalilnahhat8943',icon:<svg {...svg}><rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5v5l4.5-2.5z" fill="currentColor"/></svg>},
    {key:'email',href:'mailto:khalilnahhatdj@gmail.com',label:tr('Email','البريد الإلكتروني'),handle:'khalilnahhatdj@gmail.com',icon:<svg {...svg}><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>},
    {key:'anghami',href:'https://play.anghami.com/artist/6095441',label:'Anghami',handle:'Anghami',icon:<svg {...svg}><path d="M5 19 12 5l7 14"/><path d="M8.2 14h7.6"/></svg>},
  ];
  return <section id="about-dj-khalil" ref={sectionRef} className={`home-about viewport-fit-section${phase==='in'?' is-in':` is-away is-away-${phase}`}`} aria-labelledby="home-about-title" dir={ar?'rtl':'ltr'}>
    <div className="home-about-copy">
      <p className="echo-eyebrow">06 / {tr('THE ARTIST','الفنان')}</p>
      <h2 id="home-about-title">{tr('About DJ Khalil','عن دي جي خليل')}<span>{tr('The artist. The experience.','الفنان. التجربة.')}</span></h2>
      <p className="home-about-lede">{tr('A room can feel different when the music understands it.','تتغيّر أجواء القاعة حين تفهمها الموسيقى.')}</p>
      <p className="home-about-story">{tr('DJ Khalil is the performance identity at the heart of Echo Event Entertainment. For over a decade he has played Arabic, Middle Eastern and multicultural weddings, engagements, private celebrations and corporate events across the Greater Toronto Area.', 'دي جي خليل هو الهوية الفنية في قلب إيكو لتنظيم وترفيه الفعاليات. لأكثر من عقد، قدّم عروضه في الأعراس العربية والشرق أوسطية ومتعددة الثقافات والخطوبات والمناسبات الخاصة وفعاليات الشركات في منطقة تورونتو الكبرى.')}</p>
      <div className="home-about-pillars">{pillars.map(({Icon,title,copy},i)=><article key={title}><span className="home-about-pillar-index">0{i+1}</span><Icon size={19} strokeWidth={1.5} aria-hidden="true"/><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div>
      <div className="home-about-facts">{facts.map(({value,label})=><div key={label}><strong dir="ltr">{value}</strong><span>{label}</span></div>)}</div>
      <div className="home-about-social" aria-label={tr('DJ Khalil online','دي جي خليل على الإنترنت')}>{badges.map(({key,href,label,handle,icon})=><a key={key} className={`home-about-badge is-${key}`} href={href} {...(href.startsWith('http')?{target:'_blank',rel:'noopener noreferrer'}:{})}>{icon}<span><small>{label}</small><strong dir="ltr">{handle}</strong></span></a>)}</div>
    </div>
    <figure className="home-about-portrait"><img src="/echo/seated-jade-full-body.webp" alt={tr('Illustrative portrait of DJ Khalil','صورة فنية لدي جي خليل')} loading="lazy"/><div className="home-about-portrait-mark" aria-hidden="true">ECHO</div></figure>
  </section>;
}
