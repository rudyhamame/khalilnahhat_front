import { useEffect, useRef, useState } from 'react';
import { Archive, CalendarDays, ClipboardList, ExternalLink, Image, ListMusic, LogOut, Menu, MessageSquare, Moon, PanelLeftClose, PanelLeftOpen, Radio, Receipt, Speaker, Sun, Tags, X, Play } from 'lucide-react';

const GROUPS = [
  { name: 'Production', items: [
    ['live-stream', 'Live stream', '/admin/live-stream', Radio],
    ['live-sessions', 'Events & live queue', '/admin/live-sessions', CalendarDays],
  ] },
  { name: 'Music', items: [
    ['music-archive', 'Music Archive', '/admin/archive', Archive],
    ['player-playlist', 'Music library & playlist', '/admin/echo?tab=player-playlist', ListMusic],
    ['live-archive', 'Live archive', '/admin/echo?tab=live-archive', Archive],
  ] },
  { name: 'Accounts', items: [
    ['accounts', 'Accounts', '/admin/accounts', Play],
  ] },
  { name: 'Business', items: [
    ['services', 'Quotes & bookings', '/admin/services', ClipboardList],
    ['prices', 'Services & prices', '/admin/prices', Tags],
    ['transactions', 'Transactions', '/admin/transactions', Receipt],
  ] },
  { name: 'Website', items: [
    ['equipment', 'Equipment', '/admin/echo?tab=equipment', Speaker],
    ['testimonials', 'Testimonials', '/admin/echo?tab=testimonials', MessageSquare],
    ['media', 'Media library', '/admin/echo?tab=media', Image],
    ['meetings', 'Meetings', '/admin/echo?tab=meetings', CalendarDays],
  ] },
];

export default function AdminWorkspace({ activeKey = 'live-stream', username, onLogout, secondary, children }) {
  const [light, setLight] = useState(() => { try { return localStorage.getItem('khalil-admin-theme') === 'light'; } catch { return false; } });
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('khalil-admin-sidebar') === 'collapsed'; } catch { return false; } });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef(null);
  useEffect(() => {
    document.documentElement.classList.add('echo-admin-visible');
    return () => document.documentElement.classList.remove('echo-admin-visible');
  }, []);
  const group = GROUPS.find(({ items }) => items.some(([key]) => key === activeKey)) || GROUPS[0];
  const item = group.items.find(([key]) => key === activeKey) || group.items[0];
  const chooseTheme = (value) => { setLight(value); try { localStorage.setItem('khalil-admin-theme', value ? 'light' : 'dark'); } catch { /* Storage is optional. */ } };
  const toggleSidebar = () => { setCollapsed((value) => { try { localStorage.setItem('khalil-admin-sidebar', value ? 'expanded' : 'collapsed'); } catch { /* Storage is optional. */ } return !value; }); };
  useEffect(() => {
    const close = (event) => { if (event.key === 'Escape' && menuOpen) { setMenuOpen(false); menuButton.current?.focus(); } };
    window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close);
  }, [menuOpen]);
  return <div data-area={activeKey} className={`admin-workspace${secondary ? ' aw-has-secondary' : ''}${light ? ' aw-light' : ''}${collapsed ? ' aw-collapsed' : ''}${menuOpen ? ' aw-menu-open' : ''}`}>
    <a className="aw-skip" href="#admin-workspace-main">Skip to workspace</a>
    <header className="aw-topbar">
      <div className="aw-brand"><button ref={menuButton} className="aw-mobile-menu aw-icon-button" type="button" aria-label={menuOpen ? 'Close admin navigation' : 'Open admin navigation'} aria-expanded={menuOpen} aria-controls="admin-workspace-sidebar" onClick={() => setMenuOpen((value) => !value)}>{menuOpen ? <X size={18} /> : <Menu size={18} />}</button><a className="aw-brand-mark" href="/" aria-label="Echo — return to website">KN</a><span>Admin workspace</span></div>
      <nav className="aw-workspace-tabs" aria-label="Workspace areas">{GROUPS.map((section) => <a key={section.name} href={section.items[0][2]} aria-current={group.name === section.name ? 'true' : undefined}>{section.name}</a>)}</nav>
    </header>
    {menuOpen && <button className="aw-backdrop" type="button" aria-label="Dismiss admin navigation" onClick={() => setMenuOpen(false)} />}
    <aside className="aw-sidebar" id="admin-workspace-sidebar" aria-label="Admin navigation">
      <div className="aw-sidebar-heading"><span>Echo</span><button className="aw-icon-button aw-collapse" type="button" onClick={toggleSidebar} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed}>{collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}</button></div>
      <nav className="aw-tools" aria-label="Admin tools">{GROUPS.map((section) => <section className="aw-nav-group" key={section.name}><h2>{section.name}</h2>{section.items.map(([key, title, href, Icon]) => <a key={key} href={href} aria-current={activeKey === key ? 'page' : undefined} title={collapsed ? title : undefined}><Icon size={15} strokeWidth={1.5} /><span>{title}</span></a>)}</section>)}<section className="aw-nav-group"><h2>Links</h2><a href="/"><ExternalLink size={15} strokeWidth={1.5} /><span>View website ↗</span></a></section></nav>
      <div className="aw-sidebar-footer"><div className="aw-theme" role="group" aria-label="Dashboard color theme"><button type="button" aria-pressed={light} onClick={() => chooseTheme(true)} title="Light theme"><Sun size={16} /><span>Light</span></button><button type="button" aria-pressed={!light} onClick={() => chooseTheme(false)} title="Dark theme"><Moon size={16} /><span>Dark</span></button></div><div className="aw-account"><span className="aw-avatar" title={username}>KN</span><span className="aw-account-name" title={username}>{username}</span><button type="button" className="aw-signout" onClick={onLogout} title="Sign out"><LogOut size={16} /><span>Sign out</span></button></div></div>
    </aside>
    {secondary ? <aside className="aw-secondary" aria-label="Add music">{secondary}</aside> : null}
    <main className="aw-main" id="admin-workspace-main" tabIndex={-1}><div className="aw-breadcrumb"><span>{group.name}</span><span aria-hidden="true">/</span><strong>{item[1]}</strong></div><div className="aw-content">{children}</div><footer className="aw-workspace-footer">Echo · {item[1]}</footer></main>
  </div>;
}
