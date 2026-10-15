import { useEffect, useRef, useState } from 'react';
import { Menu, X, ArrowUpRight, Sun, Moon } from 'lucide-react';
import { useCart } from './cart';

export default function EchoShell({ lang, user, children }) {
  const { t } = lang;
  const [theme, setTheme] = useState(() => {
    try { return window.localStorage.getItem('echo-theme') === 'light' ? 'light' : 'dark'; }
    catch { return 'dark'; }
  });
  useEffect(() => {
    try { window.localStorage.setItem('echo-theme', theme); } catch { /* storage unavailable */ }
    const sync = (e) => { if (e.key === 'echo-theme') setTheme(e.newValue === 'light' ? 'light' : 'dark'); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [theme]);
  const [open, setOpen] = useState(false);
  const menuButton = useRef(null);
  const shell = useRef(null);
  const header = useRef(null);
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (!open) shell.current?.style.setProperty('--echo-header-height', `${header.current.offsetHeight}px`);
    });
    observer.observe(header.current);
    return () => observer.disconnect();
  }, [open]);
  const count = Object.keys(useCart()).length;
  const ar = lang.lang === 'ar';
  const links = [
    ['/', t.nav.home], ['/services', ar ? 'الخدمات' : 'Services'], ['/about', t.nav.about],
    ['/equipment', `${t.nav.equipment}${count ? ` (${count})` : ''}`], ['/mixes', t.nav.mixes],
    ['/gallery', t.nav.gallery], ['/live', t.nav.live], ['/meeting', t.nav.meeting],
  ];
  const current = window.location.pathname;
  const close = () => { setOpen(false); menuButton.current?.focus(); };
  return (
    <div className="echo" data-theme={theme} data-page={current === "/" ? "home" : "inner"} ref={shell}>
      <a className="echo-skip" href="#echo-main">{ar ? 'انتقل إلى المحتوى' : 'Skip to content'}</a>
      <header ref={header} className="echo-header" onKeyDown={(e) => { if (e.key === 'Escape') close(); }}>
        <a className="echo-logo" href="/" aria-label="Echo Event Entertainment home">ECHO<span>EVENT ENTERTAINMENT</span></a>
        <button ref={menuButton} type="button" className="echo-menu-toggle" aria-controls="echo-navigation" aria-expanded={open}
          aria-label={open ? (ar ? 'إغلاق القائمة' : 'Close menu') : (ar ? 'فتح القائمة' : 'Open menu')} onClick={() => setOpen(!open)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
        <nav id="echo-navigation" className={open ? 'is-open' : ''} aria-label={ar ? 'التنقل الرئيسي' : 'Primary'} onKeyDown={(e) => { if (e.key === 'Escape') close(); }}>
          {links.map(([href, title]) => <a key={href} href={href} aria-current={current === href ? 'page' : undefined}>{title}</a>)}
          <a className="echo-nav-account" href={user ? '/dashboard/services' : '/login'}>{user ? t.nav.dashboard : t.nav.login}</a>
          <button type="button" className="echo-lang" onClick={lang.toggle} lang={ar ? 'en' : 'ar'}>{t.lang}</button>
          <button type="button" className="echo-theme" aria-label={ar ? 'المظهر الداكن' : 'Dark theme'} aria-pressed={theme === 'dark'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
            {theme === 'dark' ? (ar ? 'داكن' : 'Dark') : (ar ? 'فاتح' : 'Light')}
          </button>
          <a className="echo-nav-quote" href="/quote">{t.nav.quote}<ArrowUpRight size={16} aria-hidden="true" /></a>
        </nav>
      </header>
      <main id="echo-main" tabIndex={-1}>{children}</main>
      <footer className="echo-footer">
        <div className="echo-footer-brand"><a className="echo-logo" href="/">ECHO<span>EVENT ENTERTAINMENT</span></a><p>{t.tagline}</p></div>
        <div><strong>{ar ? 'لنخطط لفعاليتك' : 'Let’s make it happen.'}</strong><a className="echo-footer-mail" href="mailto:khalilnahhatdj@gmail.com">khalilnahhatdj@gmail.com</a><p>{ar ? 'تورونتو، أونتاريو · منطقة تورونتو الكبرى وما حولها' : 'Toronto, Ontario · The GTA & beyond'}</p></div>
        <nav aria-label={ar ? 'روابط إضافية' : 'More from Echo'}>
          <a href="https://www.instagram.com/khalil_nahhat/" target="_blank" rel="noopener noreferrer">Instagram ↗</a><a href="/services">{ar ? 'الخدمات' : 'Services'}</a><a href="/reviews">{t.nav.reviews}</a><a href="/live">{t.nav.live}</a><a href="/contact">{t.nav.contact}</a><a href="/meeting">{t.nav.meeting}</a>
        </nav>
        <div className="echo-footer-bottom"><span>© {new Date().getFullYear()} {t.brand}</span><span>{t.footer}</span></div>
      </footer>
    </div>
  );
}
