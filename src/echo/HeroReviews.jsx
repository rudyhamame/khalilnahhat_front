import {useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,Quote,Star} from 'lucide-react';
import './heroReviews.css';

export default function HeroReviews({reviews,loading,failed,ar}){
  const tr=(en,arabic)=>ar?arabic:en;
  const [index,setIndex]=useState(0);
  const touchStart=useRef(null);
  const published=reviews.filter(item=>item.published!==false&&(item.text||item.textAr));
  const items=published;
  const active=index%Math.max(1,items.length),review=items[active];
  return <section id="customer-reviews" className="hero-reviews" aria-label={tr('Customer reviews','آراء العملاء')} aria-roledescription={tr('review carousel','عارض الآراء')}>
    <header><span><Quote size={15} aria-hidden="true"/>{tr('FROM OUR CUSTOMERS','من عملائنا')}</span>{items.length>1&&<div><button type="button" aria-label={tr('Previous customer review','الرأي السابق')} onClick={()=>setIndex((active-1+items.length)%items.length)}><ChevronLeft size={16}/></button><span>{active+1} / {items.length}</span><button type="button" aria-label={tr('Next customer review','الرأي التالي')} onClick={()=>setIndex((active+1)%items.length)}><ChevronRight size={16}/></button></div>}</header>
    {review?<>
      <div className="hero-review-carousel" dir="ltr" role="group" aria-label={tr('Browse customer reviews','تصفح آراء العملاء')} onKeyDown={event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();setIndex((active+(event.key==='ArrowRight'?1:-1)+items.length)%items.length);}}} onTouchStart={event=>{touchStart.current=event.touches[0].clientX;}} onTouchEnd={event=>{if(touchStart.current===null)return;const delta=event.changedTouches[0].clientX-touchStart.current;touchStart.current=null;if(Math.abs(delta)>35)setIndex((active+(delta<0?1:-1)+items.length)%items.length);}}>
        {items.map((item,i)=>{
          const current=i===active;
          return <div key={item.id||i} className={`hero-review-card${current?' is-current':''}`} aria-hidden={!current}>
            <figure dir={ar?'rtl':'ltr'} aria-hidden={!current}>
              <Quote className="hero-review-mark" size={17} strokeWidth={1.5} aria-hidden="true"/>
              {item.demo&&<p className="hero-review-demo">{tr('Demo review · fictional customer · not a real testimonial','رأي تجريبي · عميل خيالي · ليس شهادة حقيقية')}</p>}
              {Number.isFinite(item.rating)&&item.rating>0&&<div className="hero-review-rating" aria-label={`${item.rating} / 5`}>{Array.from({length:Math.min(5,Math.floor(item.rating))},(_,n)=><Star key={n} size={12} fill="currentColor" aria-hidden="true"/>)}</div>}
              <blockquote>{ar&&item.textAr?item.textAr:item.text||item.textAr}</blockquote>
              <figcaption><strong>{item.name}</strong>{item.eventType&&<span>{item.eventType}</span>}</figcaption>
            </figure>
          </div>;
        })}
      </div>
      <div className="hero-review-dots" dir="ltr" role="group" aria-label={tr('Choose review','اختر رأياً')}>{items.map((item,i)=><button key={item.id||i} type="button" className={i===active?'is-active':''} aria-label={`${tr('Review','الرأي')} ${i+1}: ${item.name}`} aria-pressed={i===active} onClick={()=>setIndex(i)}/>)}</div>
      <span className="hero-review-sr" aria-live="polite" aria-atomic="true">{active+1} / {items.length}: {review.name}{review.demo?tr(' — Demo review, fictional customer',' — رأي تجريبي، عميل خيالي'):''}</span>
    </>:<p className="hero-review-empty" role="status">{loading?tr('Loading customer reviews…','جارٍ تحميل آراء العملاء…'):failed?tr('Customer reviews are temporarily unavailable.','آراء العملاء غير متاحة حالياً.'):tr('Customer reviews will appear here when published.','ستظهر آراء العملاء هنا عند نشرها.')}</p>}
  </section>;
}
