import { Menu, X } from 'lucide-react';

function Header({
  items,
  activeSection,
  isMenuOpen,
  onToggleMenu,
  onCloseMenu,
  isSignedIn,
}) {
  return (
    <>
      <header className="header-shell hero-header-shell">
        <a
          className="brand-lockup"
          href="/"
          onClick={() => {
            onCloseMenu();
          }}
        >
          <span className="brand-mark" aria-label="KN slash slash">KN //</span>
          <span className="brand-name" aria-label="Khalil Nahhat">
            <span className="brand-name-first">KHALIL</span>
            <span className="brand-name-last">NAHHAT</span>
          </span>
        </a>

        <nav className="desktop-nav" aria-label="Primary">
          {items.map((item) => (
            <a
              key={item.id}
              className={activeSection === item.id ? 'is-active' : ''}
              href={item.href || `/${item.id}`}
              onClick={() => {
                onCloseMenu();
              }}
            >
              {`KN//${item.sectionNumber} ${item.label.toUpperCase()}`}
            </a>
          ))}
          <a href={isSignedIn ? '/dashboard' : '/login'}>
            {isSignedIn ? 'KN//DASHBOARD' : 'KN//LOGIN'}
          </a>
        </nav>
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
          aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={onToggleMenu}
        >
          {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>
    </>
  );
}

export default Header;
