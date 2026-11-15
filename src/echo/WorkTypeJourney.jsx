import {useEffect,useRef,useState} from 'react';
import {readArchivePlayerState,subscribeArchivePlayerState} from '../lib/archivePlayerBridge';
import {ArrowDown,ArrowUp} from 'lucide-react';
import './workTypeJourney.css';

const STORIES={
 MIX:{heading:'One mood. A seamless journey.',headingAr:'أجواء واحدة ورحلة موسيقية متصلة.',copy:'A mix brings complete tracks together through carefully timed transitions, building a flow that feels natural from the first song to the last. It is a great way to set the atmosphere for a reception, ease guests into the evening, or keep a dance floor moving. Explore how DJ Khalil connects different sounds while keeping the energy of the moment.',copyAr:'يجمع الميكس الأغاني الكاملة بانتقالات مدروسة لتنساب الموسيقى من البداية إلى النهاية. يناسب استقبال الضيوف وبداية السهرة والحفاظ على حيوية حلبة الرقص. اكتشف كيف يربط دي جي خليل بين الأصوات المختلفة ويحافظ على طاقة اللحظة.'},
 REMIX:{heading:'A familiar song. A fresh energy.',headingAr:'أغنية مألوفة بطاقة جديدة.',copy:'A remix reimagines a recording through a different beat, arrangement, or sound. The melody you know can take on a whole new feeling, from a relaxed groove to a dance floor moment. For clients who love recognisable songs with an unexpected twist, these collections offer a taste of how a favourite can become part of a new atmosphere.',copyAr:'يمنح الريمكس التسجيل إيقاعاً أو توزيعاً أو صوتاً مختلفاً. يمكن للحن الذي تعرفه أن يحمل إحساساً جديداً، من أجواء هادئة إلى لحظة تملأ حلبة الرقص. إذا كنت تحب الأغاني المألوفة بلمسة غير متوقعة، فهذه المجموعات تقدم لك تصوراً جديداً لأغنياتك المفضلة.'},
 MASHUP:{heading:'Unexpected connections. Shared excitement.',headingAr:'لقاءات غير متوقعة وحماس مشترك.',copy:'A mashup combines elements from separate recordings into one musical idea: perhaps a familiar vocal over an unexpected instrumental, or two favourites meeting in the same rhythm. Those moments of recognition can bring different tastes together. Listen for the combinations that could surprise your guests and give your celebration its own character.',copyAr:'يجمع الماش أب عناصر من تسجيلات مختلفة في فكرة موسيقية واحدة، مثل صوت مألوف فوق توزيع غير متوقع، أو أغنيتين محبوبتين تلتقيان على الإيقاع نفسه. تجمع لحظات التعرف هذه أذواقاً مختلفة. استمع إلى التوليفات التي قد تفاجئ ضيوفك وتمنح احتفالك طابعاً خاصاً.'},
 MEDLEY:{heading:'More favourites, woven into one moment.',headingAr:'أغنيات محبوبة تلتقي في لحظة واحدة.',copy:'A medley links selected passages from several songs into a connected performance. It gives the highlights room to shine without playing every song in full. This format can suit a themed celebration, a tribute to a favourite artist, or a lively sequence of songs that your guests know and love. Discover how one melody leads into the next.',copyAr:'يربط الميدلي مقاطع مختارة من عدة أغانٍ في أداء متصل، ليبرز أجمل اللحظات دون تشغيل كل أغنية كاملة. يناسب احتفالاً بطابع محدد أو تحية لفنان مفضل أو سلسلة حيوية من الأغاني التي يحبها ضيوفك. اكتشف كيف يقود كل لحن إلى اللحن التالي.'},
 COVER:{heading:'The song you love, with a different feeling.',headingAr:'أغنيتك المفضلة بإحساس مختلف.',copy:'A cover is a fresh interpretation of an existing song, shaped by a different performance or arrangement. It can bring warmth to a familiar melody or reveal a detail you had never noticed. If you are imagining a personal entrance, a quieter reception, or a meaningful musical moment, explore these interpretations for inspiration and share your favourites when planning your event.',copyAr:'الكوفر قراءة جديدة لأغنية موجودة بأداء أو توزيع مختلف. قد يمنح لحناً مألوفاً دفئاً جديداً أو يكشف تفصيلاً لم تنتبه إليه من قبل. إذا كنت تتخيل دخولاً مميزاً أو استقبالاً هادئاً أو لحظة موسيقية ذات معنى، استكشف هذه القراءات وشاركنا ما يعجبك عند التخطيط لحفلك.'},
 LIVE:{heading:'A little closer to the decks.',headingAr:'أقرب إلى أجواء الأداء.',copy:'Reels offer a short glimpse into the music: a transition, a performance clip, or a moment behind the decks. They are an easy place to start if you want to get a feel for DJ Khalil’s approach before exploring a longer collection. Watch, find the moments that speak to you, and use them to start a conversation about the atmosphere you want for your event.',copyAr:'تقدم الريلز لمحات قصيرة من الموسيقى، سواء كانت انتقالاً أو مقطع أداء أو لحظة من خلف الديكات. إنها بداية سهلة للتعرف على أسلوب دي جي خليل قبل استكشاف المجموعات الأطول. شاهد واختر اللحظات التي تعجبك واجعلها بداية للحديث عن الأجواء التي تريدها في حفلك.'},
};

// Music page journey, rebuilt from scratch on plain native scrolling: a column of sections (the overview, then one
// full-height story per sound). There is no scroll manager at all: no wheel/touch/key handling, no scripted
// scroll animation and no snapping, so nothing can fight the scroll position or flicker. JS only reveals each
// story once and plays the card→player entry. A taller-than-screen section simply scrolls.
export default function WorkTypeJourney({ar,workTypes,renderCard:renderWorkCard,intro,onOpenWork,activeType}){
 const root=useRef(null);
 const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const backToTop=()=>window.scrollTo({top:0,behavior:reduced()?'auto':'smooth'});
 // While a track plays in a box, that box's screen turns into a moving blend of the box's rim colours.
 const [playing,setPlaying]=useState(()=>Boolean(readArchivePlayerState().playing));
 useEffect(()=>subscribeArchivePlayerState(event=>setPlaying(Boolean(event.detail?.playing))),[]);
 // A card in the overview scrolls down to its own sound's screen and opens the player there; a card in a story opens in place.
 const goToStory=work=>{
  const target=root.current?.querySelector(`.work-story[data-work="${work.id}"]`);
  if(!target){onOpenWork?.(work.id);return;}
  const open=()=>onOpenWork?.(work.id);
  if(reduced()){target.scrollIntoView({block:'start'});open();return;}
  target.scrollIntoView({behavior:'smooth',block:'start'});
  const done=()=>{window.removeEventListener('scrollend',done);clearTimeout(timer);open();};
  const timer=setTimeout(done,1200);window.addEventListener('scrollend',done,{once:true});
 };
 const renderCard=(work,index,story=false)=>renderWorkCard(work,index,{active:story&&activeType===work.id,onOpen:story?()=>onOpenWork?.(work.id):()=>goToStory(work)});

 // A player that is open owns the screen: its section is aligned fully into view and the page cannot scroll until the player is closed (back).
 useEffect(()=>{
  if(!activeType)return undefined;
  const target=root.current?.querySelector(`.work-story[data-work="${activeType}"]`);
  target?.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'start'});
  const html=document.documentElement;html.classList.add('echo-work-locked');
  return()=>html.classList.remove('echo-work-locked');
 },[activeType]);

 // Reveal each story once. One-way (never toggled back off), so scrolling up and down cannot flicker it.
 useEffect(()=>{
  const element=root.current;if(!element)return undefined;
  const reveal=new IntersectionObserver(entries=>entries.forEach(entry=>{
   if(!entry.isIntersecting)return;
   entry.target.dataset.visible='1';reveal.unobserve(entry.target);
  }),{threshold:.2});
  element.querySelectorAll('.work-story').forEach(node=>reveal.observe(node));
  return()=>reveal.disconnect();
 },[workTypes]);

 return <div className="work-type-journey" ref={root}>
  <section className="home-work-showcase work-journey-overview" aria-label={ar?'أعمال دي جي خليل':'DJ Khalil’s work'}>
   <div className="work-overview-intro">
    <div className="work-overview-portrait" aria-hidden="true"><img src="/echo/music-hero-khalil.webp" alt="" width="1162" height="1014" fetchPriority="high"/></div>
    {intro}
   </div>
   <div className="glow-cards work-overview-slots">{workTypes.map((work,index)=><div className="work-overview-slot" key={work.id}><div className="work-card-mover">{renderCard(work,index)}</div></div>)}</div>
   <a className="work-journey-scroll" href="#work-story-first" onClick={event=>{event.preventDefault();document.getElementById('work-story-first')?.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'start'});}}><span>{ar?'انزل لتكتشف كل نوع':'Scroll to discover each sound'}</span><ArrowDown size={18}/></a>
  </section>
  <div className="work-stories">{workTypes.map((work,index)=>{
   const story=STORIES[work.id],name=work.id==='LIVE'?(ar?'ريلز':'Reels'):(ar?(work.nameArabic||work.name):work.name);
   return <section key={work.id} data-work={work.id} data-tone={index%6} id={index===0?'work-story-first':`work-story-${work.id.toLowerCase()}`} className={`work-story${index%2?' is-card-right':''}${playing&&activeType===work.id?' is-playing':''}`} aria-labelledby={`work-story-title-${work.id}`}>
    <div className="work-story-card-slot"><div className="work-story-card">{renderCard(work,index,true)}</div></div>
    <div className="work-story-copy" id={`work-story-copy-${work.id}`}>
     <span className="work-story-number">{String(index+1).padStart(2,'0')} / {name}</span>
     <h3 id={`work-story-title-${work.id}`}>{story?(ar?story.headingAr:story.heading):name}</h3>
     <p id={`work-story-description-${work.id}`}>{story?(ar?story.copyAr:story.copy):(ar?work.detailsArabic:work.details)}</p>
     <button type="button" className="work-story-listen" onClick={backToTop}>{ar?'العودة إلى الأعلى':'Back to top'}<ArrowUp size={18}/></button>
    </div>
   </section>;
  })}</div>
 </div>;
}
