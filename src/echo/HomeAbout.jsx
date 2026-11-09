import {useViewportPhase} from './useViewportPhase';
import {contactEmail} from '../lib/publicContact';
import {useRef} from 'react';
import ViewportFit from './ViewportFit';
import './homeAbout.css';

export default function HomeAbout({lang}) {
  const ar=lang.lang==='ar';
  const tr=(en,arabic)=>ar?arabic:en;
  // Keep the About section entrance and social badge transitions.
  const sectionRef=useRef(null);
  const phase=useViewportPhase(sectionRef);
  const facts=[
    {value:'10+',label:tr('Years of experience','سنوات من الخبرة')},
    {value:tr('GTA','تورونتو'),label:tr('Toronto & the Greater Toronto Area','تورونتو ومنطقتها الكبرى')},
    {value:'2018',label:tr('Sound & Music Recording diploma','دبلوم تسجيل الصوت والموسيقى')},
  ];
  const svg={width:20,height:20,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.6,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true};
  const badges=[
    {key:'instagram',href:'https://www.instagram.com/khalil_nahhat/',label:'Instagram',handle:'@khalil_nahhat',icon:<svg {...svg}><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r=".6" fill="currentColor"/></svg>},
    {key:'youtube',href:'https://www.youtube.com/@djkhalilnahhat8943',label:'YouTube',handle:'@djkhalilnahhat8943',icon:<svg {...svg}><rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5v5l4.5-2.5z" fill="currentColor"/></svg>},
    {key:'email',href:`mailto:${contactEmail}`,label:tr('Email','البريد الإلكتروني'),handle:contactEmail,icon:<svg {...svg}><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>},
    {key:'anghami',href:'https://play.anghami.com/artist/6095441',label:'Anghami',handle:'Anghami',icon:<svg {...svg}><path d="M5 19 12 5l7 14"/><path d="M8.2 14h7.6"/></svg>},
  ];
  return <section id="about-dj-khalil" ref={sectionRef} className={`home-about viewport-fit-section${phase==='in'?' is-in':` is-away is-away-${phase}`}`} aria-labelledby="home-about-title" dir={ar?'rtl':'ltr'}>
    <ViewportFit><div className="home-about-copy">
      <header className="home-about-wrapper-heading"><p className="echo-eyebrow">06 / {tr('THE ARTIST','الفنان')}</p>
      <h2 id="home-about-title">{tr('About DJ Khalil','عن دي جي خليل')}</h2></header>
      <p className="home-about-story">{tr('Khalil Nahhat brings over a decade of DJ experience to Arabic and multicultural celebrations across the GTA, with Echo’s sound, lighting and visual production.', 'يقدّم خليل نحّات خبرة تتجاوز عشر سنوات في إحياء الاحتفالات العربية ومتعددة الثقافات في منطقة تورونتو الكبرى، مع إنتاج إيكو للصوت والإضاءة والمؤثرات المرئية.')}</p>
      <div className="home-about-facts">{facts.map(({value,label})=><div key={label}><strong dir="ltr">{value}</strong><span>{label}</span></div>)}</div>
      <div className="home-about-social" aria-label={tr('DJ Khalil online','دي جي خليل على الإنترنت')}>{badges.map(({key,href,label,handle,icon})=><a key={key} className={`home-about-badge is-${key}`} href={href} {...(href.startsWith('http')?{target:'_blank',rel:'noopener noreferrer'}:{})}>{icon}<span><small>{label}</small><strong dir="ltr">{handle}</strong></span></a>)}</div>
    </div></ViewportFit>
    <figure className="home-about-diploma">
      <a href="/echo/khalil-sound-music-recording-diploma.png" target="_blank" rel="noopener noreferrer" aria-label={tr('View Khalil Nahhat’s diploma at full size','عرض دبلوم خليل نحّات بالحجم الكامل')}><img src="/echo/khalil-sound-music-recording-diploma.png" width="1441" height="1091" alt={tr('Khalil Nahhat’s diploma in Sound and Music Recording from Recording Arts Canada, awarded August 29, 2018 in Toronto.', 'دبلوم خليل نحّات في تسجيل الصوت والموسيقى من Recording Arts Canada، مُنح في تورونتو في ٢٩ أغسطس ٢٠١٨.')} loading="lazy"/></a>
      <figcaption><strong>{tr('Sound and Music Recording','تسجيل الصوت والموسيقى')}</strong><span>{tr('Diploma · Recording Arts Canada','دبلوم · Recording Arts Canada')}</span><small>{tr('Toronto · August 29, 2018','تورونتو · ٢٩ أغسطس ٢٠١٨')}</small></figcaption>
    </figure>
  </section>;
}
