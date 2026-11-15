import {useEffect,useLayoutEffect,useRef} from 'react';
import {ArrowDown,ArrowUpRight} from 'lucide-react';
import './workTypeJourney.css';
import {createViewportScroller} from './viewportScroller';

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
export default function WorkTypeJourney({ar,workTypes,renderCard,intro,onOpenWork,activeType}){
 const root=useRef(null),overview=useRef(null),origins=useRef([]),destinations=useRef([]),movers=useRef([]),begin=useRef(null);
 useLayoutEffect(()=>{
  const element=root.current;
  if(!element||!activeType||element.dataset.phase==='expanded'||element.dataset.phase==='expanding')return;
  const scene=overview.current.getBoundingClientRect();
  if(scene.bottom<=0||scene.top>=window.innerHeight)return;
  const zoom=parseFloat(getComputedStyle(document.documentElement).zoom)||1;
  const selected=workTypes.findIndex(work=>work.id===activeType);
  if(selected<0)return;
  element.dataset.playerScene='overview';
  const moverNodes=[...movers.current];
  moverNodes.forEach((node,index)=>{
   if(!node)return;
   const rect=origins.current[index].getBoundingClientRect();
   node.classList.add(index===selected?'is-vp1-selected':'is-vp1-exiting');
   if(index===selected){
    node.style.setProperty('--player-center-x',`${(scene.left+scene.width/2-rect.left-rect.width/2)/zoom}px`);
    node.style.setProperty('--player-center-y',`${(scene.top+scene.height/2-rect.top-rect.height/2)/zoom}px`);
   }else{
    const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
    node.style.setProperty('--player-exit-x',`${(cx<window.innerWidth/2?-rect.right-100:window.innerWidth-rect.left+100)/zoom}px`);
    node.style.setProperty('--player-exit-y',`${(cy<scene.top+scene.height/2?-window.innerHeight:window.innerHeight)/zoom}px`);
    node.style.setProperty('--player-exit-delay',`${index*.03}s`);
    node.inert=true;
   }
  });
  const block=event=>{if(!event.target.closest?.('.wp'))event.preventDefault();};
  const blockKey=event=>{if(['ArrowDown','ArrowUp','PageDown','PageUp',' ','Home','End'].includes(event.key)&&!event.target.closest?.('button,a,input,textarea,select,.wp'))event.preventDefault();};
  window.addEventListener('wheel',block,{passive:false});
  window.addEventListener('touchmove',block,{passive:false});
  window.addEventListener('keydown',blockKey);
  return()=>{
   delete element.dataset.playerScene;
   moverNodes.forEach(node=>{if(node){node.classList.remove('is-vp1-selected','is-vp1-exiting');node.inert=false;}});
   window.removeEventListener('wheel',block);window.removeEventListener('touchmove',block);window.removeEventListener('keydown',blockKey);
  };
 },[activeType,workTypes]);
 useEffect(()=>{
  const element=root.current;if(!element)return;
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const portrait=window.matchMedia('(orientation:portrait)');
  const ipadPortrait=()=>document.documentElement.classList.contains('echo-ipad')&&portrait.matches;
  const gestureBlocked=()=>element.dataset.playerScene==='overview'||Boolean(document.querySelector('dialog[open]'));
  const stories=[...element.querySelectorAll('.work-story')];
  let frame=0,animationFrame=0,handoffTimer=0,geometry=[],progress=0,mode='overview',frozenY=0,touch=null,handingOff=false;
  const scroller=createViewportScroller({
   read:()=>window.scrollY,write:top=>window.scrollTo({top,behavior:'instant'}),
   requestFrame:requestAnimationFrame,cancelFrame:cancelAnimationFrame,now:()=>performance.now(),
   viewportHeight:()=>window.innerHeight,reducedMotion:()=>media.matches,
   blocked:gestureBlocked,
   onFinish:()=>{handingOff=false;},
  });
  const destination=index=>{
   if(index===0)return 0;
   const story=stories[index-1],header=document.querySelector('.echo-header');
   const style=header&&getComputedStyle(header),headerOffset=style&&['fixed','sticky'].includes(style.position)?header.getBoundingClientRect().bottom:0;
   const top=story.getBoundingClientRect().top+window.scrollY-headerOffset;
   return Math.min(document.documentElement.scrollHeight-window.innerHeight,Math.max(0,top));
  };
  const moveTo=index=>{handingOff=true;if(!scroller.navigate(()=>destination(index)))handingOff=false;};
  const stepStory=direction=>{
   const positions=[0,...stories.map((_,index)=>destination(index+1))];
   const current=positions.reduce((nearest,top,index)=>Math.abs(top-window.scrollY)<Math.abs(positions[nearest]-window.scrollY)?index:nearest,0);
   const next=Math.max(0,Math.min(stories.length,current+direction));
   if(next===current)return false;
   stories[next-1]?.classList.add('has-been-visible');
   moveTo(next);return true;
  };
  const paint=()=>{
   frame=0;
   element.style.setProperty('--overview-progress',Math.min(1,progress*2));
   // Resting text stays in normal layout, aligned to the device's pixel grid.
   const zoom=parseFloat(getComputedStyle(document.documentElement).zoom)||1;
   const pixel=zoom*(window.devicePixelRatio||1);
   const snap=value=>Math.round(value*pixel)/pixel;
   geometry.forEach(({from,to},index)=>{
    const node=movers.current[index];if(!node)return;
    const step=Math.min(1,Math.max(0,(progress-index*.105)/.475));
    const eased=step*step*(3-2*step);
    node.classList.toggle('has-landed',step===1);
    const size=snap(from.width+(to.width-from.width)*eased);
    node.style.left=`${snap(from.x+(to.x-from.x)*eased)}px`;
    node.style.top=`${snap(from.y+(to.y-from.y)*eased)}px`;
    node.style.setProperty('--card',`${size}px`);
   });
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(paint);};
  const measure=()=>{
   const bounds=element.getBoundingClientRect();
   // html{zoom:.9} makes rects visual pixels; the movers are positioned in the zoomed page's own pixels, so convert back.
   const zoom=parseFloat(getComputedStyle(document.documentElement).zoom)||1;
   const box=node=>{const rect=node.getBoundingClientRect();return {x:(rect.left-bounds.left)/zoom,y:(rect.top-bounds.top)/zoom,width:rect.width/zoom};};
   geometry=workTypes.map((_,index)=>({from:box(origins.current[index]),to:box(destinations.current[index])}));
   element.dataset.measured='true';schedule();
  };
  const finish=()=>{
   mode='expanded';progress=1;handingOff=true;paint();
   element.dataset.phase='expanded';
   if(ipadPortrait())moveTo(1);
   else{
    stories[0]?.scrollIntoView({block:'center',behavior:media.matches?'instant':'smooth'});
    handoffTimer=window.setTimeout(()=>{handingOff=false;},1200);
   }
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
   if(event.ctrlKey||gestureBlocked()||event.target.closest?.('.wp'))return;
   if(mode==='expanding'||handingOff){event.preventDefault();return;}
   if(ipadPortrait()&&mode==='expanded'&&Math.abs(event.deltaY)>12&&Math.abs(event.deltaY)>Math.abs(event.deltaX)&&stepStory(Math.sign(event.deltaY))){event.preventDefault();return;}
   if(mode==='overview'&&atOpening()&&event.deltaY>0&&Math.abs(event.deltaY)>=Math.abs(event.deltaX)&&!event.ctrlKey){event.preventDefault();launch();}
  };
  const touchStart=event=>{touch=event.touches.length===1&&!gestureBlocked()&&!event.target.closest?.('.wp')?{x:event.touches[0].clientX,y:event.touches[0].clientY,handled:false}:null;};
  const touchMove=event=>{
   if(event.touches.length!==1||!touch)return;
   if(touch.handled){event.preventDefault();return;}
   if(mode==='expanding'||handingOff){event.preventDefault();return;}
   const dy=touch.y-event.touches[0].clientY,dx=touch.x-event.touches[0].clientX;
   if(Math.abs(dy)<=Math.abs(dx))return;
   if(ipadPortrait()&&mode==='expanded'&&Math.abs(dy)>24&&stepStory(Math.sign(dy))){touch.handled=true;event.preventDefault();return;}
   if(mode==='overview'&&atOpening()&&dy>12){touch.handled=true;event.preventDefault();launch();}
  };
  const touchEnd=()=>{touch=null;};
  const keyDown=event=>{
   if(gestureBlocked())return;
   if(event.target.closest('input,textarea,select,button,a,[role=button],[contenteditable=true]'))return;
   if(ipadPortrait()&&mode==='expanded'&&['ArrowDown','PageDown',' ','ArrowUp','PageUp'].includes(event.key)){
    event.preventDefault();if(!handingOff)stepStory(['ArrowUp','PageUp'].includes(event.key)||event.key===' '&&event.shiftKey?-1:1);return;
   }
   if(['ArrowDown','PageDown',' '].includes(event.key)&&(mode==='expanding'||handingOff||mode==='overview'&&atOpening())){event.preventDefault();launch();}
  };
  const scroll=()=>{
   if(mode==='expanding'&&Math.abs(window.scrollY-frozenY)>.5){window.scrollTo({top:frozenY,behavior:'instant'});return;}
   if(mode==='overview'&&window.scrollY>element.getBoundingClientRect().top+window.scrollY+32){mode='expanded';progress=1;element.dataset.phase='expanded';schedule();}
   if(mode==='expanded'&&!handingOff&&window.scrollY<=2){mode='overview';progress=0;element.dataset.phase='overview';schedule();}
  };
  const motionChange=()=>{if(media.matches&&mode==='expanding'){cancelAnimationFrame(animationFrame);finish();}};
  const orientationChange=()=>{scroller.cancel();handingOff=false;measure();};
  const resize=new ResizeObserver(measure);resize.observe(overview.current);
  destinations.current.forEach(node=>node&&resize.observe(node));
  // Story rows are one viewport tall, so a viewport change moves the card destinations even when the slots keep their size.
  element.querySelectorAll('.work-story').forEach(node=>resize.observe(node));
  const reveal=new IntersectionObserver(entries=>entries.forEach(entry=>{
   entry.target.classList.toggle('is-visible',entry.isIntersecting);
   if(entry.isIntersecting)entry.target.classList.add('has-been-visible');
   movers.current[Number(entry.target.dataset.index)]?.classList.toggle('is-visible',entry.isIntersecting);
  }),{threshold:.18});
  element.querySelectorAll('.work-story').forEach(node=>reveal.observe(node));
  window.addEventListener('wheel',wheel,{passive:false});window.addEventListener('touchstart',touchStart,{passive:true});window.addEventListener('touchmove',touchMove,{passive:false});
  window.addEventListener('touchend',touchEnd);window.addEventListener('touchcancel',touchEnd);portrait.addEventListener('change',orientationChange);
  window.addEventListener('keydown',keyDown);window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('resize',measure);media.addEventListener('change',motionChange);
  // Restore the finished layout if the browser restores a deeper scroll position.
  if(window.scrollY>element.getBoundingClientRect().top+window.scrollY){mode='expanded';progress=1;}
  measure();
  return()=>{
   cancelAnimationFrame(frame);cancelAnimationFrame(animationFrame);clearTimeout(handoffTimer);resize.disconnect();reveal.disconnect();begin.current=null;
   scroller.cancel();window.removeEventListener('touchend',touchEnd);window.removeEventListener('touchcancel',touchEnd);portrait.removeEventListener('change',orientationChange);
   window.removeEventListener('wheel',wheel);window.removeEventListener('touchstart',touchStart);window.removeEventListener('touchmove',touchMove);window.removeEventListener('keydown',keyDown);window.removeEventListener('scroll',scroll);window.removeEventListener('resize',measure);media.removeEventListener('change',motionChange);
  };
 },[workTypes]);
 return <div className="work-type-journey" ref={root}>
  <div className="home-work-showcase work-journey-overview" ref={overview}>
   <div className="work-overview-intro">
    <div className="work-overview-portrait" aria-hidden="true"><img src="/echo/music-hero-khalil.webp" alt="" width="1162" height="1014" fetchPriority="high"/></div>
    {intro}
   </div>
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
