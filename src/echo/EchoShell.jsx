import { useEffect, useRef } from 'react';
import {cloudAsset} from '../lib/cloudAsset';
import { UserRound, Languages } from 'lucide-react';
import './navigation.css';

export default function EchoShell({ lang, user, children }) {
  const { t } = lang;
  const shell = useRef(null);
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
  }, [window.location.pathname]);
  const ar = lang.lang === 'ar';
  const tr = (en,arabic) => ar ? arabic : en;
  const current = window.location.pathname;
  return (
    <div className="echo" data-theme="dark" data-page={current === "/" ? "home" : "inner"} ref={shell}>
      <a className="echo-skip" href="#echo-main">{ar ? 'انتقل إلى المحتوى' : 'Skip to content'}</a>
      <header ref={header} className="echo-header">
        <a className="echo-logo echo-logo--paired" href="/" aria-label="DJ Khalil Nahhat — Echo Event Entertainment home"><span className="echo-brand-pair"><img className="echo-brand-mark" src="https://res.cloudinary.com/nqiooluk/image/upload/v1793064085/khalil/site-assets/cb1719dc5065/echo/dj-khalil-nahhat-logo.svg" alt="DJ Khalil Nahhat" width="240" height="90" /><img className="echo-event-brand-mark" src="/echo/echo-event-entertainment-white-original.png" alt="ECHO Event & Entertainment" width="1392" height="1130" /></span></a>
        <div className="echo-header-actions">
          <a className="echo-icon-button" href={user ? (user.isAdmin ? '/admin/live-stream' : '/dashboard') : '/login'} aria-label={user ? t.nav.dashboard : t.nav.login} title={user ? t.nav.dashboard : t.nav.login}><UserRound size={22} aria-hidden="true"/></a>
          <button type="button" className="echo-icon-button echo-lang" onClick={lang.toggle} lang={ar ? 'en' : 'ar'} aria-label={t.lang} title={t.lang}><Languages size={22} aria-hidden="true"/></button>
        </div>
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
