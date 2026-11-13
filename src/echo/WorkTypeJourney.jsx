import {useEffect,useRef} from 'react';
import {ArrowDown,ArrowUpRight} from 'lucide-react';
import './workTypeJourney.css';

const STORIES={
 MIX:{heading:'One mood. A seamless journey.',headingAr:'أجواء واحدة ورحلة موسيقية متصلة.',copy:'A mix brings complete tracks together through carefully timed transitions, building a flow that feels natural from the first song to the last. It is a great way to set the atmosphere for a reception, ease guests into the evening, or keep a dance floor moving. Explore how DJ Khalil connects different sounds while keeping the energy of the moment.',copyAr:'يجمع الميكس الأغاني الكاملة بانتقالات مدروسة لتنساب الموسيقى من البداية إلى النهاية. يناسب استقبال الضيوف وبداية السهرة والحفاظ على حيوية حلبة الرقص. اكتشف كيف يربط دي جي خليل بين الأصوات المختلفة ويحافظ على طاقة اللحظة.'},
 REMIX:{heading:'A familiar song. A fresh energy.',headingAr:'أغنية مألوفة بطاقة جديدة.',copy:'A remix reimagines a recording through a different beat, arrangement, or sound. The melody you know can take on a whole new feeling, from a relaxed groove to a dance floor moment. For clients who love recognisable songs with an unexpected twist, these collections offer a taste of how a favourite can become part of a new atmosphere.',copyAr:'يمنح الريمكس التسجيل إيقاعاً أو توزيعاً أو صوتاً مختلفاً. يمكن للحن الذي تعرفه أن يحمل إحساساً جديداً، من أجواء هادئة إلى لحظة تملأ حلبة الرقص. إذا كنت تحب الأغاني المألوفة بلمسة غير متوقعة، فهذه المجموعات تقدم لك تصوراً جديداً لأغنياتك المفضلة.'},
 MASHUP:{heading:'Unexpected connections. Shared excitement.',headingAr:'لقاءات غير متوقعة وحماس مشترك.',copy:'A mashup combines elements from separate recordings into one musical idea: perhaps a familiar vocal over an unexpected instrumental, or two favourites meeting in the same rhythm. Those moments of recognition can bring different tastes together. Listen for the combinations that could surprise your guests and give your celebration its own character.',copyAr:'يجمع الماش أب عناصر من تسجيلات مختلفة في فكرة موسيقية واحدة، مثل صوت مألوف فوق توزيع غير متوقع، أو أغنيتين محبوبتين تلتقيان على الإيقاع نفسه. تجمع لحظات التعرف هذه أذواقاً مختلفة. استمع إلى التوليفات التي قد تفاجئ ضيوفك وتمنح احتفالك طابعاً خاصاً.'},
 MEDLEY:{heading:'More favourites, woven into one moment.',headingAr:'أغنيات محبوبة تلتقي في لحظة واحدة.',copy:'A medley links selected passages from several songs into a connected performance. It gives the highlights room to shine without playing every song in full. This format can suit a themed celebration, a tribute to a favourite artist, or a lively sequence of songs that your guests know and love. Discover how one melody leads into the next.',copyAr:'يربط الميدلي مقاطع مختارة من عدة أغانٍ في أداء متصل، ليبرز أجمل اللحظات دون تشغيل كل أغنية كاملة. يناسب احتفالاً بطابع محدد أو تحية لفنان مفضل أو سلسلة حيوية من الأغاني التي يحبها ضيوفك. اكتشف كيف يقود كل لحن إلى اللحن التالي.'},
 COVER:{heading:'The song you love, with a different feeling.',headingAr:'أغنيتك المفضلة بإحساس مختلف.',copy:'A cover is a fresh interpretation of an existing song, shaped by a different performance or arrangement. It can bring warmth to a familiar melody or reveal a detail you had never noticed. If you are imagining a personal entrance, a quieter reception, or a meaningful musical moment, explore these interpretations for inspiration and share your favourites when planning your event.',copyAr:'الكوفر قراءة جديدة لأغنية موجودة بأداء أو توزيع مختلف. قد يمنح لحناً مألوفاً دفئاً جديداً أو يكشف تفصيلاً لم تنتبه إليه من قبل. إذا كنت تتخيل دخولاً مميزاً أو استقبالاً هادئاً أو لحظة موسيقية ذات معنى، استكشف هذه القراءات وشاركنا ما يعجبك عند التخطيط لحفلك.'},
 LIVE:{heading:'A little closer to the decks.',headingAr:'أقرب إلى أجواء الأداء.',copy:'Reels offer a short glimpse into the music: a transition, a performance clip, or a moment behind the decks. They are an easy place to start if you want to get a feel for DJ Khalil’s approach before exploring a longer collection. Watch, find the moments that speak to you, and use them to start a conversation about the atmosphere you want for your event.',copyAr:'تقدم الريلز لمحات قصيرة من الموسيقى، سواء كانت انتقالاً أو مقطع أداء أو لحظة من خلف الديكات. إنها بداية سهلة للتعرف على أسلوب دي جي خليل قبل استكشاف المجموعات الأطول. شاهد واختر اللحظات التي تعجبك واجعلها بداية للحديث عن الأجواء التي تريدها في حفلك.'},
};

// The six actual cards travel from overview slots to their own editorial rows.
// One downward gesture runs the entire sequence, then scrolls to the first story.
export default function WorkTypeJourney({ar,workTypes,renderCard,intro,onOpenWork}){
 const root=useRef(null),overview=useRef(null),origins=useRef([]),destinations=useRef([]),movers=useRef([]),begin=useRef(null);
 useEffect(()=>{
  const element=root.current;if(!element)return;
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0,animationFrame=0,handoffTimer=0,geometry=[],progress=0,mode='overview',frozenY=0,touchY=0,handingOff=false;
  const paint=()=>{
   frame=0;
   element.style.setProperty('--overview-progress',Math.min(1,progress*2));
   geometry.forEach(({from,to},index)=>{
    const node=movers.current[index];if(!node)return;
    const step=Math.min(1,Math.max(0,(progress-index*.105)/.475));
    const eased=step*step*(3-2*step);
    node.classList.toggle('has-landed',step===1);
    const size=from.width+(to.width-from.width)*eased;
    node.style.transform=`translate3d(${from.x+(to.x-from.x)*eased}px,${from.y+(to.y-from.y)*eased}px,0)`;
    node.style.setProperty('--card',`${size}px`);
   });
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(paint);};
  const measure=()=>{
   const bounds=element.getBoundingClientRect();
   const box=node=>{const rect=node.getBoundingClientRect();return {x:rect.left-bounds.left,y:rect.top-bounds.top,width:rect.width};};
   geometry=workTypes.map((_,index)=>({from:box(origins.current[index]),to:box(destinations.current[index])}));
   element.dataset.measured='true';schedule();
  };
  const finish=()=>{
   mode='expanded';progress=1;handingOff=true;paint();
   element.dataset.phase='expanded';
   element.querySelector('.work-story')?.scrollIntoView({block:'center',behavior:media.matches?'instant':'smooth'});
   handoffTimer=window.setTimeout(()=>{handingOff=false;},1200);
  };
  const launch=()=>{
   if(mode!=='overview')return;
   mode='expanding';frozenY=window.scrollY;element.dataset.phase='expanding';
   if(media.matches){finish();return;}
   const started=performance.now();
   const animate=now=>{
    progress=Math.min(1,(now-started)/2200);paint();
    if(progress<1)animationFrame=requestAnimationFrame(animate);else finish();
   };
   animationFrame=requestAnimationFrame(animate);
  };
  begin.current=launch;
  const atOpening=()=>window.scrollY<=Math.max(32,element.getBoundingClientRect().top+window.scrollY);
  const wheel=event=>{
   if(event.ctrlKey)return;
   if(mode==='expanding'||handingOff){event.preventDefault();return;}
   if(mode==='overview'&&atOpening()&&event.deltaY>0&&Math.abs(event.deltaY)>=Math.abs(event.deltaX)&&!event.ctrlKey){event.preventDefault();launch();}
  };
  const touchStart=event=>{touchY=event.touches[0]?.clientY||0;};
  const touchMove=event=>{
   if(mode==='expanding'||handingOff){event.preventDefault();return;}
   if(mode==='overview'&&atOpening()&&touchY-(event.touches[0]?.clientY||0)>12){event.preventDefault();launch();}
  };
  const keyDown=event=>{
   if(event.target.closest('input,textarea,select,button,a,[role=button],[contenteditable=true]'))return;
   if(['ArrowDown','PageDown',' '].includes(event.key)&&(mode==='expanding'||handingOff||mode==='overview'&&atOpening())){event.preventDefault();launch();}
  };
  const scroll=()=>{
   if(mode==='expanding'&&Math.abs(window.scrollY-frozenY)>.5){window.scrollTo({top:frozenY,behavior:'instant'});return;}
   if(mode==='overview'&&window.scrollY>element.getBoundingClientRect().top+window.scrollY+32){mode='expanded';progress=1;element.dataset.phase='expanded';schedule();}
   if(mode==='expanded'&&!handingOff&&window.scrollY<=2){mode='overview';progress=0;element.dataset.phase='overview';schedule();}
  };
  const motionChange=()=>{if(media.matches&&mode==='expanding'){cancelAnimationFrame(animationFrame);finish();}};
  const resize=new ResizeObserver(measure);resize.observe(overview.current);
  destinations.current.forEach(node=>node&&resize.observe(node));
  const reveal=new IntersectionObserver(entries=>entries.forEach(entry=>{
   entry.target.classList.toggle('is-visible',entry.isIntersecting);
   movers.current[Number(entry.target.dataset.index)]?.classList.toggle('is-visible',entry.isIntersecting);
  }),{threshold:.18});
  element.querySelectorAll('.work-story').forEach(node=>reveal.observe(node));
  window.addEventListener('wheel',wheel,{passive:false});window.addEventListener('touchstart',touchStart,{passive:true});window.addEventListener('touchmove',touchMove,{passive:false});
  window.addEventListener('keydown',keyDown);window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('resize',measure);media.addEventListener('change',motionChange);
  // Restore the finished layout if the browser restores a deeper scroll position.
  if(window.scrollY>element.getBoundingClientRect().top+window.scrollY){mode='expanded';progress=1;}
  measure();
  return()=>{
   cancelAnimationFrame(frame);cancelAnimationFrame(animationFrame);clearTimeout(handoffTimer);resize.disconnect();reveal.disconnect();begin.current=null;
   window.removeEventListener('wheel',wheel);window.removeEventListener('touchstart',touchStart);window.removeEventListener('touchmove',touchMove);window.removeEventListener('keydown',keyDown);window.removeEventListener('scroll',scroll);window.removeEventListener('resize',measure);media.removeEventListener('change',motionChange);
  };
 },[workTypes]);
 return <div className="work-type-journey" ref={root}>
  <div className="home-work-showcase work-journey-overview" ref={overview}>
   {intro}
   <div className="glow-cards work-overview-slots" aria-hidden="true">{workTypes.map((work,index)=><div className="work-overview-slot" key={work.id} ref={node=>{origins.current[index]=node;}}/>)}</div>
   <a className="work-journey-scroll" href="#work-story-first" onClick={event=>{event.preventDefault();begin.current?.();}}><span>{ar?'انزل لتكتشف كل نوع':'Scroll to discover each sound'}</span><ArrowDown size={18}/></a>
  </div>
  <div className="work-stories">{workTypes.map((work,index)=>{
   const story=STORIES[work.id],name=work.id==='LIVE'?(ar?'ريلز':'Reels'):(ar?(work.nameArabic||work.name):work.name);
   return <section key={work.id} id={index===0?'work-story-first':`work-story-${work.id.toLowerCase()}`} data-index={index} className={`work-story${index%2?' is-card-right':''}`} aria-labelledby={`work-story-title-${work.id}`}>
    <div className="work-story-card-slot" aria-hidden="true" ref={node=>{destinations.current[index]=node;}}/>
    <div className="work-story-copy" id={`work-story-copy-${work.id}`}>
     <span className="work-story-number">{String(index+1).padStart(2,'0')} / {name}</span>
     <h3 id={`work-story-title-${work.id}`}>{story?(ar?story.headingAr:story.heading):name}</h3>
     <p id={`work-story-description-${work.id}`}>{story?(ar?story.copyAr:story.copy):(ar?work.detailsArabic:work.details)}</p>
     {onOpenWork&&<button type="button" className="work-story-listen" onClick={()=>onOpenWork(work.id)}>{ar?`استكشف ${name}`:`Explore ${name}`}<ArrowUpRight size={18}/></button>}
    </div>
   </section>;
  })}</div>
  <div className="work-journey-cards">{workTypes.map((work,index)=><div className={`work-card-mover${index%2?' is-from-right':''}`} style={{'--arrival-delay':`${index*90}ms`}} key={work.id} ref={node=>{movers.current[index]=node;}}>{renderCard(work,index)}</div>)}</div>
 </div>;
}
