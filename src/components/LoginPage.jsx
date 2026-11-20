import {useAccessViewport} from '../lib/useAccessViewport';
import CanadianPhoneInput from './CanadianPhoneInput';
import {formatCanadianPhone} from '../lib/canadianPhone';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, AudioLines, Eye, EyeOff, LockKeyhole, Mail, MailCheck } from 'lucide-react';
import { apiRequest } from '../lib/api';
import EchoShell from '../echo/EchoShell';
import { usePageMeta } from '../echo/meta';
import './loginPage.css';
import GoogleSignIn from './GoogleSignIn';
import ClientAppBadge from '../echo/ClientAppBadge';

// A torn-paper edge: one seeded jagged line (fine fibres plus the odd bigger bite) shared by the character's clip-path and the drawn rim, so they always match.
const TEAR = (() => {
  let r = 11; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  const xs = []; for (let x = -60; x < 1060; x += 2 + rnd() * 6) xs.push(x); xs.push(1060); // runs past both screen edges, ending exactly on 1060
  // three jagged variants over the same points: CSS morphs between them so the torn edge keeps shifting (breathing).
  const shapes = [];
  const shape = () => {
    const pts = xs.map(x => [x, (rnd() - .5) * 7 + (rnd() < .1 ? (rnd() - .5) * 12 : 0) + Math.sin(x / 37 + rnd() * 2) * 3]); // level across the whole width (no upward sweep at the sides)
    shapes.push(pts);
    return ['calc(50% - 50vw) 0', 'calc(50% + 50vw) 0', ...[...pts].reverse().map(([x, y]) => `calc(50% + ${((x - 500) / 10).toFixed(2)}vw) calc(100% - var(--form-h,350px) - 30px + ${y.toFixed(1)}px)`)].join(',');
  };
  const [a, b, c] = [shape(), shape(), shape()];
  // drawn lines hugging the tear: same points, pushed down by a few px each, morphing in step with the clip-path.
  // the drawn lines are song waveforms: three stacked "tracks" whose loudness follows a slow envelope (quiet verses, loud choruses) under a smooth multi-harmonic carrier. Each variant has its own phases so the waveforms dance in step with the tear's breathing.
  const wave = (v, k, f) => {
    const ph = [v * 2.1 + 1, v * 1.3 + .4, v * 3.7 + k * 1.9, v * .9 + k * 2.6], amp = [10, 7, 4.5][k], base = [0, 11, 21][k];
    let d = '';
    for (let x = -60, i = 0; x <= 1060; x += 1.7, i++) {
      const env = .22 + .78 * Math.pow(Math.abs(Math.sin(x / 105 + ph[0]) * (.62 + .38 * Math.sin(x / 43 + ph[1]))), .85);
      const car = .6 * Math.sin(x * 1.15 + ph[2]) + .3 * Math.sin(x * 2.35 + ph[3]) + .1 * Math.sin(x * .5 + ph[0]);
      const [px, py] = f(x, base + amp * env * car);
      d += (i ? 'L' : 'M') + px.toFixed(1) + ' ' + py.toFixed(1);
    }
    return d;
  };
  const lines = [0, 1, 2].map(k => [0, 1, 2].map(v => wave(v, k, (x, y) => [x, y])));
  // landscape: the same jagged edge turned upright (runs top to bottom; the character page is to its right, 100% - --cw from the left).
  const vshape = pts => [...pts.map(([x, y]) => `calc(100% - var(--cw,45vw) + ${y.toFixed(1)}px) ${(x / 10).toFixed(2)}%`), '100% 106%', '100% -6%'].join(',');
  const [va, vb, vc] = shapes.map(vshape);
  const vlines = [0, 1, 2].map(k => [0, 1, 2].map(v => wave(v, k, (x, y) => [-y, x])));
  // the other side of each edge (the left column / the form area), used by the exit scene so that column can slide away as a whole panel.
  const hpt = ([x, y]) => `calc(50% + ${((x - 500) / 10).toFixed(2)}vw) calc(100% - var(--form-h,350px) - 30px + ${y.toFixed(1)}px)`;
  const hcomp = pts => [...pts.map(hpt), 'calc(50% + 56vw) 100%', 'calc(50% - 56vw) 100%'].join(',');
  const vcomp = pts => [...pts.map(([x, y]) => `calc(100% - var(--cw,45vw) + ${y.toFixed(1)}px) ${(x / 10).toFixed(2)}%`), '0 106%', '0 -6%'].join(',');
  const [ha, hb, hc] = shapes.map(hcomp), [wa, wb, wc] = shapes.map(vcomp);
  // Arabic (right-to-left): everything mirrored, the character page on the left and the forms on the right.
  const rvedge = pts => pts.map(([x, y]) => `calc(var(--cw,45vw) + ${y.toFixed(1)}px) ${(x / 10).toFixed(2)}%`);
  const [rva, rvb, rvc] = shapes.map(pts => [...rvedge(pts), '0 106%', '0 -6%'].join(',')), [rwa, rwb, rwc] = shapes.map(pts => [...rvedge(pts), '100% 106%', '100% -6%'].join(','));
  return { lines, vlines, style: { '--rvtear-a': rva, '--rvtear-b': rvb, '--rvtear-c': rvc, '--rvtl-a': rwa, '--rvtl-b': rwb, '--rvtl-c': rwc, '--tear': a, '--tear-a': a, '--tear-b': b, '--tear-c': c, '--vtear': va, '--vtear-a': va, '--vtear-b': vb, '--vtear-c': vc, '--tl-a': ha, '--tl-b': hb, '--tl-c': hc, '--vtl-a': wa, '--vtl-b': wb, '--vtl-c': wc } };
})();
export default function LoginPage({ lang, isAuthenticated, username, loginError, signupError, onLogin, onSignup, onLogout, onGoogleLogin, embedded=false }) {
  useAccessViewport(!embedded);
  const ar = lang.lang === 'ar';
  const tr = (en, arabic) => ar ? arabic : en;
  usePageMeta(tr('Your Backstage Pass | DJ Khalil × Echo', 'تذكرتك إلى الكواليس | دي جي خليل × إيكو'), tr('Sign in or create your account to plan your next event with DJ Khalil and Echo Event Entertainment.', 'سجّل الدخول أو أنشئ حسابك للتخطيط لفعاليتك القادمة مع دي جي خليل وإيكو.'), !embedded);
  const [mode, setMode] = useState(() => (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'signup' ? 'signup' : 'signin'));
  const [name, setName] = useState(username?.includes('@') ? username : '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingEmail, setPendingEmail] = useState(''), [resent, setResent] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitMode, setSubmitMode] = useState(null);
  const [retryAt, setRetryAt] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('khalil-auth-retry-at') || '{}');
      return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    } catch { return {}; }
  });
  const [now, setNow] = useState(Date.now);
  // After a successful sign-in the page plays its exit scene (App fires the event, then waits for it to finish).
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (embedded) return undefined;
    const start = () => setLeaving(true);
    window.addEventListener('echo:login-success', start);
    return () => window.removeEventListener('echo:login-success', start);
  }, [embedded]);
  useEffect(() => {
    document.documentElement.classList.toggle('echo-login-leaving', leaving);
    if (leaving) document.querySelectorAll('.access-tear-lines, .access-tear-vlines').forEach(svg => svg.pauseAnimations?.()); // freeze the waveform morph while the page glides away
    return () => document.documentElement.classList.remove('echo-login-leaving');
  }, [leaving]);
  // Hold the page behind a loader until the character, logos and sketch pattern are fully downloaded and decoded; failed loads retry.
  const [ready, setReady] = useState(embedded);
  useEffect(() => {
    if (embedded) return undefined;
    let dead = false;
    const load = (src, n = 0) => new Promise(res => {
      const img = new Image();
      img.onload = () => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(res);
      img.onerror = () => setTimeout(() => (dead ? res() : load(src, n + 1).then(res)), Math.min(400 * 2 ** n, 4000));
      img.src = src;
    });
    Promise.all(['/echo/login-hero-khalil.webp', '/echo/khalil-sketch-pattern.png', '/echo/dj-khalil-nahhat-logo.svg', '/echo/echo-event-entertainment-white-original.png'].map(src => load(src)).concat(document.fonts?.ready)).then(() => { if (!dead) setReady(true); });
    return () => { dead = true; };
  }, [embedded]);
  useEffect(() => {
    if (!Object.values(retryAt).some(until => until > Date.now())) return;
    const timer = setInterval(() => {
      setNow(Date.now());
      if (!Object.values(retryAt).some(until => until > Date.now())) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [retryAt]);
  const waitFor = m => Math.max(0, Math.ceil(((Number(retryAt[m]) || 0) - now) / 1000));
  const retryText = seconds => tr(`Try again in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}.`, `حاول مجدداً بعد ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}.`);
  const submittedForm = useRef(null), accessRoot = useRef(null);
  useEffect(() => { // the character's fade-out follows the visible form's height
    const root = accessRoot.current, wraps = root ? [...root.querySelectorAll('.access-content .access-form-wrap')] : [];
    if (!wraps.length || typeof ResizeObserver === 'undefined') return undefined;
    const sync = () => root.style.setProperty('--form-h', `${Math.max(...wraps.map(w => w.offsetHeight)) + 20 + (window.matchMedia('(max-width:1000px), (orientation:portrait)').matches ? 0 : 0)}px`); // hidden forms measure 0, so this is the tallest visible one
    const observer = new ResizeObserver(sync); wraps.forEach(w => observer.observe(w)); sync(); window.addEventListener('resize', sync);
    return () => { observer.disconnect(); window.removeEventListener('resize', sync); };
  }, [mode, isAuthenticated]);
  const [signup, setSignup] = useState({ firstName: '', lastName: '', password: '', email: '', phoneNumber: '' });
  const errorFor = m => waitFor(m) ? retryText(waitFor(m)) : (submitMode === m ? submitError : '') || (m === 'signin' ? loginError : signupError);
  useEffect(() => {
    const alert = submittedForm.current?.querySelector('[role="alert"]');
    if (alert) { alert.scrollIntoView({block:'nearest'}); alert.focus({preventScroll:true}); }
  }, [submitError, loginError, signupError]);
  const continueAsGuest = () => { try { window.sessionStorage.setItem('echo-guest','1'); } catch { /* private mode: the guest flag is skipped */ } window.location.assign('/'); };
  const resend = async () => { try { await apiRequest('/auth/resend-signup-verification', { method: 'POST', body: { email: pendingEmail } }); setResent(true); } catch { /* the link can be requested again */ } };
  const changeMode = value => { setMode(value); setShowPassword(false); setSubmitError(''); };
  const submit = (m = mode) => async event => {
    event.preventDefault();
    if (busy || waitFor(m)) return;
    submittedForm.current = event.currentTarget;
    setSubmitMode(m);
    if (m === 'signup' && signup.password !== confirmPassword) {
      setSubmitError(tr('Passwords do not match.', 'كلمتا المرور غير متطابقتين.'));
      return;
    }
    setBusy(true); setSubmitError('');
    try { const result = await (m === 'signin' ? onLogin({ email: name, password }) : onSignup({...signup,phoneNumber:formatCanadianPhone(signup.phoneNumber)})); if (m === 'signup' && result?.pending) setPendingEmail(result.email || signup.email); }
    catch (failure) {
      if (failure?.status === 429 && failure.retryAfter > 0) {
        const until = Date.now() + failure.retryAfter * 1000;
        setNow(Date.now());
        setRetryAt(current => {
          const next = {...current, [m]: until};
          try { sessionStorage.setItem('khalil-auth-retry-at', JSON.stringify(next)); } catch { /* Storage may be unavailable. */ }
          return next;
        });
        setSubmitError('');
      } else setSubmitError(failure?.message || tr('We couldn’t sign you in. Please try again.', 'تعذر تسجيل الدخول. يرجى المحاولة مجدداً.'));
    }
    finally { setBusy(false); }
  };
  const fields = [
    ['firstName', tr('First name', 'الاسم الأول'), 'text', 'given-name'],
    ['lastName', tr('Last name', 'اسم العائلة'), 'text', 'family-name'],
    ['email', tr('Email address', 'البريد الإلكتروني'), 'email', 'email'],
    ['password', tr('Password', 'كلمة المرور'), 'password', 'new-password'],
  ];
  const passwordToggle = <button className="access-password-toggle" type="button" disabled={busy} aria-pressed={showPassword}
    aria-label={showPassword ? tr('Hide password', 'إخفاء كلمة المرور') : tr('Show password', 'إظهار كلمة المرور')} onClick={() => setShowPassword(value => !value)}>
    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
  </button>;

  const formBody = (m, withSwitch) => { const error = errorFor(m); return <>
        {withSwitch&&<div className="access-switch" role="group" aria-label={tr('Account access', 'الدخول إلى الحساب')}>
          <button type="button" disabled={busy} aria-pressed={m === 'signin'} onClick={() => changeMode('signin')}>{tr('Sign in', 'تسجيل الدخول')}</button>
          <button type="button" disabled={busy} aria-pressed={m === 'signup'} onClick={() => changeMode('signup')}>{tr('Create account', 'إنشاء حساب')}</button>
        </div>}
        {onGoogleLogin&&(withSwitch||m === 'signin')&&<GoogleSignIn ar={ar} onSignIn={onGoogleLogin} disabled={busy} compact={embedded}/>}
        <form className="access-form" onSubmit={submit(m)} aria-busy={busy} aria-describedby={error ? 'access-error-' + m : undefined}>
          {error && <p className="access-error" id={'access-error-' + m} role="alert" tabIndex={-1}>{error}</p>}
          <fieldset disabled={busy} className={m === 'signup' ? 'access-fields access-fields--signup' : 'access-fields'}><legend className="access-sr-only">{m === 'signin' ? tr('Sign in details', 'بيانات تسجيل الدخول') : tr('Create your account', 'إنشاء حسابك')}</legend>
            {m === 'signin' ? <>
              <label className="access-field" htmlFor={'access-email-'+m}><span>{tr('Email address', 'البريد الإلكتروني')}</span><span className="access-input"><Mail size={18} aria-hidden="true" /><input id={'access-email-'+m} name="email" type="email" required autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder={tr('Your email address', 'بريدك الإلكتروني')} value={name} onChange={event => setName(event.target.value)} /></span></label>
              <label className="access-field" htmlFor={'access-password-'+m}><span>{tr('Password', 'كلمة المرور')}</span><span className="access-input"><LockKeyhole size={18} aria-hidden="true" /><input id={'access-password-'+m} name="password" required type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder={tr('Your password', 'كلمة المرور الخاصة بك')} value={password} onChange={event => setPassword(event.target.value)} />{passwordToggle}</span></label>
            </> : <>{fields.map(([key, label, type, auto]) => <label className="access-field" key={key} htmlFor={'access-' + key + '-' + m}><span>{label}</span><span className="access-input">{key === 'email' ? <Mail size={17} aria-hidden="true" /> : key === 'password' ? <LockKeyhole size={17} aria-hidden="true" /> : null}<input id={'access-' + key + '-' + m} name={key} placeholder={label} required type={key === 'password' && showPassword ? 'text' : type} autoComplete={auto} autoCapitalize={key === 'username' ? 'none' : undefined} minLength={key === 'password' ? 8 : undefined} value={signup[key]} onChange={event => setSignup(current => ({ ...current, [key]: event.target.value }))} />{key === 'password' && passwordToggle}</span></label>)}<label className="access-field" htmlFor={'access-confirm-password-'+m}><span>{tr('Confirm password', 'تأكيد كلمة المرور')}</span><span className="access-input"><LockKeyhole size={17} aria-hidden="true" /><input id={'access-confirm-password-'+m} name="confirmPassword" placeholder={tr('Confirm password', 'تأكيد كلمة المرور')} required type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} value={confirmPassword} onChange={event => { setConfirmPassword(event.target.value); setSubmitError(''); }} /></span></label><label className="access-field access-field--wide" htmlFor={'access-phoneNumber-'+m}><span>{tr('Phone number (optional)', 'رقم الهاتف (اختياري)')}</span><span className="access-input"><CanadianPhoneInput id={'access-phoneNumber-'+m} name="phoneNumber" autoComplete="tel" value={signup.phoneNumber} placeholder={tr('Phone number (optional)', 'رقم الهاتف (اختياري)')} onChange={phoneNumber=>setSignup(current=>({...current,phoneNumber}))} /></span></label></>}
          </fieldset>
          {m === 'signin' ? <div className="access-form-options"><a href="/forgot-password">{tr('Forgot password?', 'نسيت كلمة المرور؟')}</a></div> : <p className={`access-password-help${signup.password.length >= 8 ? ' is-ok' : ''}`} aria-live="polite">{signup.password.length >= 8 ? tr('✓ Your password is long enough.', '✓ كلمة المرور طويلة بما يكفي.') : tr(`Your password needs at least 8 characters (${signup.password.length}/8).`, `تحتاج كلمة المرور إلى ٨ أحرف على الأقل (${signup.password.length}/٨).`)}</p>}
          <button className="access-submit" disabled={busy || waitFor(m) > 0} type={m === 'signin' && !name && !password ? 'button' : 'submit'} onClick={m === 'signin' && !name && !password ? continueAsGuest : undefined}><span>{busy ? tr('One moment…', 'لحظة واحدة…') : waitFor(m) ? retryText(waitFor(m)) : m === 'signin' ? (!name && !password ? tr('Continue as guest', 'المتابعة كضيف') : tr('Let’s get you in', 'لنبدأ معاً')) : tr('Create your account', 'إنشاء حسابك')}</span>{busy ? <span className="access-loading" aria-hidden="true" /> : <ArrowRight size={19} aria-hidden="true" />}</button>
        </form>
        {m === 'signin' && !embedded && <div className="access-app-login"><p className="access-google-divider">{tr('or use the app', 'أو استخدم التطبيق')}</p><ClientAppBadge tr={tr} className="client-app-badge--card"/></div>}
        <div className="access-reassurance"><LockKeyhole size={13} aria-hidden="true" /><span>{tr('Your event planning, in your own space.', 'تخطيط فعاليتك في مساحتك الخاصة.')}</span></div>
      </>; };
  const content = <section ref={accessRoot} className={embedded ? "echo-access echo-order-access" : `echo-access${leaving ? ' is-leaving' : ''}`} data-access-mode={mode} dir={ar ? 'rtl' : 'ltr'} aria-labelledby={embedded ? undefined : "access-title"} aria-label={embedded ? tr("Account access", "الدخول إلى الحساب") : undefined}>
    {!embedded && !ready && <div className="access-loader" role="status" aria-label={tr('Loading', 'جارٍ التحميل')}><i/></div>}
    {!embedded && <><div className="access-backdrop" aria-hidden="true"/><div className="access-panel access-panel-l" aria-hidden="true" style={TEAR.style}/><div className="access-panel access-panel-r" aria-hidden="true" style={TEAR.style}/><div className="access-sketches" aria-hidden="true" style={TEAR.style}/>{ready&&<><div className="access-hero-vignette" aria-hidden="true" style={TEAR.style}/><img className="access-hero-photo" style={TEAR.style} src="/echo/login-hero-khalil.webp" width="1016" height="1536" alt={tr('DJ Khalil in sunglasses and a black denim jacket','دي جي خليل بنظارة شمسية وجاكيت جينز أسود')} fetchPriority="high"/><div className="access-hero-inset" aria-hidden="true" style={TEAR.style}/><svg className="access-tear-lines" viewBox="-60 -110 1120 140" preserveAspectRatio="none" aria-hidden="true">{TEAR.lines.map((d, i) => <path key={i} d={d[0]} style={{ opacity: [.95, .7, .5][i], strokeWidth: [1.8, 1.4, 1.1][i] }}><animate attributeName="d" dur="3.4s" repeatCount="indefinite" values={[d[0], d[1], d[2], d[0]].join(';')} keyTimes="0;.33;.66;1" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1"/></path>)}</svg><svg className="access-tear-vlines" viewBox="-110 -60 140 1120" preserveAspectRatio="none" aria-hidden="true">{TEAR.vlines.map((d, i) => <path key={i} d={d[0]} style={{ opacity: [.95, .7, .5][i], strokeWidth: [1.8, 1.4, 1.1][i] }}><animate attributeName="d" dur="3.4s" repeatCount="indefinite" values={[d[0], d[1], d[2], d[0]].join(';')} keyTimes="0;.33;.66;1" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1"/></path>)}</svg></>}</>}

    {embedded || isAuthenticated ? <div className="access-content"><div className="access-form-wrap">
      {embedded && <header className="access-embedded-heading"><h2>{mode === 'signin' ? tr('Your next great event starts here.', 'فعاليتك القادمة تبدأ هنا.') : tr('Let’s make it yours.', 'لنصنع فعاليتك معاً.')}</h2><p>{mode === 'signin' ? tr('Sign in to plan with Echo AI.', 'سجّل الدخول للتخطيط مع إيكو AI.') : tr('Create an account to plan and keep your event details together.', 'أنشئ حساباً للتخطيط وحفظ تفاصيل فعاليتك في مكان واحد.')}</p></header>}
      {!embedded && <>
        <h1 id="access-title">{tr('You’re in.', 'أهلاً بك.')}</h1>
        <p className="access-intro">{tr('Everything you need for your next event is waiting for you.', 'كل ما تحتاجه لفعاليتك القادمة بانتظارك.')}</p>
      </>}
      {isAuthenticated ? <div className="access-signed-in"><span>{tr('SIGNED IN AS', 'تم تسجيل الدخول باسم')}</span><strong>{username}</strong><a className="access-submit" href="/dashboard">{lang.t.nav.dashboard}<ArrowUpRight size={18} /></a><button className="access-text-link" type="button" onClick={onLogout}>{tr('Sign out', 'تسجيل الخروج')}</button></div> : formBody(mode, true)}
    </div></div> : <><div className="access-pair"><h2 className="access-landscape-title">{tr('Your Backstage Pass', 'تذكرتك إلى الكواليس')}</h2>
      {['signin', 'signup'].map(m => <div className="access-content" data-mode={m} key={m}><div className="access-form-wrap" data-mode={m}>
        <div className="access-switch access-responsive-switch" aria-label={tr('Account access', 'الدخول إلى الحساب')}>
      {['signin','signup'].map(value=><button key={value} type="button" aria-pressed={mode===value} onClick={()=>changeMode(value)}>{value==='signin'?tr('Sign in','تسجيل الدخول'):tr('Create account','إنشاء حساب')}</button>)}
    </div>
        <h1 id={m === 'signin' ? 'access-title' : undefined}>{m === 'signin' ? <>{tr('Good to', 'سعداء')} <em>{tr('see you.', 'بعودتك.')}</em></> : <>{tr('Make it', 'لنصنع')} <em>{tr('your night.', 'ليلتك.')}</em></>}</h1>
        <p className="access-intro">{m === 'signin' ? tr('Already with us? Sign in to pick up where you left off.', 'معنا من قبل؟ سجّل الدخول لتتابع من حيث توقفت.') : tr('New here? Create your account to plan your next event with Echo.', 'جديد هنا؟ أنشئ حسابك لتخطط لفعاليتك القادمة مع إيكو.')}</p>
        {m === 'signup' && pendingEmail ? <div className="access-verify" role="status">
          <MailCheck size={34} aria-hidden="true" />
          <strong>{tr('Check your email', 'تحقق من بريدك الإلكتروني')}</strong>
          <p>{tr(`We sent a verification link to ${pendingEmail}. Open it to activate your account, then sign in.`, `أرسلنا رابط التحقق إلى ${pendingEmail}. افتحه لتفعيل حسابك ثم سجّل الدخول.`)}</p>
          <button type="button" className="access-text-link" onClick={resend} disabled={resent}>{resent ? tr('Link sent again', 'أُعيد إرسال الرابط') : tr('Send the link again', 'أعد إرسال الرابط')}</button>
        </div> : formBody(m, false)}
      </div></div>)}
    </div>{!embedded&&<a className="access-guest" href="/" onClick={()=>{try{window.sessionStorage.setItem('echo-guest','1');}catch{/* private mode: the guest flag is skipped */}}}>{tr('Continue as guest','المتابعة كضيف')}<ArrowUpRight size={16} aria-hidden="true" /></a>}
    {!embedded&&!isAuthenticated&&<div className="access-app-badge"><ClientAppBadge tr={tr} className="client-app-badge--access"/></div>}{!embedded&&!isAuthenticated&&<div className="access-rotate" role="note"><p>{tr("Please use your phone in portrait mode.","يرجى استخدام الهاتف بشكل عمودي.")}</p><p>{tr("Or download the app instead:","أو حمّل التطبيق بدلاً من ذلك:")}</p><ClientAppBadge tr={tr} className="client-app-badge--access"/></div>}</>}
  </section>;
  return embedded ? content : <EchoShell lang={lang}>{content}</EchoShell>;
}
