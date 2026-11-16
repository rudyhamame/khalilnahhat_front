import {useRef} from 'react';
import {useFillViewport} from './useFillViewport';
import {ArrowDown} from 'lucide-react';
import BookVoucher from './BookVoucher';
import './bookHero.css';

// First viewport of the Book page: the photograph (background removed) over a page backdrop taken from the photo's own
// teal-green studio colours. The planning forms begin in the next viewport.
export default function BookHero({ar=false}){
  const tr=(en,arabic)=>ar?arabic:en,hero=useRef(null);
  useFillViewport(hero);
  const down=event=>{event.preventDefault();document.getElementById('availability')?.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});};
  return <>
    <div className="book-backdrop" aria-hidden="true"/>
    <section ref={hero} className="book-hero" aria-label={tr('Book DJ Khalil','احجز دي جي خليل')} dir={ar?'rtl':'ltr'}>
      <header className="book-hero-intro"><span>{tr('YOUR EVENT, YOUR WAY','فعاليتك، على طريقتك')}</span><h1>{tr('Let’s make it happen.','لنحوّل فكرتك إلى واقع.')}</h1><p>{tr('A few details help us understand your celebration. Start wherever you’re ready, and come back to any step as your plans take shape.','تساعدنا بعض التفاصيل على فهم احتفالك. ابدأ بما تعرفه، وعُد إلى أي خطوة كلما اتضحت خططك.')}</p><BookVoucher ar={ar}/></header>
      <img className="book-hero-photo" src={ar?'/echo/book-hero-khalil-rtl.webp':'/echo/book-hero-khalil.webp'} width="1100" height="1253" alt={tr('DJ Khalil seated on a vintage radio','دي جي خليل جالساً على راديو كلاسيكي')} fetchPriority="high"/>
      <a className="book-hero-scroll" href="#availability" onClick={down}><span>{tr('Scroll to plan your event','انزل لتخطط لفعاليتك')}</span><ArrowDown size={18}/></a>
    </section>
  </>;
}
