import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {cloudAsset} from '../lib/cloudAsset';
import {apiRequest} from '../lib/api';
import { UserRound, Languages } from 'lucide-react';
import './navigation.css';

export default function EchoShell({ lang, user, children }) {
  const { t } = lang;
  const shell = useRef(null),logo=useRef(null);
  useLayoutEffect(()=>{
    const viewport=window.visualViewport;
    let frame=0;
    const measure=()=>{
      frame=0;
      // Pinch zoom should magnify the page; keyboard and toolbar changes
      // should resize its portrait chapters to the space actually visible.
      if(viewport&&Math.abs(viewport.scale-1)>.01)return;
      const height=Math.min(window.innerHeight,viewport?.height||window.innerHeight);
      shell.current?.style.setProperty('--echo-visible-viewport-height',`${height}px`);
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(measure);};
    measure();window.addEventListener('resize',schedule);viewport?.addEventListener('resize',schedule);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',schedule);viewport?.removeEventListener('resize',schedule);};
  },[]);
  const [introLanguageSelected,setIntroLanguageSelected]=useState(()=>window.location.pathname!=='/');
  useEffect(()=>{
    const update=event=>setIntroLanguageSelected(Boolean(event.detail?.selected));
    window.addEventListener('echo:hero-language-state',update);
    setIntroLanguageSelected(!document.querySelector('.hero-language-entry'));
    return()=>window.removeEventListener('echo:hero-language-state',update);
  },[]);
  useLayoutEffect(()=>{
    const update=()=>{
      const anchor=logo.current;if(!anchor)return;
      const bounds=anchor.getBoundingClientRect();
      const entry=document.querySelector('.hero-language-entry button');
      const pending=window.location.pathname==='/'&&!introLanguageSelected&&entry;
      anchor.style.setProperty('--echo-logo-shift-x',pending?`${window.innerWidth/2-bounds.left-bounds.width/2}px`:'0px');
      anchor.style.setProperty('--echo-logo-shift-y',pending?`${entry.getBoundingClientRect().top-bounds.bottom-100}px`:'0px');
      anchor.style.setProperty('--echo-logo-scale',pending?'1.55':'1');
      anchor.dataset.entryPlatinum=pending?'true':'false';
    };
    update();window.addEventListener('resize',update);const observer=new ResizeObserver(update);
    if(logo.current)observer.observe(logo.current);
    return()=>{window.removeEventListener('resize',update);observer.disconnect();};
  },[introLanguageSelected]);
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
      shell.current?.style.setProperty('--echo-header-overlay-height', `${header.current.offsetHeight}px`);
      shell.current?.style.setProperty('--echo-header-height', `${header.current.offsetHeight}px`);
    });
    observer.observe(header.current);
    return () => observer.disconnect();
  }, []);
  // About + footer share one viewport: expose the footer height so the About chapter can leave room for it.
  useEffect(() => {
    const footer = shell.current?.querySelector('.echo-footer');
    if (!footer) return;
    const observer = new ResizeObserver(() => shell.current.style.setProperty('--echo-footer-height', `${footer.offsetHeight}px`));
    observer.observe(footer);
    return () => { observer.disconnect(); shell.current?.style.removeProperty('--echo-footer-height'); };
  }, [window.location.pathname,introLanguageSelected]);
  const ar = lang.lang === 'ar';
  const tr = (en,arabic) => ar ? arabic : en;
  const current = window.location.pathname;
  return (
    <div className="echo" data-theme="dark" data-page={current === "/" ? "home" : "inner"} ref={shell}>
      <a className="echo-skip" href="#echo-main">{ar ? 'انتقل إلى المحتوى' : 'Skip to content'}</a>
      <header ref={header} className="echo-header">
        <a ref={logo} style={current==='/'&&!introLanguageSelected?{visibility:'hidden'}:undefined} className="echo-logo echo-logo--paired" href="/" aria-label="DJ Khalil Nahhat — Echo Event Entertainment home"><span className="echo-brand-pair"><img className="echo-brand-mark" src="https://res.cloudinary.com/nqiooluk/image/upload/v1793064085/khalil/site-assets/cb1719dc5065/echo/dj-khalil-nahhat-logo.svg" alt="DJ Khalil Nahhat" width="240" height="90" /><img className="echo-event-brand-mark" src="/echo/echo-event-entertainment-white-original.png" alt="ECHO Event & Entertainment" width="1392" height="1130" /></span></a>
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
        {introLanguageSelected&&<div className="echo-header-actions">
          <a className="echo-icon-button" href={user ? (user.isAdmin ? '/admin/live-stream' : '/dashboard') : '/login'} aria-label={user ? t.nav.dashboard : t.nav.login} title={user ? t.nav.dashboard : t.nav.login}><UserRound size={22} aria-hidden="true"/></a>
          <button type="button" className="echo-icon-button echo-lang" onClick={()=>{if(current==='/')window.dispatchEvent(new Event('echo:hero-language-request'));else window.location.assign('/');}} aria-label={tr('Choose introduction language','اختار لغة المقدّمة')} title={tr('Choose language','اختار اللغة')}><Languages size={22} aria-hidden="true"/></button>
        </div>}
      </header>
      <main id="echo-main" tabIndex={-1}>{children}</main>
      {current === '/' && introLanguageSelected && <footer id="echo-footer" className="echo-footer">
        <div className="echo-footer-brand"><a className="echo-logo echo-logo--paired" href="/" aria-label="DJ Khalil Nahhat — Echo Event Entertainment home"><span className="echo-brand-pair"><img className="echo-brand-mark" src="https://res.cloudinary.com/nqiooluk/image/upload/v1793064085/khalil/site-assets/cb1719dc5065/echo/dj-khalil-nahhat-logo.svg" alt="DJ Khalil Nahhat" width="240" height="90" /><img className="echo-event-brand-mark" src="/echo/echo-event-entertainment-white-original.png" alt="ECHO Event & Entertainment" width="1392" height="1130" /></span></a><p>{t.tagline}</p></div>
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
