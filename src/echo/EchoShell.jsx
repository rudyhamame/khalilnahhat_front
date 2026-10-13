import { useCart } from './cart';

export default function EchoShell({ lang, children }) {
  const { t, toggle } = lang;
  const count = Object.keys(useCart()).length;
  return (
    <div className="echo">
      <header className="echo-header">
        <a className="echo-logo" href="/">ECHO<span>EVENT ENTERTAINMENT</span></a>
        <nav aria-label="Primary">
          <a href="/">{t.nav.home}</a>
          <a href="/about">{t.nav.about}</a>
          <a href="/equipment">{t.nav.equipment}{count ? ` (${count})` : ''}</a>
          <a href="/mixes">{t.nav.mixes}</a>
          <a href="/gallery">{t.nav.gallery}</a>
          <a href="/reviews">{t.nav.reviews}</a>
          <a href="/live">{t.nav.live}</a>
          <a href="/meeting">{t.nav.meeting}</a>
          <a href="/quote">{t.nav.quote}</a>
          <a href="/login">{t.nav.login}</a>
          <button type="button" className="echo-lang" onClick={toggle}>{t.lang}</button>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="echo-footer">
        <strong>{t.brand}</strong>
        <span>{t.footer}</span>
        <nav aria-label="Services">
          <a href="/wedding-dj-toronto">Wedding DJ Toronto</a>
          <a href="/sound-system-rental-toronto">Sound System Rental</a>
          <a href="/wedding-lighting-toronto">Wedding Lighting</a>
          <a href="/led-wall-rental-toronto">LED Wall Rental</a>
          <a href="/corporate-event-production-toronto">Corporate Events</a>
          <a href="/contact">{t.nav.contact}</a>
        </nav>
      </footer>
    </div>
  );
}
