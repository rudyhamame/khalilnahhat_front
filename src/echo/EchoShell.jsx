import { useEffect, useRef, useState } from 'react';
import {cloudAsset} from '../lib/cloudAsset';
import { Menu, X, UserRound, Languages } from 'lucide-react';
import './navigation.css';

export default function EchoShell({ lang, user, children }) {
  const { t } = lang;
  const [open, setOpen] = useState(false);
  const menuButton = useRef(null);
  const shell = useRef(null);
  const header = useRef(null);
  useEffect(() => {
    const dismiss = event => {
      if (!header.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      shell.current?.style.setProperty('--echo-header-overlay-height', `${header.current.offsetHeight}px`);
      if (!open) shell.current?.style.setProperty('--echo-header-height', `${header.current.offsetHeight}px`);
    });
    observer.observe(header.current);
    return () => observer.disconnect();
  }, [open]);
  // About + footer share one viewport: expose the footer height so the About chapter can leave room for it.
  useEffect(() => {
    const footer = shell.current?.querySelector('.echo-footer');
    if (!footer) return;
    const observer = new ResizeObserver(() => shell.current.style.setProperty('--echo-footer-height', `${footer.offsetHeight}px`));
    observer.observe(footer);
    return () => { observer.disconnect(); shell.current?.style.removeProperty('--echo-footer-height'); };
  }, [window.location.pathname]);
  const ar = lang.lang === 'ar';
  const tr = (en,arabic) => ar ? arabic : en;
  const current = window.location.pathname;
  const close = () => {
    setOpen(false); menuButton.current?.focus();
  };
  return (
    <div className="echo" data-theme="dark" data-page={current === "/" ? "home" : "inner"} ref={shell}>
      <a className="echo-skip" href="#echo-main">{ar ? 'انتقل إلى المحتوى' : 'Skip to content'}</a>
      <header ref={header} className="echo-header" onKeyDown={(e) => { if (e.key === 'Escape') close(); }}>
        <a className="echo-logo echo-logo--paired" href="/" aria-label="DJ Khalil Nahhat — Echo Event Entertainment home"><span className="echo-brand-pair"><img className="echo-brand-mark" src="https://res.cloudinary.com/nqiooluk/image/upload/v1793064085/khalil/site-assets/cb1719dc5065/echo/dj-khalil-nahhat-logo.svg" alt="DJ Khalil Nahhat" width="240" height="90" /><img className="echo-event-brand-mark" src="/echo/echo-event-entertainment-white-original.png" alt="ECHO Event & Entertainment" width="1392" height="1130" /></span></a>
        <button ref={menuButton} type="button" className="echo-menu-toggle" aria-controls="echo-navigation" aria-expanded={open}
          aria-label={open ? (ar ? 'إغلاق القائمة' : 'Close menu') : (ar ? 'فتح القائمة' : 'Open menu')} onClick={() => setOpen(!open)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
        <nav id="echo-navigation" className={open ? 'is-open' : ''} aria-label={ar ? 'التنقل الرئيسي' : 'Primary'}>
          <div className="echo-nav-sections">
            <a href="/" aria-current={current==='/'?'page':undefined} onClick={()=>setOpen(false)}>{t.nav.home}</a>
            <a href="/#khalil-work" onClick={()=>setOpen(false)}>{ar?'أعمال خليل':"Khalil’s Work"}</a>
            <a href="/#services" onClick={()=>setOpen(false)}>{ar?'الخدمات':'Services'}</a>
            <a href="/#availability" onClick={()=>setOpen(false)}>{ar?'المواعيد المتاحة':'Availability'}</a>
            <a href="/#home-music-archive" onClick={()=>setOpen(false)}>{ar?'الموسيقى':'Music'}</a>
            <a href="/#live" onClick={()=>setOpen(false)}>{t.nav.live}</a>
            <a href="/#about-dj-khalil" onClick={()=>setOpen(false)}>{t.nav.about}</a>
          </div>
          <div className="echo-nav-utilities">
            <a href={user ? (user.isAdmin ? '/admin/live-stream' : '/dashboard') : '/login'}><UserRound size={17} aria-hidden="true"/><span>{user ? t.nav.dashboard : t.nav.login}</span></a>
            <button type="button" className="echo-lang" onClick={lang.toggle} lang={ar ? 'en' : 'ar'}><Languages size={17} aria-hidden="true"/><span>{t.lang}</span></button>
          </div>
        </nav>
      </header>
      <main id="echo-main" tabIndex={-1}>{children}</main>
      {current === '/' && <footer id="contact" className="echo-footer">
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
