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
          <a href="/equipment">{t.nav.equipment}{count ? ` (${count})` : ''}</a>
          <a href="/quote">{t.nav.quote}</a>
          <a href="/login">{t.nav.login}</a>
          <button type="button" className="echo-lang" onClick={toggle}>{t.lang}</button>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="echo-footer">
        <strong>{t.brand}</strong>
        <span>{t.footer}</span>
      </footer>
    </div>
  );
}
