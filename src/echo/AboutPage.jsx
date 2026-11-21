import {useEffect,useRef} from 'react';
import {Award,Disc3,Lightbulb,Mic2,MonitorPlay,ArrowRight,ArrowLeft} from 'lucide-react';
import InstagramProfileCard from './InstagramProfileCard';
import YouTubeSubscribe from './YouTubeSubscribe';
import AnghamiFollow from './AnghamiFollow';
import {contactEmail} from '../lib/publicContact';
import './aboutPage.css';

// About page, built from scratch as a normal scrolling page (no viewport-fit scaling): hero, facts, what Echo does,
// the studio, credentials, where to follow, and a booking call to action. Content comes from the site's existing copy.
// The Instagram card is a separate component (its own file/styles) and is only placed in its slot here.
const svg={width:22,height:22,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.6,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true};

export default function AboutPage({lang}){
 const ar=lang.lang==='ar',tr=(en,arabic)=>ar?arabic:en,root=useRef(null);
 const Arrow=ar?ArrowLeft:ArrowRight;

 // Reveal each block once as it scrolls into view (one-way, so nothing flickers).
 useEffect(()=>{
  const nodes=[...root.current.querySelectorAll('[data-reveal]')];
  if(!('IntersectionObserver' in window)){nodes.forEach(node=>{node.dataset.visible='1';});return undefined;}
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;entry.target.dataset.visible='1';observer.unobserve(entry.target);}),{threshold:.15,rootMargin:'0px 0px -6% 0px'});
  nodes.forEach(node=>observer.observe(node));
  return()=>observer.disconnect();
 },[]);

 const facts=[
  {value:'10+',label:tr('Years of experience','سنوات من الخبرة'),note:tr('Behind the decks at Arabic and multicultural celebrations.','خلف الديكات في الاحتفالات العربية ومتعددة الثقافات.')},
  {value:tr('GTA','تورونتو'),label:tr('Toronto & the Greater Toronto Area','تورونتو ومنطقتها الكبرى'),note:tr('Weddings, engagements and parties across the region.','حفلات زفاف وخطوبة ومناسبات في المنطقة كلها.')},
  {value:'2018',label:tr('Sound & Music Recording diploma','دبلوم تسجيل الصوت والموسيقى'),note:tr('Trained at Recording Arts Canada in Toronto.','تدريب في Recording Arts Canada في تورونتو.')},
 ];
 const offers=[
  {Icon:Disc3,title:tr('A DJ who reads the room','دي جي يقرأ أجواء القاعة'),text:tr('Arabic and multicultural sets that follow your guests: from the first dance to the last song, with transitions that keep the floor moving.','أغانٍ عربية ومتعددة الثقافات تتبع ضيوفك: من الرقصة الأولى حتى آخر أغنية، وانتقالات تُبقي الحلبة حيّة.')},
  {Icon:Mic2,title:tr('MC hosting when you need a voice','تقديم حيّ عندما تحتاج إلى صوت'),text:tr('Announcements, introductions and moments of ceremony, delivered in the languages your family speaks.','إعلانات وتقديمات ولحظات رسمية، بلغات عائلتك.')},
  {Icon:Lightbulb,title:tr('Sound and lighting to match','صوت وإضاءة تناسب المناسبة'),text:tr('Echo supplies the sound system, lighting and effects, so the music and the room are designed together.','تؤمّن إيكو نظام الصوت والإضاءة والمؤثرات، فتُصمَّم الموسيقى والقاعة معاً.')},
  {Icon:MonitorPlay,title:tr('LED walls and visuals','شاشات LED ومؤثرات بصرية'),text:tr('Visual production that gives the night a backdrop, from monograms to live moments on screen.','إنتاج بصري يمنح الليلة خلفية، من الأحرف الأولى إلى اللحظات المباشرة على الشاشة.')},
 ];
 const links=[
  {key:'email',href:`mailto:${contactEmail}`,label:tr('Email','البريد الإلكتروني'),handle:contactEmail,icon:<svg {...svg}><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>},
 ];

 return <div className="ab-page" ref={root} dir={ar?'rtl':'ltr'}>
  <div className="ab-backdrop" aria-hidden="true"/>
  <section className="ab-hero ab-wrap" aria-labelledby="ab-title">
   <div className="ab-hero-copy" data-reveal>
    <p className="ab-kicker">{tr('About','من نحن')}</p>
    <h1 id="ab-title" className="ab-title">{ar?<>خليل نحّات<span>دي جي · مقدّم · صوت وإضاءة</span></>:<>Khalil Nahhat<span>DJ · MC · Sound & Lighting</span></>}</h1>
    <p className="ab-lede">{tr('Over a decade of DJ experience, bringing Arabic and multicultural celebrations to life across the GTA, with Echo’s sound, lighting and visual production behind every night.','أكثر من عشر سنوات من خبرة الدي جي، نُحيي فيها الاحتفالات العربية ومتعددة الثقافات في منطقة تورونتو الكبرى، مع إنتاج إيكو للصوت والإضاءة والمرئيات في كل ليلة.')}</p>
    <div className="ab-actions">
     <a className="ab-button is-primary" href="/echo-ai">{tr('Plan your event','خطّط لمناسبتك')}<Arrow size={18} aria-hidden="true"/></a>
     <a className="ab-button" href="/music">{tr('Hear the music','استمع إلى الموسيقى')}</a>
    </div>
   </div>
   <figure className="ab-hero-art" data-reveal aria-hidden="false">
    <img src={ar?'/echo/rentals-hero-khalil-rtl.webp':'/echo/rentals-hero-khalil.webp'} width="680" height="1444" alt={tr('DJ Khalil with headphones around his neck','دي جي خليل وسماعاته حول رقبته')} fetchPriority="high"/>
   </figure>
  </section>

  <section className="ab-facts ab-wrap" aria-label={tr('DJ Khalil in numbers','دي جي خليل بالأرقام')}>
   {facts.map(({value,label,note})=><article className="ab-fact" key={label} data-reveal><strong dir="ltr">{value}</strong><h3>{label}</h3><p>{note}</p></article>)}
  </section>

  <section className="ab-section ab-wrap" aria-labelledby="ab-offer-title">
   <header className="ab-head" data-reveal>
    <p className="ab-kicker">{tr('What Echo brings','ماذا تقدّم إيكو')}</p>
    <h2 id="ab-offer-title">{tr('One team for the music, the voice and the room.','فريق واحد للموسيقى والصوت والقاعة.')}</h2>
   </header>
   <div className="ab-offers">
    {offers.map(({Icon,title,text},index)=><article className="ab-offer" key={title} data-reveal style={{'--delay':`${index*80}ms`}}>
     <span className="ab-offer-icon" aria-hidden="true"><Icon size={26} strokeWidth={1.6}/></span>
     <h3>{title}</h3><p>{text}</p>
    </article>)}
   </div>
  </section>

  <section className="ab-studio" aria-labelledby="ab-studio-title">
   <div className="ab-studio-media" data-reveal>
    <img src="/echo/dj-khalil-studio-3d.webp" width="1536" height="1024" loading="lazy" alt={tr('Illustration of a DJ studio with monitors, speakers and a mixer.','رسم تعبيري لاستوديو دي جي بشاشات وسمّاعات ومازج.')}/>
   </div>
   <div className="ab-studio-copy ab-wrap">
    <div data-reveal>
     <p className="ab-kicker">{tr('Echo Event Entertainment','إيكو للترفيه والفعاليات')}</p>
     <h2 id="ab-studio-title">{tr('Entertainment with impact. Production with precision.','ترفيه بتأثير. وإنتاج بدقّة.')}</h2>
     <p>{tr('One team, one show, total impact: every event is planned around your guests, your languages and your venue.','فريق واحد، عرض واحد، تأثير كامل: نخطّط كل مناسبة حول ضيوفك ولغاتك وقاعتك.')}</p>
    </div>
   </div>
  </section>

  <section className="ab-section ab-wrap ab-credential" aria-labelledby="ab-credential-title">
   <figure className="ab-diploma" data-reveal>
    <img src="/echo/khalil-sound-music-recording-diploma.png" width="1441" height="1091" loading="lazy" alt={tr('Khalil Nahhat’s diploma in Sound and Music Recording from Recording Arts Canada, awarded August 29, 2018 in Toronto.','دبلوم خليل نحّات في تسجيل الصوت والموسيقى من Recording Arts Canada، مُنح في تورونتو في ٢٩ أغسطس ٢٠١٨.')}/>
   </figure>
   <div className="ab-credential-copy" data-reveal>
    <span className="ab-seal" aria-hidden="true"><Award size={28} strokeWidth={1.5}/></span>
    <p className="ab-kicker">{tr('Credentials','المؤهلات')}</p>
    <h2 id="ab-credential-title">{tr('Trained in sound and music recording.','متدرّب في تسجيل الصوت والموسيقى.')}</h2>
    <p>{tr('Khalil holds a diploma in Sound and Music Recording from Recording Arts Canada, awarded in Toronto on August 29, 2018: the technical foundation behind how every set, mix and room sounds.','يحمل خليل دبلوماً في تسجيل الصوت والموسيقى من Recording Arts Canada، مُنح في تورونتو في ٢٩ أغسطس ٢٠١٨: الأساس التقني لصوت كل مجموعة وكل مزج وكل قاعة.')}</p>
   </div>
  </section>

  <section className="ab-section ab-wrap ab-follow" aria-labelledby="ab-follow-title">
   <header className="ab-head" data-reveal>
    <p className="ab-kicker">{tr('Follow along','تابع الجديد')}</p>
    <h2 id="ab-follow-title">{tr('Hear it, watch it, say hello.','استمع، شاهد، وتواصل.')}</h2>
   </header>
   <div className="ab-cards" data-reveal>
    <YouTubeSubscribe ar={ar}/>
    <AnghamiFollow ar={ar}/>
    <div className="ab-instagram"><InstagramProfileCard ar={ar}/></div>
   </div>
   <ul className="ab-links" aria-label={tr('DJ Khalil online','دي جي خليل على الإنترنت')} data-reveal>
    {links.map(({key,href,label,handle,icon})=><li key={key}><a className={`ab-link is-${key}`} href={href} {...(href.startsWith('http')?{target:'_blank',rel:'noopener noreferrer'}:{})}>{icon}<span><small>{label}</small><strong dir="ltr">{handle}</strong></span><Arrow size={18} aria-hidden="true"/></a></li>)}
   </ul>
  </section>

  <section className="ab-cta ab-wrap" aria-labelledby="ab-cta-title" data-reveal>
   <h2 id="ab-cta-title">{tr('Planning an event in the GTA?','تخطّط لمناسبة في تورونتو الكبرى؟')}</h2>
   <p>{tr('Tell us about your celebration and we’ll shape the music, the sound and the lighting around it.','أخبرنا عن احتفالك وسنصمّم الموسيقى والصوت والإضاءة حوله.')}</p>
   <div className="ab-actions">
    <a className="ab-button is-primary" href="/echo-ai">{tr('Plan with Echo AI','خطّط مع إيكو AI')}<Arrow size={18} aria-hidden="true"/></a>
    <a className="ab-button" href="/booking">{tr('Check availability','تحقّق من التوفّر')}</a>
    <a className="ab-button" href="/contact">{tr('Contact us','تواصل معنا')}</a>
   </div>
  </section>
 </div>;
}
