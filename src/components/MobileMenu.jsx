function MobileMenu({ items, isOpen, activeSection, onClose, onNavigate, isSignedIn }) {
  return (
    <div
      id="mobile-menu"
      className={`mobile-menu ${isOpen ? 'is-open' : ''}`}
      aria-hidden={!isOpen}
    >
      <div className="mobile-menu-panel">
        <p className="section-kicker">KN//MOBILE DIRECTORY</p>
        <nav aria-label="Mobile">
          {items.map((item) => (
            <a
              key={item.id}
              className={activeSection === item.id ? 'is-active' : ''}
              href={`#${item.id}`}
              onClick={(event) => {
                onClose();
                onNavigate?.(event, item.id);
              }}
            >
              <span>{`KN//${item.sectionNumber}`}</span>
              <span>{item.label.toUpperCase()}</span>
            </a>
          ))}
          <a href={isSignedIn ? '#dashboard' : '#login'} onClick={onClose}>
            <span>KN//AUTH</span>
            <span>{isSignedIn ? 'DASHBOARD' : 'LOGIN'}</span>
          </a>
        </nav>
      </div>
    </div>
  );
}

export default MobileMenu;
