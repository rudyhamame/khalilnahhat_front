import { useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, AudioLines, Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react';
import EchoShell from '../echo/EchoShell';
import { usePageMeta } from '../echo/meta';
import './loginPage.css';

export default function LoginPage({ lang, isAuthenticated, username, loginError, signupError, onLogin, onSignup, onLogout }) {
  const ar = lang.lang === 'ar';
  const tr = (en, arabic) => ar ? arabic : en;
  usePageMeta(tr('Your Backstage Pass | DJ Khalil × Echo', 'تذكرتك إلى الكواليس | دي جي خليل × إيكو'), tr('Sign in or create your account to plan your next event with DJ Khalil and Echo Event Entertainment.', 'سجّل الدخول أو أنشئ حسابك للتخطيط لفعاليتك القادمة مع دي جي خليل وإيكو.'));
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState(username || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [signup, setSignup] = useState({ firstName: '', lastName: '', username: '', password: '', email: '', phoneNumber: '' });
  const error = submitError || (mode === 'signin' ? loginError : signupError);
  const changeMode = value => { setMode(value); setShowPassword(false); setSubmitError(''); };
  const submit = async event => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setSubmitError('');
    try { await (mode === 'signin' ? onLogin({ username: name, password }) : onSignup(signup)); }
    catch (failure) { setSubmitError(failure?.message || tr('We couldn’t sign you in. Please try again.', 'تعذر تسجيل الدخول. يرجى المحاولة مجدداً.')); }
    finally { setBusy(false); }
  };
  const fields = [
    ['firstName', tr('First name', 'الاسم الأول'), 'text', 'given-name'],
    ['lastName', tr('Last name', 'اسم العائلة'), 'text', 'family-name'],
    ['email', tr('Email address', 'البريد الإلكتروني'), 'email', 'email'],
    ['phoneNumber', tr('Phone number', 'رقم الهاتف'), 'tel', 'tel'],
    ['username', tr('Username', 'اسم المستخدم'), 'text', 'username'],
    ['password', tr('Password', 'كلمة المرور'), 'password', 'new-password'],
  ];
  const passwordToggle = <button className="access-password-toggle" type="button" disabled={busy} aria-pressed={showPassword}
    aria-label={showPassword ? tr('Hide password', 'إخفاء كلمة المرور') : tr('Show password', 'إظهار كلمة المرور')} onClick={() => setShowPassword(value => !value)}>
    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
  </button>;

  return <EchoShell lang={lang}><section className="echo-access" dir={ar ? 'rtl' : 'ltr'} aria-labelledby="access-title">
    <figure className="access-portrait">
      <img src="/echo/login-khalil-transparent-v2.png" width="1024" height="1536" alt={tr('DJ Khalil wearing jade green and headphones', 'دي جي خليل يرتدي اللون الأخضر وسماعات الرأس')} fetchPriority="high" />
      <div className="access-portrait-top"><AudioLines size={24} strokeWidth={1.3} aria-hidden="true" /></div>
      <figcaption><span className="access-artist-label">{tr('THE SOUND. THE MOMENT. THE EXPERIENCE.', 'الصوت. اللحظة. التجربة.')}</span><strong>DJ KHALIL<span>× ECHO</span></strong><div><span>{tr('Made for unforgettable nights.', 'لليالٍ لا تُنسى.')}</span><span className="access-portrait-mark" aria-hidden="true">↗</span></div></figcaption>
    </figure>

    <div className="access-content"><div className="access-form-wrap">
      <div className="access-kicker"><span aria-hidden="true" />{tr('YOUR BACKSTAGE PASS', 'تذكرتك إلى الكواليس')}</div>
      <h1 id="access-title">{isAuthenticated ? tr('You’re in.', 'أهلاً بك.') : mode === 'signin' ? <>{tr('Good to', 'سعداء')}<br /><em>{tr('see you.', 'بعودتك.')}</em></> : <>{tr('Make it', 'لنصنع')}<br /><em>{tr('your night.', 'ليلتك.')}</em></>}</h1>
      <p className="access-intro">{isAuthenticated ? tr('Everything you need for your next event is waiting for you.', 'كل ما تحتاجه لفعاليتك القادمة بانتظارك.') : tr('Your plans, your details, your next unforgettable event. All together, right here.', 'خططك وتفاصيلك وفعاليتك القادمة التي لا تُنسى. كلها معاً، هنا.')}</p>

      {isAuthenticated ? <div className="access-signed-in"><span>{tr('SIGNED IN AS', 'تم تسجيل الدخول باسم')}</span><strong>{username}</strong><a className="access-submit" href="/dashboard">{lang.t.nav.dashboard}<ArrowUpRight size={18} /></a><button className="access-text-link" type="button" onClick={onLogout}>{tr('Sign out', 'تسجيل الخروج')}</button></div> : <>
        <div className="access-switch" role="group" aria-label={tr('Account access', 'الدخول إلى الحساب')}>
          <button type="button" disabled={busy} aria-pressed={mode === 'signin'} onClick={() => changeMode('signin')}>{tr('Sign in', 'تسجيل الدخول')}</button>
          <button type="button" disabled={busy} aria-pressed={mode === 'signup'} onClick={() => changeMode('signup')}>{tr('Create account', 'إنشاء حساب')}</button>
        </div>
        <form className="access-form" onSubmit={submit} aria-busy={busy} aria-describedby={error ? 'access-error' : undefined}>
          <fieldset disabled={busy} className={mode === 'signup' ? 'access-fields access-fields--signup' : 'access-fields'}><legend className="access-sr-only">{mode === 'signin' ? tr('Sign in details', 'بيانات تسجيل الدخول') : tr('Create your account', 'إنشاء حسابك')}</legend>
            {mode === 'signin' ? <>
              <label className="access-field" htmlFor="access-username"><span>{tr('Username', 'اسم المستخدم')}</span><span className="access-input"><UserRound size={18} aria-hidden="true" /><input id="access-username" name="username" required autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder={tr('Your username', 'اسم المستخدم الخاص بك')} value={name} onChange={event => setName(event.target.value)} /></span></label>
              <label className="access-field" htmlFor="access-password"><span>{tr('Password', 'كلمة المرور')}</span><span className="access-input"><LockKeyhole size={18} aria-hidden="true" /><input id="access-password" name="password" required type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder={tr('Your password', 'كلمة المرور الخاصة بك')} value={password} onChange={event => setPassword(event.target.value)} />{passwordToggle}</span></label>
            </> : fields.map(([key, label, type, auto]) => <label className="access-field" key={key} htmlFor={'access-' + key}><span>{label}</span><span className="access-input">{key === 'email' ? <Mail size={17} aria-hidden="true" /> : key === 'password' ? <LockKeyhole size={17} aria-hidden="true" /> : null}<input id={'access-' + key} name={key} required type={key === 'password' && showPassword ? 'text' : type} autoComplete={auto} autoCapitalize={key === 'username' ? 'none' : undefined} minLength={key === 'password' ? 8 : undefined} value={signup[key]} onChange={event => setSignup(current => ({ ...current, [key]: event.target.value }))} />{key === 'password' && passwordToggle}</span></label>)}
          </fieldset>
          {mode === 'signin' ? <div className="access-form-options"><a href="/forgot-password">{tr('Forgot password?', 'نسيت كلمة المرور؟')}</a></div> : <p className="access-password-help">{tr('Use at least 8 characters for your password.', 'استخدم ٨ أحرف على الأقل لكلمة المرور.')}</p>}
          {error && <p className="access-error" id="access-error" role="alert">{error}</p>}
          <button className="access-submit" disabled={busy} type="submit"><span>{busy ? tr('One moment…', 'لحظة واحدة…') : mode === 'signin' ? tr('Let’s get you in', 'لنبدأ معاً') : tr('Create your account', 'إنشاء حسابك')}</span>{busy ? <span className="access-loading" aria-hidden="true" /> : <ArrowRight size={19} aria-hidden="true" />}</button>
        </form>
        <div className="access-reassurance"><LockKeyhole size={13} aria-hidden="true" /><span>{tr('Your event planning, in your own space.', 'تخطيط فعاليتك في مساحتك الخاصة.')}</span></div>
      </>}
      <div className="access-footnote"><a href="/"><ArrowLeft size={15} aria-hidden="true" />{tr('Back to the experience', 'العودة إلى التجربة')}</a><p>{tr('A quote request doesn’t reserve your date. You can review your custom quotation once our team prepares it.', 'طلب عرض السعر لا يحجز تاريخك. يمكنك مراجعة عرضك المخصص بعد أن يعدّه فريقنا.')}</p></div>
    </div></div>
  </section></EchoShell>;
}
