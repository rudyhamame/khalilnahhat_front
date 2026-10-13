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
  const L = (en, ar) => (lang.lang === 'ar' ? ar : en);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    await apiRequest('/auth/forgot-password', { method: 'POST', body: { email } }).catch(() => {});
    setSent(true);
  };
  return (
    <section className="echo-section">
      <h1 className="echo-h1">{L('Forgot password', 'نسيت كلمة المرور')}</h1>
      {sent ? <p>{L('If that email is registered, a reset link is on its way.', 'إذا كان البريد مسجلاً فسيصلك رابط إعادة التعيين.')}</p> : (
        <form className="echo-form" onSubmit={submit}>
          <fieldset><label>{L('Email', 'البريد الإلكتروني')}
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label></fieldset>
          <button className="echo-btn">{L('SEND RESET LINK', 'إرسال رابط إعادة التعيين')}</button>
        </form>
      )}
    </section>
  );
}

export function ResetPasswordPage({ lang }) {
  const L = (en, ar) => (lang.lang === 'ar' ? ar : en);
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/auth/reset-password', { method: 'POST', body: { token: qs('token'), password } });
      setDone(true);
    } catch (err) {
      setMsg(err.message);
    }
  };
  return (
    <section className="echo-section">
      <h1 className="echo-h1">{L('Choose a new password', 'اختر كلمة مرور جديدة')}</h1>
      {done ? <p>{L('Password updated.', 'تم تحديث كلمة المرور.')} <a href="/login">{L('Sign in', 'تسجيل الدخول')}</a></p> : (
        <form className="echo-form" onSubmit={submit}>
          <fieldset><label>{L('New password (8+ characters)', 'كلمة المرور الجديدة (8 أحرف على الأقل)')}
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></label></fieldset>
          {msg && <p role="alert" className="echo-error">{msg}</p>}
          <button className="echo-btn">{L('UPDATE PASSWORD', 'تحديث كلمة المرور')}</button>
        </form>
      )}
    </section>
  );
}
