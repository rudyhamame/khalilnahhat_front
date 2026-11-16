import {ArrowLeft,ArrowRight,Mail,MailCheck,LockKeyhole,Eye,EyeOff,CheckCircle2} from 'lucide-react';
import {useAccessViewport} from '../lib/useAccessViewport';
import {usePageMeta} from './meta';
import '../components/loginPage.css';
import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

const qs = (k) => new URLSearchParams(window.location.search).get(k) || '';

export function VerifyEmailPage({ lang }) {
  const L = (en, ar) => (lang.lang === 'ar' ? ar : en);
  const [state, setState] = useState('working');
  useEffect(() => {
    apiRequest('/auth/verify-email', { method: 'POST', body: { token: qs('token') } })
      .then(() => setState('ok')).catch(() => setState('bad'));
  }, []);
  return (
    <section className="echo-section">
      <h1 className="echo-h1">{L('Email verification', 'تأكيد البريد الإلكتروني')}</h1>
      <p>{state === 'working' ? '…' : state === 'ok'
        ? L('Your email is verified. Thank you!', 'تم تأكيد بريدك الإلكتروني. شكراً لك!')
        : L('This verification link is invalid or already used.', 'رابط التأكيد غير صالح أو مستخدم سابقاً.')}</p>
      <a className="echo-btn" href="/dashboard">{L('Go to dashboard', 'إلى لوحة التحكم')}</a>
    </section>
  );
}

export function ForgotPasswordPage({ lang }) {
  const ar=lang.lang==='ar';
  const L = (en, ar) => (lang.lang === 'ar' ? ar : en);
  useAccessViewport();
  usePageMeta(L('Reset your password | DJ Khalil × Echo','إعادة تعيين كلمة المرور | دي جي خليل × إيكو'),L('Request a password reset link for your Echo account.','اطلب رابط إعادة تعيين كلمة المرور لحساب إيكو.'));
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy,setBusy]=useState(false);
  const submit = async (e) => {
    e.preventDefault();if(busy)return;setBusy(true);
    await apiRequest('/auth/forgot-password', { method: 'POST', body: { email } }).catch(() => {});
    setSent(true);setBusy(false);
  };
  return <section className="echo-access access-recovery" dir={ar?'rtl':'ltr'} aria-labelledby="recovery-title">
    <div className="access-backdrop" aria-hidden="true"/>
    <img className="access-hero-photo" src="/echo/login-hero-khalil.webp" width="1016" height="1536" alt="" aria-hidden="true" fetchPriority="high"/>
    <div className="access-content"><div className="access-form-wrap">
      <h1 id="recovery-title">{L('Forgot your','نسيت')} <em>{L('password?','كلمة المرور؟')}</em></h1>
      <p className="access-intro">{L('Enter your account email and we’ll send you a link to reset your password.','أدخل بريد حسابك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.')}</p>
      {sent?<div className="access-verify" role="status"><MailCheck size={34} aria-hidden="true"/><strong>{L('Check your email','تحقق من بريدك الإلكتروني')}</strong><p>{L('If that email is registered, a reset link is on its way.','إذا كان البريد مسجلاً فسيصلك رابط إعادة التعيين.')}</p></div>:<form className="access-form" onSubmit={submit} aria-busy={busy}>
        <fieldset className="access-fields" disabled={busy}><legend className="access-sr-only">{L('Password recovery','استعادة كلمة المرور')}</legend>
          <label className="access-field" htmlFor="recovery-email"><span>{L('Email address','البريد الإلكتروني')}</span><span className="access-input"><Mail size={18} aria-hidden="true"/><input id="recovery-email" name="email" type="email" required autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder={L('Your email address','بريدك الإلكتروني')} value={email} onChange={event=>setEmail(event.target.value)}/></span></label>
        </fieldset>
        <button className="access-submit" type="submit" disabled={busy}>{busy?<><span className="access-loading" aria-hidden="true"/>{L('Sending…','جارٍ الإرسال…')}</>:<>{L('Send reset link','إرسال رابط إعادة التعيين')}<ArrowRight size={18} aria-hidden="true"/></>}</button>
      </form>}
      <div className="access-footnote"><a href="/login"><ArrowLeft size={16} aria-hidden="true"/>{L('Back to sign in','العودة إلى تسجيل الدخول')}</a></div>
    </div></div>
  </section>;
}

export function ResetPasswordPage({ lang }) {
  const ar=lang.lang==='ar';
  const L = (en, ar) => (lang.lang === 'ar' ? ar : en);
  useAccessViewport();
  usePageMeta(L('Choose a new password | DJ Khalil × Echo','اختر كلمة مرور جديدة | دي جي خليل × إيكو'),L('Set a new password for your Echo account.','عيّن كلمة مرور جديدة لحساب إيكو.'));
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false);
  const [busy,setBusy]=useState(false),[showPassword,setShowPassword]=useState(false);
  const submit = async (e) => {
    e.preventDefault();if(busy)return;setBusy(true);setMsg('');
    try {
      await apiRequest('/auth/reset-password', { method: 'POST', body: { token: qs('token'), password } });
      setDone(true);setPassword('');
    } catch (err) {
      setMsg(err.message);
    } finally {setBusy(false);}
  };
  return <section className="echo-access access-recovery" dir={ar?'rtl':'ltr'} aria-labelledby="reset-title">
    <div className="access-backdrop" aria-hidden="true"/>
    <img className="access-hero-photo" src="/echo/login-hero-khalil.webp" width="1016" height="1536" alt="" aria-hidden="true" fetchPriority="high"/>
    <div className="access-content"><div className="access-form-wrap">
      <h1 id="reset-title">{L('Choose a new','اختر')} <em>{L('password.','كلمة مرور جديدة.')}</em></h1>
      {done?<><div className="access-verify" role="status"><CheckCircle2 size={34} aria-hidden="true"/><strong>{L('Password updated','تم تحديث كلمة المرور')}</strong><p>{L('You can now sign in with your new password.','يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.')}</p></div><a className="access-submit" href="/login">{L('Sign in','تسجيل الدخول')}<ArrowRight size={18} aria-hidden="true"/></a></>:<>
        <p className="access-intro">{L('Choose a password with at least 8 characters to get back to your account.','اختر كلمة مرور من ٨ أحرف على الأقل للعودة إلى حسابك.')}</p>
        <form className="access-form" onSubmit={submit} aria-busy={busy} aria-describedby={msg?'reset-error':undefined}>
          {msg&&<p id="reset-error" role="alert" className="access-error">{msg}</p>}
          <fieldset className="access-fields" disabled={busy}><legend className="access-sr-only">{L('New password','كلمة المرور الجديدة')}</legend>
            <label className="access-field" htmlFor="reset-password"><span>{L('New password','كلمة المرور الجديدة')}</span><span className="access-input"><LockKeyhole size={18} aria-hidden="true"/><input id="reset-password" name="password" type={showPassword?'text':'password'} required minLength={8} value={password} onChange={event=>setPassword(event.target.value)} autoComplete="new-password" placeholder={L('At least 8 characters','٨ أحرف على الأقل')} aria-describedby="reset-password-help"/><button className="access-password-toggle" type="button" disabled={busy} aria-pressed={showPassword} aria-label={showPassword?L('Hide password','إخفاء كلمة المرور'):L('Show password','إظهار كلمة المرور')} onClick={()=>setShowPassword(value=>!value)}>{showPassword?<EyeOff size={18} aria-hidden="true"/>:<Eye size={18} aria-hidden="true"/>}</button></span></label>
          </fieldset>
          <p id="reset-password-help" className={`access-password-help${password.length>=8?' is-ok':''}`}>{password.length>=8?L('Your password is long enough.','كلمة المرور طويلة بما يكفي.'):L('Use at least 8 characters.','استخدم ٨ أحرف على الأقل.')}</p>
          <button className="access-submit" type="submit" disabled={busy}>{busy?<><span className="access-loading" aria-hidden="true"/>{L('Updating…','جارٍ التحديث…')}</>:<>{L('Update password','تحديث كلمة المرور')}<ArrowRight size={18} aria-hidden="true"/></>}</button>
        </form>
      </>}
      {!done&&<div className="access-footnote"><a href="/login"><ArrowLeft size={16} aria-hidden="true"/>{L('Back to sign in','العودة إلى تسجيل الدخول')}</a></div>}
    </div></div>
  </section>;
}
