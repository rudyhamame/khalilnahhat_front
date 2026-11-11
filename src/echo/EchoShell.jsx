import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {cloudAsset} from '../lib/cloudAsset';
import {apiRequest} from '../lib/api';
import { UserRound, Languages } from 'lucide-react';
import {useBrowserChromeTheme} from './useBrowserChromeTheme';
import './navigation.css';

export default function EchoShell({ lang, user, children }) {
  const { t } = lang;
  const shell = useRef(null);
  useLayoutEffect(()=>{
    const viewport=window.visualViewport;
    let frame=0;
    const measure=()=>{
      frame=0;
      // Pinch zoom should magnify the page; keyboard and toolbar changes
      // should resize its portrait chapters to the space actually visible.
      if(viewport&&Math.abs(viewport.scale-1)>.01)return;
      // Typing (comments, requests) opens the keyboard: keep the layout height instead of squeezing the live.
      if(document.activeElement?.matches?.('input,textarea,select,[contenteditable]'))return;
      const height=Math.ceil(Math.min(window.innerHeight,viewport?.height||window.innerHeight));
      shell.current?.style.setProperty('--echo-visible-viewport-height',`${height}px`);
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(measure);};
    measure();window.addEventListener('resize',schedule);window.addEventListener('focusout',schedule);viewport?.addEventListener('resize',schedule);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',schedule);window.removeEventListener('focusout',schedule);viewport?.removeEventListener('resize',schedule);};
  },[]);
  // Typing on a phone: slide the section up just enough to keep the field above the keyboard (no resize, no re-layout), then back.
  useEffect(()=>{
    const viewport=window.visualViewport;if(!viewport)return undefined;
    let section=null,shift=0,frame=0,timer=0;
    const reset=()=>{if(section){section.style.transform='';section.style.transition='';}section=null;shift=0;};
    const apply=()=>{
      frame=0;
      const field=document.activeElement;
      if(!field?.matches?.('input,textarea,[contenteditable=true]')){reset();return;}
      // The outermost page section around the field (sections nest, e.g. the comments card inside #live).
      let owner=null;for(let node=field.closest('section[id]');node&&node.closest('#echo-main');node=node.parentElement?.closest('section[id]'))owner=node;
      if(!owner)return;
      if(section&&section!==owner)reset();
      section=owner;
      const visibleBottom=viewport.offsetTop+viewport.height;
      const naturalBottom=field.getBoundingClientRect().bottom+shift;
      const next=Math.max(0,Math.ceil(naturalBottom+12-visibleBottom));
      if(next===shift)return;
      shift=next;
      owner.style.transition='transform .2s ease';
      owner.style.transform=shift?`translateY(${-shift}px)`:'';
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(apply);};
    const focusIn=()=>{schedule();clearTimeout(timer);timer=setTimeout(schedule,350);};
    const focusOut=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(!document.activeElement?.matches?.('input,textarea,[contenteditable=true]'))reset();},120);};
    document.addEventListener('focusin',focusIn);document.addEventListener('focusout',focusOut);
    viewport.addEventListener('resize',schedule);viewport.addEventListener('scroll',schedule);
    return()=>{cancelAnimationFrame(frame);clearTimeout(timer);document.removeEventListener('focusin',focusIn);document.removeEventListener('focusout',focusOut);viewport.removeEventListener('resize',schedule);viewport.removeEventListener('scroll',schedule);reset();};
  },[]);
  const [introLanguageSelected,setIntroLanguageSelected]=useState(()=>window.location.pathname!=='/');
  useEffect(()=>{
    const update=event=>setIntroLanguageSelected(Boolean(event.detail?.selected));
    window.addEventListener('echo:hero-language-state',update);
    setIntroLanguageSelected(!document.querySelector('.hero-language-entry'));
    return()=>window.removeEventListener('echo:hero-language-state',update);
  },[]);
  // The voucher the owner chose to announce (admin > Vouchers); shown in the home header.
  const [voucher, setVoucher] = useState(null);
  // The ribbon drops in once, when the app opens; later visits to the page in the same session show it already in place.
  const [dropIn] = useState(() => { try { if (window.sessionStorage.getItem('echo-voucher-dropped')) return false; window.sessionStorage.setItem('echo-voucher-dropped', '1'); } catch { /* Storage unavailable. */ } return true; });
  useEffect(() => {
    if (window.location.pathname !== '/') return undefined;
    let alive = true;
    apiRequest('/vouchers/announcement').then(result => { if (alive) setVoucher(result.voucher || null); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const header = useRef(null);
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      shell.current?.style.setProperty('--echo-header-overlay-height', `${header.current.getBoundingClientRect().height}px`);
      shell.current?.style.setProperty('--echo-header-height', `${header.current.getBoundingClientRect().height}px`);
    });
    observer.observe(header.current);
    return () => observer.disconnect();
  }, []);
  // About + footer share one viewport: expose the footer height so the About chapter can leave room for it.
  useEffect(() => {
    const footer = shell.current?.querySelector('.echo-footer');
    if (!footer) return;
    const observer = new ResizeObserver(() => shell.current.style.setProperty('--echo-footer-height', `${footer.getBoundingClientRect().height}px`));
    observer.observe(footer);
    return () => { observer.disconnect(); shell.current?.style.removeProperty('--echo-footer-height'); };
  }, [window.location.pathname,introLanguageSelected]);
  const ar = lang.lang === 'ar';
  const tr = (en,arabic) => ar ? arabic : en;
  const current = window.location.pathname;
  useBrowserChromeTheme(current,introLanguageSelected);
  return (
    <div className="echo" data-theme="dark" data-page={current === "/" ? "home" : "inner"} ref={shell}>
      <a className="echo-skip" href="#echo-main">{ar ? 'انتقل إلى المحتوى' : 'Skip to content'}</a>
      <header ref={header} className="echo-header">
        <a className="echo-logo echo-logo--paired" href="/" aria-label="DJ Khalil Nahhat — Echo Event Entertainment home"><span className="echo-brand-pair"><img className="echo-brand-mark" src="https://res.cloudinary.com/nqiooluk/image/upload/v1793064085/khalil/site-assets/cb1719dc5065/echo/dj-khalil-nahhat-logo.svg" alt="DJ Khalil Nahhat" width="240" height="90" /><img className="echo-event-brand-mark" src="/echo/echo-event-entertainment-white-original.png" alt="ECHO Event & Entertainment" width="1392" height="1130" /></span></a>
        {current === '/' && introLanguageSelected && voucher && (() => {
          const value = voucher.kind === 'percent' ? `${voucher.percent}%` : `$${(voucher.amountCents / 100).toFixed(2).replace(/\.00$/, '')}`;
          const title = voucher.title && !/^[\d\s.%$]+$/.test(voucher.title) ? voucher.title : '';
          const until = voucher.endsAt ? new Date(voucher.endsAt).toLocaleDateString(ar ? 'ar-CA' : 'en-CA', { month: 'short', day: 'numeric', timeZone: 'America/Toronto' }) : '';
          // A ribbon that drops from the top edge of the page down past the header.
          return <button type="button" className={`echo-voucher-ribbon${dropIn ? ' is-dropping' : ''}`} onClick={() => window.dispatchEvent(new Event('echo:book-event'))} title={ar ? 'احجز الآن واستخدم القسيمة' : 'Make a booking and use this voucher'}>
            <span className="echo-voucher-tag">{ar ? 'قسيمة' : 'VOUCHER'}</span>
            <strong className="echo-voucher-value">{value} {ar ? 'خصم' : 'OFF'}</strong>
            <span className="echo-voucher-code">{voucher.code}</span>
            {(title || until) && <span className="echo-voucher-text">{[title, until ? (ar ? `حتى ${until}` : `until ${until}`) : ''].filter(Boolean).join(' · ')}</span>}
          </button>;
        })()}
        <div className="echo-header-actions">
          <a className="echo-icon-button" href={user ? (user.isAdmin ? '/admin/live-stream' : '/dashboard') : '/login'} aria-label={user ? t.nav.dashboard : t.nav.login} title={user ? t.nav.dashboard : t.nav.login}>{(()=>{
            // Two initials like "RH": first and last name, else the first and last word of the display name, else one letter.
            const words=String(user?.displayName||user?.name||'').trim().split(/\s+/).filter(Boolean);
            const first=String(user?.firstName||words[0]||user?.username||user?.email||'').trim(),last=String(user?.lastName||(words.length>1?words[words.length-1]:'')).trim();
            const initials=(Array.from(first)[0]||'')+(Array.from(last)[0]||'');
            return user&&initials?<span className="echo-account-initial" aria-hidden="true">{initials.toLocaleUpperCase()}</span>:<UserRound size={22} aria-hidden="true"/>;
          })()}</a>
          <button type="button" className="echo-icon-button echo-lang" onClick={()=>{if(current==='/')window.dispatchEvent(new Event('echo:hero-language-request'));else window.location.assign('/');}} aria-label={tr('Choose introduction language','اختار لغة المقدّمة')} title={tr('Choose language','اختار اللغة')}><Languages size={22} aria-hidden="true"/></button>
        </div>
      </header>
      <main id="echo-main" tabIndex={-1}>{children}</main>
      {current === '/' && introLanguageSelected && <footer id="echo-footer" className="echo-footer">
        <div className="echo-footer-brand"><a className="echo-logo echo-logo--paired" href="/" aria-label="DJ Khalil Nahhat — Echo Event Entertainment home"><span className="echo-brand-pair"><img className="echo-brand-mark" src="https://res.cloudinary.com/nqiooluk/image/upload/v1793064085/khalil/site-assets/cb1719dc5065/echo/dj-khalil-nahhat-logo.svg" alt="DJ Khalil Nahhat" width="240" height="90" /><img className="echo-event-brand-mark" src="/echo/echo-event-entertainment-white-original.png" alt="ECHO Event & Entertainment" width="1392" height="1130" /></span><p>{t.tagline}</p></a></div>
        <div className="echo-footer-bottom"><span>© {new Date().getFullYear()} {t.brand}</span><span>{t.footer}</span></div>
        <div className="echo-builder-credit">
          <a className="echo-builder-signature" href="https://portfolio.mctoshs.ca" target="_blank" rel="noopener noreferrer" aria-label={tr('Designed & built by RH Software (opens the RH Software portfolio)','التصميم والتطوير بواسطة RH Software (يفتح معرض أعمال RH Software)')}>
            <span className="echo-builder-emblem"><img src={cloudAsset('/echo/rh-software-credit.svg')} alt="RH" width="46" height="34" loading="lazy"/></span>
            <div className="echo-builder-wordmark"><span>{tr('Designed & built by','التصميم والتطوير بواسطة')}</span><strong dir="ltr">RH <span>SOFTWARE</span></strong><small dir="ltr">Engineered Intelligence</small></div>
          </a>
        </div>
      </footer>}
    </div>
  );
}
