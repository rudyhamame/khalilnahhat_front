import {useLayoutEffect,useRef} from 'react';
import {ArrowDown} from 'lucide-react';
import './bookHero.css';

// First viewport of the Book page: the photograph (background removed) over a page backdrop taken from the photo's own
// teal-green studio colours. The planning forms begin in the next viewport.
export default function BookHero({ar=false}){
  const tr=(en,arabic)=>ar?arabic:en,hero=useRef(null);
  // Fill exactly what is left of the screen under the header, so the forms start in the next viewport (html{zoom:.9} makes rects visual pixels).
  useLayoutEffect(()=>{
    const fit=()=>{const node=hero.current;if(!node)return;const zoom=parseFloat(getComputedStyle(document.documentElement).zoom)||1,top=node.getBoundingClientRect().top+window.scrollY;// Shared page rules force direct children of #echo-main to height:100% !important, so this has to be important too.
      node.style.setProperty('height',`${Math.max(320,Math.ceil((window.innerHeight-top)/zoom))}px`,'important');node.style.setProperty('max-height','none','important');};
    fit();window.addEventListener('resize',fit);return()=>window.removeEventListener('resize',fit);
  },[]);
  const down=event=>{event.preventDefault();document.getElementById('availability')?.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});};
  return <>
    <div className="book-backdrop" aria-hidden="true"/>
    <section ref={hero} className="book-hero" aria-label={tr('Book DJ Khalil','احجز دي جي خليل')} dir={ar?'rtl':'ltr'}>
      <header className="book-hero-intro"><span>{tr('YOUR EVENT, YOUR WAY','فعاليتك، على طريقتك')}</span><h1>{tr('Let’s make it happen.','لنحوّل فكرتك إلى واقع.')}</h1><p>{tr('A few details help us understand your celebration. Start wherever you’re ready, and come back to any step as your plans take shape.','تساعدنا بعض التفاصيل على فهم احتفالك. ابدأ بما تعرفه، وعُد إلى أي خطوة كلما اتضحت خططك.')}</p></header>
      <img className="book-hero-photo" src="/echo/book-hero-khalil.webp" width="1100" height="1253" alt={tr('DJ Khalil seated on a vintage radio','دي جي خليل جالساً على راديو كلاسيكي')} fetchPriority="high"/>
      <a className="book-hero-scroll" href="#availability" onClick={down}><span>{tr('Scroll to plan your event','انزل لتخطط لفعاليتك')}</span><ArrowDown size={18}/></a>
    </section>
  </>;
}
