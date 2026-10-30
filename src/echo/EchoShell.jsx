import { useEffect, useRef, useState } from 'react';
import {cloudAsset} from '../lib/cloudAsset';
import {apiRequest} from '../lib/api';
import { UserRound, Languages } from 'lucide-react';
import './navigation.css';

export default function EchoShell({ lang, user, children }) {
  const { t } = lang;
  const shell = useRef(null);
  const [drafts, setDrafts] = useState(() => window.__echoBookingDrafts || 0);
  // The voucher the owner chose to announce (admin > Vouchers); shown in the home header.
  const [voucher, setVoucher] = useState(null);
  useEffect(() => {
    if (window.location.pathname !== '/') return undefined;
    let alive = true;
    apiRequest('/vouchers/announcement').then(result => { if (alive) setVoucher(result.voucher || null); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    const update = event => setDrafts(Number(event.detail) || 0);
    window.addEventListener('echo:booking-drafts', update);
    return () => window.removeEventListener('echo:booking-drafts', update);
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
  }, [window.location.pathname]);
  const ar = lang.lang === 'ar';
  const tr = (en,arabic) => ar ? arabic : en;
  const current = window.location.pathname;
  return (
    <div className="echo" data-theme="dark" data-page={current === "/" ? "home" : "inner"} ref={shell}>
      <a className="echo-skip" href="#echo-main">{ar ? 'انتقل إلى المحتوى' : 'Skip to content'}</a>
      <header ref={header} className="echo-header">
        <a className="echo-logo echo-logo--paired" href="/" aria-label="DJ Khalil Nahhat — Echo Event Entertainment home"><span className="echo-brand-pair"><img className="echo-brand-mark" src="https://res.cloudinary.com/nqiooluk/image/upload/v1793064085/khalil/site-assets/cb1719dc5065/echo/dj-khalil-nahhat-logo.svg" alt="DJ Khalil Nahhat" width="240" height="90" /><img className="echo-event-brand-mark" src="/echo/echo-event-entertainment-white-original.png" alt="ECHO Event & Entertainment" width="1392" height="1130" /></span></a>
        {current === '/' && voucher && (() => {
          const value = voucher.kind === 'percent' ? `${voucher.percent}%` : `$${(voucher.amountCents / 100).toFixed(2)}`;
          const text = voucher.title || (ar ? `خصم ${value} على حجزك عبر الإنترنت` : `${value} off your online booking`);
          const until = voucher.endsAt ? new Date(voucher.endsAt).toLocaleDateString(ar ? 'ar-CA' : 'en-CA', { month: 'short', day: 'numeric', timeZone: 'America/Toronto' }) : '';
          return <button type="button" className="echo-voucher-pill" onClick={() => window.dispatchEvent(new Event('echo:book-event'))} title={ar ? 'احجز الآن واستخدم القسيمة' : 'Make a booking and use this voucher'}>
            <span className="echo-voucher-tag">{ar ? 'قسيمة' : 'VOUCHER'}</span><strong>{voucher.code}</strong><span className="echo-voucher-text">{text}{until ? (ar ? ` · حتى ${until}` : ` · until ${until}`) : ''}</span>
          </button>;
        })()}
        <div className="echo-header-actions">
          {current === '/' && <button type="button" className="echo-book-button" onClick={() => window.dispatchEvent(new Event('echo:book-event'))}>{ar ? 'قم بالحجز' : 'Make a booking'}{drafts > 0 && <span className="echo-book-badge" title={ar ? 'مسودة حجز بانتظار الإكمال' : 'Booking draft to complete'} aria-label={ar ? `${drafts} مسودة حجز بانتظار الإكمال` : `${drafts} booking draft to complete`}>{drafts}</span>}</button>}
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
