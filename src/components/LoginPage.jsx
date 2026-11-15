import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, AudioLines, Eye, EyeOff, LockKeyhole, Mail, MailCheck } from 'lucide-react';
import { apiRequest } from '../lib/api';
import EchoShell from '../echo/EchoShell';
import { usePageMeta } from '../echo/meta';
import './loginPage.css';
import GoogleSignIn from './GoogleSignIn';

export default function LoginPage({ lang, isAuthenticated, username, loginError, signupError, onLogin, onSignup, onLogout, onGoogleLogin, embedded=false }) {
  useLayoutEffect(() => {
    if (embedded) return;
    const root = document.documentElement;
    const viewport = window.visualViewport;
    const measure = () => {
      // Keep native pinch zoom available; only resize for the toolbar or keyboard.
      if (viewport && Math.abs(viewport.scale - 1) > .01) return;
      const zoom = parseFloat(getComputedStyle(root).zoom) || 1;
      root.style.setProperty('--echo-access-height', `${Math.min(innerHeight, viewport?.height || innerHeight) / zoom}px`);
    };
    root.classList.add('echo-access-open');
    measure();
    window.addEventListener('resize', measure);
    viewport?.addEventListener('resize', measure);
    return () => {
      root.classList.remove('echo-access-open');
      root.style.removeProperty('--echo-access-height');
      window.removeEventListener('resize', measure);
      viewport?.removeEventListener('resize', measure);
    };
  }, [embedded]);
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
  const submittedForm = useRef(null);
  const [signup, setSignup] = useState({ firstName: '', lastName: '', password: '', email: '', phoneNumber: '' });
  const errorFor = m => (submitMode === m ? submitError : '') || (m === 'signin' ? loginError : signupError);
  useEffect(() => {
    const alert = submittedForm.current?.querySelector('[role="alert"]');
    if (alert) { alert.scrollIntoView({block:'nearest'}); alert.focus({preventScroll:true}); }
  }, [submitError, loginError, signupError]);
  const resend = async () => { try { await apiRequest('/auth/resend-signup-verification', { method: 'POST', body: { email: pendingEmail } }); setResent(true); } catch { /* the link can be requested again */ } };
  const changeMode = value => { setMode(value); setShowPassword(false); setSubmitError(''); };
  const submit = (m = mode) => async event => {
    event.preventDefault();
    if (busy) return;
    submittedForm.current = event.currentTarget;
    setSubmitMode(m);
    if (m === 'signup' && signup.password !== confirmPassword) {
      setSubmitError(tr('Passwords do not match.', 'كلمتا المرور غير متطابقتين.'));
      return;
    }
    setBusy(true); setSubmitError('');
    try { const result = await (m === 'signin' ? onLogin({ email: name, password }) : onSignup(signup)); if (m === 'signup' && result?.pending) setPendingEmail(result.email || signup.email); }
    catch (failure) { setSubmitError(failure?.message || tr('We couldn’t sign you in. Please try again.', 'تعذر تسجيل الدخول. يرجى المحاولة مجدداً.')); }
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
            </> : <>{fields.map(([key, label, type, auto]) => <label className="access-field" key={key} htmlFor={'access-' + key + '-' + m}><span>{label}</span><span className="access-input">{key === 'email' ? <Mail size={17} aria-hidden="true" /> : key === 'password' ? <LockKeyhole size={17} aria-hidden="true" /> : null}<input id={'access-' + key + '-' + m} name={key} required type={key === 'password' && showPassword ? 'text' : type} autoComplete={auto} autoCapitalize={key === 'username' ? 'none' : undefined} minLength={key === 'password' ? 8 : undefined} value={signup[key]} onChange={event => setSignup(current => ({ ...current, [key]: event.target.value }))} />{key === 'password' && passwordToggle}</span></label>)}<label className="access-field" htmlFor={'access-confirm-password-'+m}><span>{tr('Confirm password', 'تأكيد كلمة المرور')}</span><span className="access-input"><LockKeyhole size={17} aria-hidden="true" /><input id={'access-confirm-password-'+m} name="confirmPassword" required type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} value={confirmPassword} onChange={event => { setConfirmPassword(event.target.value); setSubmitError(''); }} /></span></label><label className="access-field access-field--wide" htmlFor={'access-phoneNumber-'+m}><span>{tr('Phone number (optional)', 'رقم الهاتف (اختياري)')}</span><span className="access-input"><input id={'access-phoneNumber-'+m} name="phoneNumber" type="tel" autoComplete="tel" value={signup.phoneNumber} onChange={event => setSignup(current => ({ ...current, phoneNumber: event.target.value }))} /></span></label></>}
          </fieldset>
          {m === 'signin' ? <div className="access-form-options"><a href="/forgot-password">{tr('Forgot password?', 'نسيت كلمة المرور؟')}</a></div> : <p className={`access-password-help${signup.password.length >= 8 ? ' is-ok' : ''}`} aria-live="polite">{signup.password.length >= 8 ? tr('✓ Your password is long enough.', '✓ كلمة المرور طويلة بما يكفي.') : tr(`Your password needs at least 8 characters (${signup.password.length}/8).`, `تحتاج كلمة المرور إلى ٨ أحرف على الأقل (${signup.password.length}/٨).`)}</p>}
          <button className="access-submit" disabled={busy} type="submit"><span>{busy ? tr('One moment…', 'لحظة واحدة…') : m === 'signin' ? tr('Let’s get you in', 'لنبدأ معاً') : tr('Create your account', 'إنشاء حسابك')}</span>{busy ? <span className="access-loading" aria-hidden="true" /> : <ArrowRight size={19} aria-hidden="true" />}</button>
        </form>
        <div className="access-reassurance"><LockKeyhole size={13} aria-hidden="true" /><span>{tr('Your event planning, in your own space.', 'تخطيط فعاليتك في مساحتك الخاصة.')}</span></div>
      </>; };
  const content = <section className={embedded ? "echo-access echo-order-access" : "echo-access"} dir={ar ? 'rtl' : 'ltr'} aria-labelledby={embedded ? undefined : "access-title"} aria-label={embedded ? tr("Account access", "الدخول إلى الحساب") : undefined}>
    {!embedded && <><div className="access-backdrop" aria-hidden="true"/><img className="access-hero-photo" src="/echo/login-hero-khalil.webp" width="1016" height="1536" alt={tr('DJ Khalil in sunglasses and a black denim jacket','دي جي خليل بنظارة شمسية وجاكيت جينز أسود')} fetchPriority="high"/></>}

    {embedded || isAuthenticated ? <div className="access-content"><div className="access-form-wrap">
      {embedded && <header className="access-embedded-heading"><h2>{mode === 'signin' ? tr('Your next great event starts here.', 'فعاليتك القادمة تبدأ هنا.') : tr('Let’s make it yours.', 'لنصنع فعاليتك معاً.')}</h2><p>{mode === 'signin' ? tr('Sign in to plan with Echo AI.', 'سجّل الدخول للتخطيط مع إيكو AI.') : tr('Create an account to plan and keep your event details together.', 'أنشئ حساباً للتخطيط وحفظ تفاصيل فعاليتك في مكان واحد.')}</p></header>}
      {!embedded && <>
        <h1 id="access-title">{tr('You’re in.', 'أهلاً بك.')}</h1>
        <p className="access-intro">{tr('Everything you need for your next event is waiting for you.', 'كل ما تحتاجه لفعاليتك القادمة بانتظارك.')}</p>
      </>}
      {isAuthenticated ? <div className="access-signed-in"><span>{tr('SIGNED IN AS', 'تم تسجيل الدخول باسم')}</span><strong>{username}</strong><a className="access-submit" href="/dashboard">{lang.t.nav.dashboard}<ArrowUpRight size={18} /></a><button className="access-text-link" type="button" onClick={onLogout}>{tr('Sign out', 'تسجيل الخروج')}</button></div> : formBody(mode, true)}
    </div></div> : <div className="access-pair">
      {['signin', 'signup'].map(m => <div className="access-content" key={m}><div className="access-form-wrap" data-mode={m}>
        <h1 id={m === 'signin' ? 'access-title' : undefined}>{m === 'signin' ? <>{tr('Good to', 'سعداء')} <em>{tr('see you.', 'بعودتك.')}</em></> : <>{tr('Make it', 'لنصنع')} <em>{tr('your night.', 'ليلتك.')}</em></>}</h1>
        <p className="access-intro">{m === 'signin' ? tr('Already with us? Sign in to pick up where you left off.', 'معنا من قبل؟ سجّل الدخول لتتابع من حيث توقفت.') : tr('New here? Create your account to plan your next event with Echo.', 'جديد هنا؟ أنشئ حسابك لتخطط لفعاليتك القادمة مع إيكو.')}</p>
        {m === 'signup' && pendingEmail ? <div className="access-verify" role="status">
          <MailCheck size={34} aria-hidden="true" />
          <strong>{tr('Check your email', 'تحقق من بريدك الإلكتروني')}</strong>
          <p>{tr(`We sent a verification link to ${pendingEmail}. Open it to activate your account, then sign in.`, `أرسلنا رابط التحقق إلى ${pendingEmail}. افتحه لتفعيل حسابك ثم سجّل الدخول.`)}</p>
          <button type="button" className="access-text-link" onClick={resend} disabled={resent}>{resent ? tr('Link sent again', 'أُعيد إرسال الرابط') : tr('Send the link again', 'أعد إرسال الرابط')}</button>
        </div> : formBody(m, false)}
      </div></div>)}
    </div>}
  </section>;
  return embedded ? content : <EchoShell lang={lang}>{content}</EchoShell>;
}
