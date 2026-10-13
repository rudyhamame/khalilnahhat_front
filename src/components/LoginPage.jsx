import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import EchoShell from '../echo/EchoShell';

export default function LoginPage({ lang, isAuthenticated, username, loginError, signupError, onLogin, onSignup, onLogout }) {
  const ar = lang.lang === 'ar';
  const tr = (en, arabic) => ar ? arabic : en;
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState(username || '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [signup, setSignup] = useState({ firstName: '', lastName: '', username: '', password: '', email: '', phoneNumber: '' });
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try { await (mode === 'signin' ? onLogin({ username: name, password }) : onSignup(signup)); }
    finally { setBusy(false); }
  };
  const fields = [
    ['firstName', tr('First name', 'الاسم الأول'), 'text', 'given-name'], ['lastName', tr('Last name', 'اسم العائلة'), 'text', 'family-name'],
    ['email', tr('Email address', 'البريد الإلكتروني'), 'email', 'email'], ['phoneNumber', tr('Phone number', 'رقم الهاتف'), 'tel', 'tel'],
    ['username', tr('Username', 'اسم المستخدم'), 'text', 'username'], ['password', tr('Password (at least 8 characters)', 'كلمة المرور (٨ أحرف على الأقل)'), 'password', 'new-password'],
  ];
  return <EchoShell lang={lang}><section className="echo-section echo-account">
    <div className="echo-account-intro"><p className="echo-eyebrow">{tr('YOUR EVENT, ALL IN ONE PLACE', 'فعاليتك في مكان واحد')}</p><h1 className="echo-h1">{tr('Welcome to\nyour backstage.', 'مرحباً بك\nخلف الكواليس.')}</h1><p>{tr('Your quotations, event details and planning — together in your client portal.', 'عروض الأسعار وتفاصيل الفعالية والتخطيط — معاً في حسابك.')}</p><div className="echo-account-photo" aria-hidden="true" /></div>
    <div className="echo-account-panel">{isAuthenticated ? <><p className="echo-eyebrow">{tr('SIGNED IN', 'تم تسجيل الدخول')}</p><h2>{username}</h2><a className="echo-btn" href="/dashboard/services">{lang.t.nav.dashboard}<ArrowUpRight size={18} /></a><button className="echo-link" type="button" onClick={onLogout}>{tr('Sign out', 'تسجيل الخروج')}</button></> : <>
      <div className="echo-tabs" role="group" aria-label={tr('Account access', 'الدخول إلى الحساب')}><button type="button" aria-pressed={mode === 'signin'} className={mode === 'signin' ? 'is-on' : ''} onClick={() => setMode('signin')}>{tr('Sign in', 'تسجيل الدخول')}</button><button type="button" aria-pressed={mode === 'signup'} className={mode === 'signup' ? 'is-on' : ''} onClick={() => setMode('signup')}>{tr('Create account', 'إنشاء حساب')}</button></div>
      <h2>{mode === 'signin' ? tr('Good to see you.', 'مرحباً بعودتك.') : tr('Let’s get started.', 'لنبدأ.')}</h2>
      <form className="echo-form" onSubmit={submit}><fieldset disabled={busy}>
        {mode === 'signin' ? <><label>{tr('Username', 'اسم المستخدم')}<input required autoComplete="username" value={name} onChange={(e) => setName(e.target.value)} /></label><label>{tr('Password', 'كلمة المرور')}<input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label></> : fields.map(([key, label, type, auto]) => <label key={key}>{label}<input required type={type} autoComplete={auto} minLength={key === 'password' ? 8 : undefined} value={signup[key]} onChange={(e) => setSignup({ ...signup, [key]: e.target.value })} /></label>)}
      </fieldset>
      {(mode === 'signin' ? loginError : signupError) && <p className="echo-error" role="alert">{mode === 'signin' ? loginError : signupError}</p>}
      <button className="echo-btn" disabled={busy}>{busy ? tr('Please wait…', 'يرجى الانتظار…') : mode === 'signin' ? tr('SIGN IN', 'تسجيل الدخول') : tr('CREATE ACCOUNT', 'إنشاء حساب')}</button>
      {mode === 'signin' && <a className="echo-link" href="/forgot-password">{tr('Forgot password?', 'نسيت كلمة المرور؟')}</a>}
      </form><p className="echo-muted">{tr('New quote requests do not reserve your date. You can review your custom quotation after our team prepares it.', 'طلبات عروض الأسعار لا تحجز التاريخ. يمكنك مراجعة عرضك المخصص بعد أن يعدّه فريقنا.')}</p>
    </>}</div>
  </section></EchoShell>;
}
