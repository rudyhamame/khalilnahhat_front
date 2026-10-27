import { useEffect, useRef, useState } from 'react';
import { Home, MessageCircle, Menu, X, ArrowUpRight, ChevronDown, AudioLines, UserRound, Disc3, Images, Radio, Languages } from 'lucide-react';
import './navigation.css';

export default function EchoShell({ lang, user, children }) {
  const { t } = lang;
  const [open, setOpen] = useState(false);
  const menuButton = useRef(null);
  const highlight = useRef(null);
  const followItem = event => {
    const item=event.target.closest('a,summary,button');
    const nav=event.currentTarget;
    if(!item||!nav.contains(item)||!highlight.current)return;
    const bounds=item.getBoundingClientRect(), parent=nav.getBoundingClientRect();
    Object.assign(highlight.current.style,{
      opacity:'1',width:`${bounds.width}px`,height:`${bounds.height}px`,
      transform:`translate(${bounds.left-parent.left+nav.scrollLeft}px,${bounds.top-parent.top+nav.scrollTop}px)`
    });
  };
  const shell = useRef(null);
  const header = useRef(null);
  useEffect(() => {
    const dismiss = event => {
      if (!header.current?.contains(event.target)) setOpen(false);
      for (const menu of header.current?.querySelectorAll('details[open]') || []) {
        if (!menu.contains(event.target)) menu.open = false;
      }
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
  const ar = lang.lang === 'ar';
  const tr = (en,arabic) => ar ? arabic : en;
  const menuItems = {
    '/#services': [AudioLines,tr('One team. Every element.','فريق واحد. كل التفاصيل.')],
    '/about': [UserRound,tr('Meet the artist behind the sound.','تعرّف على الفنان وراء الموسيقى.')],
    '/music-archive': [Disc3,tr('Sets, mixes and afterhours selections.','جلسات ومكسات واختيارات موسيقية.')],
    '/gallery': [Images,tr('Explore the Echo visual archive.','اكتشف الأرشيف المرئي لإيكو.')],
    '/#live': [Radio,tr('Tune into the next live session.','تابع الجلسة المباشرة القادمة.')],
  };
  const groups = [
    [ar ? 'الخدمات' : 'Services', [['/#services', ar ? 'جميع الخدمات' : 'All services']]],
    [ar ? 'اكتشف' : 'Discover', [['/about',t.nav.about],['/music-archive',ar?'أرشيف الموسيقى':'Music archive'],['/gallery',t.nav.gallery],['/#live',t.nav.live]]],
  ];
  const current = window.location.pathname;
  const close = () => {
    const expanded = header.current?.querySelector('details[open]');
    if(expanded) { expanded.open=false; expanded.querySelector('summary')?.focus(); return; }
    setOpen(false); menuButton.current?.focus();
  };
  return (
    <div className="echo" data-theme="dark" data-page={current === "/" ? "home" : "inner"} ref={shell}>
      <a className="echo-skip" href="#echo-main">{ar ? 'انتقل إلى المحتوى' : 'Skip to content'}</a>
      <header ref={header} className="echo-header" onKeyDown={(e) => { if (e.key === 'Escape') close(); }}>
        <a className="echo-logo" href="/" aria-label="DJ Khalil Nahhat — Echo Event Entertainment home"><img className="echo-brand-mark" src="/echo/dj-khalil-nahhat-logo.svg" alt="DJ Khalil Nahhat" width="240" height="90" /><span>ECHO EVENT ENTERTAINMENT</span></a>
        <button ref={menuButton} type="button" className="echo-menu-toggle" aria-controls="echo-navigation" aria-expanded={open}
          aria-label={open ? (ar ? 'إغلاق القائمة' : 'Close menu') : (ar ? 'فتح القائمة' : 'Open menu')} onClick={() => setOpen(!open)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
        <nav id="echo-navigation" className={open ? 'is-open' : ''} onPointerOver={followItem} onFocus={followItem} onPointerLeave={()=>{if(highlight.current)highlight.current.style.opacity='0';}} aria-label={ar ? 'التنقل الرئيسي' : 'Primary'}>
          <span ref={highlight} className="echo-nav-sliding-highlight" aria-hidden="true"/>
          <a href="/" aria-current={current==='/'?'page':undefined}><Home size={19} aria-hidden="true"/>{t.nav.home}</a>
          {groups.map(([label,links],groupIndex)=><details className="echo-nav-group" key={label} onToggle={event=>{if(event.currentTarget.open)for(const other of header.current.querySelectorAll('details'))if(other!==event.currentTarget)other.open=false;}}><summary className={links.some(([href])=>href===current)?'is-current':''}>{groupIndex===0?<AudioLines size={19} aria-hidden="true"/>:<Disc3 size={19} aria-hidden="true"/>}<span>{label}</span><ChevronDown size={12} aria-hidden="true"/></summary><div className="echo-nav-dropdown echo-nav-editorial">
            <div className="echo-menu-heading"><span>ECHO / {groupIndex===0?'PRODUCTION':'CULTURE'}</span><span>0{groupIndex+1}</span></div>
            <div className="echo-menu-links">{links.map(([href,label])=>{const [Icon,description]=menuItems[href];return <a key={href} href={href} aria-current={current===href?'page':undefined}><span className="echo-menu-icon"><Icon size={21} strokeWidth={1.4}/></span><span className="echo-menu-copy"><strong>{label}</strong><small>{description}</small></span><ArrowUpRight className="echo-menu-arrow" size={16} aria-hidden="true"/></a>;})}</div>
            <a className="echo-menu-feature" href={groupIndex===0?'/#how-to-book':'/music-archive'}><span className="echo-menu-feature-art" aria-hidden="true">{groupIndex===0?<AudioLines size={64} strokeWidth={.65}/>:<Disc3 size={64} strokeWidth={.65}/>}</span><span><small>{groupIndex===0?tr('LET’S MAKE IT YOURS','لنصنع تجربتك'):tr('THE ECHO SOUND','صوت إيكو')}</small><strong>{groupIndex===0?tr('A setup built around you.','تجهيزات مصممة لك.'):tr('Press play. Stay a while.','شغّل الموسيقى واستمتع.')}</strong><em>{groupIndex===0?tr('Start a conversation','لنبدأ الحديث'):tr('Explore the music','اكتشف الموسيقى')}<ArrowUpRight size={13}/></em></span></a>
          </div></details>)}
          <a href="/#how-to-book" aria-current={current==='/#how-to-book'?'page':undefined}><MessageCircle size={19} aria-hidden="true"/>{ar?'لنتحدث':'Let’s talk'}</a>
          <details className="echo-nav-group echo-nav-tools"><summary aria-label={ar?'الحساب والتفضيلات':'Account and preferences'}><UserRound size={19} aria-hidden="true"/><span>{ar?'حسابي':'Account'}</span><ChevronDown size={12} aria-hidden="true"/></summary><div className="echo-nav-dropdown">
          <div className="echo-menu-heading"><span>{tr('YOUR SPACE','مساحتك')}</span><UserRound size={15}/></div>
          <a className="echo-nav-account" href={user ? (user.isAdmin ? '/admin/live-stream' : '/dashboard') : '/login'}><span className="echo-menu-icon"><UserRound size={20}/></span><span className="echo-menu-copy"><strong>{user ? t.nav.dashboard : t.nav.login}</strong><small>{tr('Your plans. All in one place.','خططك كلها في مكان واحد.')}</small></span><ArrowUpRight size={14} aria-hidden="true"/></a>
          <button type="button" className="echo-lang" onClick={lang.toggle} lang={ar ? 'en' : 'ar'}><Languages size={18}/><span>{t.lang}</span><span className="echo-menu-language-hint">{tr('Language','اللغة')}</span></button>
          </div></details>
          <a className="echo-nav-quote" href="/#how-to-book">{t.nav.quote}<ArrowUpRight size={16} aria-hidden="true" /></a>
        </nav>
      </header>
      <main id="echo-main" tabIndex={-1}>{children}</main>
      {current === '/' && <footer id="contact" className="echo-footer">
        <div className="echo-footer-brand"><a className="echo-logo" href="/" aria-label="DJ Khalil Nahhat — Echo Event Entertainment home"><img className="echo-brand-mark" src="/echo/dj-khalil-nahhat-logo.svg" alt="DJ Khalil Nahhat" width="240" height="90" /><span>ECHO EVENT ENTERTAINMENT</span></a><p>{t.tagline}</p></div>
        <div><strong>{ar ? 'لنخطط لفعاليتك' : 'Let’s make it happen.'}</strong><a className="echo-footer-mail" href="mailto:khalilnahhatdj@gmail.com">khalilnahhatdj@gmail.com</a><p>{ar ? 'تورونتو، أونتاريو · منطقة تورونتو الكبرى وما حولها' : 'Toronto, Ontario · The GTA & beyond'}</p></div>
        <nav aria-label={ar ? 'روابط إضافية' : 'More from Echo'}>
          <a href="https://www.instagram.com/khalil_nahhat/" target="_blank" rel="noopener noreferrer">Instagram ↗</a><a href="/#services">{ar ? 'الخدمات' : 'Services'}</a><a href="/#customer-reviews">{t.nav.reviews}</a><a href="/#live">{t.nav.live}</a><a href="/#contact">{t.nav.contact}</a><a href="/#how-to-book">{tr('Plan your event','خطّط لفعاليتك')}</a>
        </nav>
        <div className="echo-footer-bottom"><span>© {new Date().getFullYear()} {t.brand}</span><span>{t.footer}</span></div>
      </footer>}
    </div>
  );
}
