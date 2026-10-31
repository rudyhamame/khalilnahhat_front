import {isAdministratorViewer,administratorWorkViewClosed} from '../echo/administratorActivity';
import { useEffect, useRef, useState } from 'react';
import AiAdministrator from '../echo/AiAdministrator';
import './adminAssistantAside.css';
import './adminAssistantDock.css';
import { Archive, CalendarDays, ClipboardList, ExternalLink, Images, LogOut, Menu, MessageSquare, Moon, PanelLeftClose, PanelLeftOpen, Radio, Receipt, Sun, Tags, X, Bot, TreePine, Ticket, ListMusic, Play, Users } from 'lucide-react';

const GROUPS = [
  { name: 'Live', items: [
    ['live-stream', 'Live stream', '/admin/live-stream', Radio],
    ['live-archive', 'Live Recordings', '/admin/echo?tab=live-archive', Archive],
  ] },
  { name: 'Work', items: [
    ['music-archive', 'Recordings', '/admin/archive', Archive],
    ['work-elements', 'Work Elements', '/admin/echo?tab=work-elements', Tags],
    ['dj-work-type', 'DJ Work Type', '/admin/echo?tab=dj-work-type', Tags],
    ['dj-service-builder', 'DJ Service Builder', '/admin/dj-service-builder', ListMusic],
  ] },
  { name: 'Clients', items: [
    ['registered-clients', 'Registered Clients', '/admin/clients', Users],
    ['services', 'Booking requests', '/admin/services', ClipboardList],
    ['testimonials', "Clients' Testimonials", '/admin/echo?tab=testimonials', MessageSquare],
    ['meetings', 'Meeting requests', '/admin/echo?tab=meetings', CalendarDays],
  ] },
  { name: 'Social media', items: [
    ['youtube', 'YouTube', '/admin/youtube', Play],
    ['instagram', 'Instagram', 'https://www.instagram.com/khalil_nahhat/', Images],
  ] },
  { name: 'Assets', items: [
    ['gallery', 'Gallery', '/admin/echo?tab=gallery', Images],
  ] },
  { name: 'Business', items: [
    ['prices', 'Events, Services & Equipment', '/admin/prices', Tags],
    ['transactions', 'Transactions', '/admin/transactions', Receipt],
    ['availability', 'Availability', '/admin/echo?tab=availability', CalendarDays],
    ['vouchers', 'Vouchers', '/admin/echo?tab=vouchers', Ticket],
  ] },
  { name: 'ECHO AI', items: [
    ['ai-administrator', 'Echo AI Administrator', '/admin/echo?tab=ai-administrator', Bot],
    ['ai-configuration', 'ECHO AI Configuration', '/admin/echo?tab=ai-configuration', Bot],
    ['ai-billing', 'Echo AI billing', '/admin/echo?tab=ai-billing', Receipt],
  ] },
  { name: 'Website', items: [
    ['seasonal-theme', 'Seasonal theme', '/admin/echo?tab=seasonal-theme', TreePine],
  ] },
];

export default function AdminWorkspace({ activeKey = 'live-stream', username, onLogout, secondary, children, groups = GROUPS, workspaceLabel = 'Admin workspace', storagePrefix = 'khalil-admin', variant = 'admin', token }) {
  const [light, setLight] = useState(() => { try { return localStorage.getItem(`${storagePrefix}-theme`) === 'light'; } catch { return false; } });
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(`${storagePrefix}-sidebar`) === 'collapsed'; } catch { return false; } });
  const [menuOpen, setMenuOpen] = useState(false);
  const [assistantOpen,setAssistantOpen]=useState(()=>{try{const saved=localStorage.getItem('echo-admin-assistant-open');return saved?saved==='true':window.innerWidth>1100;}catch{return true;}});
  const [assistantCalling,setAssistantCalling]=useState(false);
  const [workView,setWorkView]=useState(isAdministratorViewer);
  useEffect(()=>{const restore=()=>{setWorkView(false);setAssistantOpen(true);};window.addEventListener(administratorWorkViewClosed,restore);return()=>window.removeEventListener(administratorWorkViewClosed,restore);},[]);
  const hasAssistant=!workView&&variant==='admin'&&Boolean(token)&&activeKey!=='ai-administrator';
  const toggleAssistant=()=>{if(assistantCalling)return;setAssistantOpen(open=>{try{localStorage.setItem('echo-admin-assistant-open',String(!open));}catch{}return !open;});};
  const menuButton = useRef(null);
  useEffect(() => {
    document.documentElement.classList.add('echo-admin-visible');
    return () => document.documentElement.classList.remove('echo-admin-visible');
  }, []);
  const group = groups.find(({ items }) => items.some(([key]) => key === activeKey)) || groups[0];
  const item = group.items.find(([key]) => key === activeKey) || group.items[0];
  const chooseTheme = (value) => { setLight(value); try { localStorage.setItem(`${storagePrefix}-theme`, value ? 'light' : 'dark'); } catch { /* Storage is optional. */ } };
  const toggleSidebar = () => { setCollapsed((value) => { try { localStorage.setItem(`${storagePrefix}-sidebar`, value ? 'expanded' : 'collapsed'); } catch { /* Storage is optional. */ } return !value; }); };
  useEffect(() => {
    const close = (event) => { if (event.key === 'Escape' && menuOpen) { setMenuOpen(false); menuButton.current?.focus(); } };
    window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close);
  }, [menuOpen]);
  return <div data-area={activeKey} className={`admin-workspace ${variant}-workspace${secondary ? ' aw-has-secondary' : ''}${light ? ' aw-light' : ''}${collapsed ? ' aw-collapsed' : ''}${menuOpen ? ' aw-menu-open' : ''}${hasAssistant&&assistantOpen?' aw-with-ai':''}`}>
    <a className="aw-skip" href="#admin-workspace-main">Skip to workspace</a>
    <header className="aw-topbar">
      <div className="aw-brand"><button ref={menuButton} className="aw-mobile-menu aw-icon-button" type="button" aria-label={menuOpen ? 'Close workspace navigation' : 'Open workspace navigation'} aria-expanded={menuOpen} aria-controls="admin-workspace-sidebar" onClick={() => setMenuOpen((value) => !value)}>{menuOpen ? <X size={18} /> : <Menu size={18} />}</button><a className="aw-brand-mark" href="/" aria-label="Echo — return to website">KN</a><span>{workspaceLabel}</span></div>
      <nav className="aw-workspace-tabs" aria-label="Workspace areas">{groups.map((section) => <a key={section.name} href={section.items[0][2]} aria-current={group.name === section.name ? 'true' : undefined}>{section.name}</a>)}</nav>
      {hasAssistant&&<button type="button" className="aw-ai-toggle" aria-expanded={assistantOpen} aria-controls="admin-ai-aside" onClick={toggleAssistant} disabled={assistantCalling} title={assistantCalling?'End the voice call before closing Echo AI':undefined}><Bot size={16}/><span>Echo AI</span></button>}
    </header>
    {menuOpen && <button className="aw-backdrop" type="button" aria-label="Dismiss workspace navigation" onClick={() => setMenuOpen(false)} />}
    <aside className="aw-sidebar" id="admin-workspace-sidebar" aria-label={`${workspaceLabel} navigation`}>
      <div className="aw-sidebar-heading"><span>Echo</span><button className="aw-icon-button aw-collapse" type="button" onClick={toggleSidebar} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed}>{collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}</button></div>
      <nav className="aw-tools" aria-label={`${workspaceLabel} tools`}>{groups.map((section) => <section className="aw-nav-group" key={section.name}><h2>{section.name}</h2>{section.items.map(([key, title, href, Icon]) => <a key={key} href={href} aria-current={activeKey === key ? 'page' : undefined} title={collapsed ? title : undefined}><Icon size={15} strokeWidth={1.5} /><span>{title}</span></a>)}</section>)}<section className="aw-nav-group"><h2>Links</h2><a href="/"><ExternalLink size={15} strokeWidth={1.5} /><span>View website ↗</span></a></section></nav>
      <div className="aw-sidebar-footer"><div className="aw-theme" role="group" aria-label="Dashboard color theme"><button type="button" aria-pressed={light} onClick={() => chooseTheme(true)} title="Light theme"><Sun size={16} /><span>Light</span></button><button type="button" aria-pressed={!light} onClick={() => chooseTheme(false)} title="Dark theme"><Moon size={16} /><span>Dark</span></button></div><div className="aw-account"><span className="aw-avatar" title={username}>KN</span><span className="aw-account-name" title={username}>{username}</span><button type="button" className="aw-signout" onClick={onLogout} title="Sign out"><LogOut size={16} /><span>Sign out</span></button></div></div>
    </aside>
    {secondary ? <aside className="aw-secondary" aria-label="Add music">{secondary}</aside> : null}
    <main className="aw-main" id="admin-workspace-main" tabIndex={-1}><div className="aw-breadcrumb"><span>{group.name}</span><span aria-hidden="true">/</span><strong>{item[1]}</strong></div><div className="aw-content">{children}</div><footer className="aw-workspace-footer">Echo · {item[1]}</footer></main>
    {hasAssistant&&assistantOpen&&<aside id="admin-ai-aside" className="aw-ai-aside" aria-label="Echo AI Administrator sidebar"><AiAdministrator token={token} docked onClose={toggleAssistant} onVoiceActiveChange={setAssistantCalling}/></aside>}
  </div>;
}
