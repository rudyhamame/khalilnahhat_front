import {cloudAsset} from '../lib/cloudAsset';
import {useRef,useState} from 'react';
import {Camera,ChevronLeft,ChevronRight} from 'lucide-react';
import './heroGallery.css';

export const GALLERY_PREVIEWS=['dj-services','lighting','special-effects','led-walls','sound-systems'].map((name,index)=>({id:`preview-${index}`,mediaUrl:cloudAsset(`/echo/${name}-cover-v1.webp`),title:'Production inspiration',titleAr:'إلهام للإنتاج',preview:true}));

export default function HeroGallery({media=[],loading,ar}){
  const [index,setIndex]=useState(0),touch=useRef(null);
  const photos=media.filter(item=>item.kind==='photo'&&item.mediaUrl&&item.published!==false);
  const items=photos.length?photos:loading?[]:GALLERY_PREVIEWS;
  const active=index%Math.max(1,items.length),tr=(en,arabic)=>ar?arabic:en;
  const step=direction=>setIndex((active+direction+items.length)%items.length);
  return <section id="gallery-photos" className="hero-reviews hero-gallery" aria-label={tr('Gallery photos','صور المعرض')} aria-roledescription="carousel">
    <header><span><Camera size={15}/>{tr('GALLERY PHOTOS','صور المعرض')}</span>{items.length>1&&<div><button type="button" aria-label={tr('Previous photo','الصورة السابقة')} onClick={()=>step(-1)}><ChevronLeft size={16}/></button><span>{active+1} / {items.length}</span><button type="button" aria-label={tr('Next photo','الصورة التالية')} onClick={()=>step(1)}><ChevronRight size={16}/></button></div>}</header>
    <div className="hero-gallery-stack" dir="ltr" role="group" aria-label={tr('Browse gallery photos','تصفح صور المعرض')} onKeyDown={event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();step(event.key==='ArrowRight'?1:-1);}}} onTouchStart={event=>{touch.current=event.touches[0].clientX;}} onTouchEnd={event=>{if(touch.current===null)return;const distance=event.changedTouches[0].clientX-touch.current;touch.current=null;if(Math.abs(distance)>35)step(distance<0?1:-1);}}>
      {items.map((item,i)=>{const offset=(i-active+items.length+Math.floor(items.length/2))%items.length-Math.floor(items.length/2);if(Math.abs(offset)>1)return null;return <button key={item.id||item.mediaUrl} type="button" className={`hero-gallery-photo${offset===0?' is-current':''}`} style={{'--photo-offset':offset,'--photo-depth':Math.abs(offset)}} aria-label={`${tr('Photo','الصورة')} ${i+1}: ${ar&&item.titleAr?item.titleAr:item.title||tr('Event gallery','معرض الفعاليات')}`} aria-pressed={offset===0} onClick={()=>setIndex(i)}>
        <img src={item.mediaUrl} alt={ar&&item.titleAr?item.titleAr:item.title||''} loading="lazy"/>
        {offset===0&&<span dir={ar?'rtl':'ltr'}><strong>{ar&&item.titleAr?item.titleAr:item.title}</strong>{item.preview&&<small>{tr('Illustrative imagery · not event photography','صور توضيحية · ليست صور فعاليات حقيقية')}</small>}</span>}
      </button>;})}
      {!items.length&&<p className="hero-review-empty" role="status">{tr('Loading gallery photos…','جارٍ تحميل صور المعرض…')}</p>}
    </div>
    {items.length>1&&<div className="hero-review-dots hero-gallery-dots" aria-label={tr('Choose photo','اختر صورة')}>{items.map((item,i)=><button key={item.id||i} type="button" className={active===i?'is-active':''} aria-label={`${tr('Photo','الصورة')} ${i+1}`} aria-pressed={active===i} onClick={()=>setIndex(i)}/>)}</div>}
    <span className="hero-review-sr" aria-live="polite">{items.length?`${active+1} / ${items.length}`:''}</span>
  </section>;
}
