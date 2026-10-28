import {useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,Quote,Star} from 'lucide-react';
import './heroReviews.css';

// Preview content only: never count these as genuine testimonials or ratings.
export const DEMO_REVIEWS=[
  {name:'Maya Darwish',eventType:'Wedding',text:'The entrance, the first dance, the packed dance floor—every part of the night felt connected.',textAr:'من دخول العروسين إلى الرقصة الأولى وحلبة الرقص، بدت كل لحظة من السهرة متناغمة.'},
  {name:'Adam Bennett',eventType:'Private celebration',text:'A thoughtful mix of old favourites and fresh tracks. Everyone found a reason to get up and dance.',textAr:'مزيج جميل من الأغاني المحبوبة والإيقاعات الجديدة، جعل الجميع يشاركون الرقص.'},
  {name:'Layla Mansour',eventType:'Engagement party',text:'Arabic favourites flowed into our English playlist so naturally. The atmosphere felt personal to us.',textAr:'انتقلت الأغاني العربية إلى قائمتنا الإنجليزية بانسيابية، وكان الجو يعكس ذوقنا.'},
  {name:'Daniel Clarke',eventType:'Corporate event',text:'Clear sound for the speeches, subtle lighting for dinner, and a completely different energy for the party.',textAr:'صوت واضح للكلمات وإضاءة هادئة للعشاء، ثم طاقة مختلفة تماماً وقت الاحتفال.'},
  {name:'Rania Haddad',eventType:'Wedding',text:'We wanted a celebration that brought both families together. The music gave everyone a place on the dance floor.',textAr:'أردنا احتفالاً يجمع العائلتين، وقد منحت الموسيقى الجميع مكاناً على حلبة الرقص.'},
  {name:'Omar Saleh',eventType:'Birthday celebration',text:'The room looked incredible, and the music kept building without overwhelming the conversation early on.',textAr:'كان المكان رائعاً، وتصاعدت حيوية الموسيقى تدريجياً دون أن تطغى على الأحاديث في البداية.'},
  {name:'Sofia Martin',eventType:'Anniversary party',text:'Our favourite songs felt like the thread running through the evening. Warm, joyful, and beautifully paced.',textAr:'كانت أغانينا المفضلة خيطاً يجمع لحظات الأمسية؛ أجواء دافئة ومبهجة وإيقاع متوازن.'},
  {name:'Karim Nassar',eventType:'Wedding reception',text:'From the welcome music to the last song, the evening had a lovely sense of momentum.',textAr:'من موسيقى الاستقبال حتى الأغنية الأخيرة، حافظت الأمسية على حيوية جميلة.'},
  {name:'Elena Brooks',eventType:'Company celebration',text:'The sound and visuals worked together beautifully. It felt like one complete experience, not separate pieces.',textAr:'تناغم الصوت والصورة بشكل جميل، فبدت الأمسية تجربة متكاملة وليست عناصر منفصلة.'},
].map((review,index)=>({...review,id:`demo-review-${index+1}`,demo:true}));

export default function HeroReviews({reviews,loading,failed,ar}){
  const tr=(en,arabic)=>ar?arabic:en;
  const [index,setIndex]=useState(0);
  const touchStart=useRef(null);
  const published=reviews.filter(item=>item.published!==false&&(item.text||item.textAr));
  const items=published.length?published:loading?[]:DEMO_REVIEWS;
  const active=index%Math.max(1,items.length),review=items[active];
  return <section id="customer-reviews" className="hero-reviews" aria-label={tr('Customer reviews','آراء العملاء')} aria-roledescription={tr('review carousel','عارض الآراء')}>
    <header><span><Quote size={15} aria-hidden="true"/>{tr('FROM OUR CUSTOMERS','من عملائنا')}</span>{items.length>1&&<div><button type="button" aria-label={tr('Previous customer review','الرأي السابق')} onClick={()=>setIndex((active-1+items.length)%items.length)}><ChevronLeft size={16}/></button><span>{active+1} / {items.length}</span><button type="button" aria-label={tr('Next customer review','الرأي التالي')} onClick={()=>setIndex((active+1)%items.length)}><ChevronRight size={16}/></button></div>}</header>
    {review?<>
      <div className="hero-review-carousel" dir="ltr" role="group" aria-label={tr('Browse customer reviews','تصفح آراء العملاء')} onKeyDown={event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();setIndex((active+(event.key==='ArrowRight'?1:-1)+items.length)%items.length);}}} onTouchStart={event=>{touchStart.current=event.touches[0].clientX;}} onTouchEnd={event=>{if(touchStart.current===null)return;const delta=event.changedTouches[0].clientX-touchStart.current;touchStart.current=null;if(Math.abs(delta)>35)setIndex((active+(delta<0?1:-1)+items.length)%items.length);}}>
        {items.map((item,i)=>{
          const offset=(i-active+items.length+Math.floor(items.length/2))%items.length-Math.floor(items.length/2);
          const current=offset===0,visible=Math.abs(offset)<=1;
          return <div key={item.id||i} className={`hero-review-card${current?' is-current':''}${visible?'':' is-hidden'}`} style={{'--review-offset':offset,'--review-depth':Math.abs(offset)}} aria-hidden={!visible}>
            <figure dir={ar?'rtl':'ltr'} aria-hidden={!current}>
              <Quote className="hero-review-mark" size={17} strokeWidth={1.5} aria-hidden="true"/>
              {item.demo&&<p className="hero-review-demo">{tr('Demo review · fictional customer · not a real testimonial','رأي تجريبي · عميل خيالي · ليس شهادة حقيقية')}</p>}
              {Number.isFinite(item.rating)&&item.rating>0&&<div className="hero-review-rating" aria-label={`${item.rating} / 5`}>{Array.from({length:Math.min(5,Math.floor(item.rating))},(_,n)=><Star key={n} size={12} fill="currentColor" aria-hidden="true"/>)}</div>}
              <blockquote>{ar&&item.textAr?item.textAr:item.text||item.textAr}</blockquote>
              <figcaption><strong>{item.name}</strong>{item.eventType&&<span>{item.eventType}</span>}</figcaption>
            </figure>
            {!current&&<button className="hero-review-side-select" type="button" tabIndex={visible?0:-1} aria-label={`${tr('Show review by','عرض رأي')} ${item.name}`} onClick={()=>setIndex(i)}/>}
          </div>;
        })}
      </div>
      <div className="hero-review-dots" dir="ltr" role="group" aria-label={tr('Choose review','اختر رأياً')}>{items.map((item,i)=><button key={item.id||i} type="button" className={i===active?'is-active':''} aria-label={`${tr('Review','الرأي')} ${i+1}: ${item.name}`} aria-pressed={i===active} onClick={()=>setIndex(i)}/>)}</div>
      <span className="hero-review-sr" aria-live="polite" aria-atomic="true">{active+1} / {items.length}: {review.name}{review.demo?tr(' — Demo review, fictional customer',' — رأي تجريبي، عميل خيالي'):''}</span>
    </>:<p className="hero-review-empty" role="status">{loading?tr('Loading customer reviews…','جارٍ تحميل آراء العملاء…'):failed?tr('Customer reviews are temporarily unavailable.','آراء العملاء غير متاحة حالياً.'):tr('Customer reviews will appear here when published.','ستظهر آراء العملاء هنا عند نشرها.')}</p>}
  </section>;
}
