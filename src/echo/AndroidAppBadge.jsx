import { useState } from 'react';
import { apiRequest } from '../lib/api';
import './androidAppBadge.css';

// Admin-only: emails a 24 h download link for the Echo DJ Android app.
export default function AndroidAppBadge({ user, token, tr }) {
  const [open, setOpen] = useState(false), [state, setState] = useState({ busy: false, msg: '', ok: false });
  if (user?.isAdmin !== true || !token) return null;
  const send = async () => {
    setState({ busy: true, msg: '', ok: false });
    try { await apiRequest('/admin/android/send-link', { method: 'POST', token, body: {} }); setState({ busy: false, ok: true, msg: tr('Download link sent. Check your inbox.', 'تم إرسال رابط التنزيل. تحقق من بريدك.') }); }
    catch (err) { setState({ busy: false, ok: false, msg: err.message || tr('Could not send the link.', 'تعذر إرسال الرابط.') }); }
  };
  return <div className="android-badge">
    <button type="button" className="android-badge-btn" onClick={() => setOpen(o => !o)} aria-expanded={open}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.6 9.5a5.6 5.6 0 0 0-11.2 0zM8.6 7.2a.7.7 0 1 1 0-1.4.7.7 0 0 1 0 1.4m6.8 0a.7.7 0 1 1 0-1.4.7.7 0 0 1 0 1.4M6.4 10.3v6.4c0 .6.5 1.1 1.1 1.1h.9v2.1a1.1 1.1 0 0 0 2.2 0v-2.1h2.8v2.1a1.1 1.1 0 0 0 2.2 0v-2.1h.9c.6 0 1.1-.5 1.1-1.1v-6.4zM4.2 10.3a1.1 1.1 0 0 0-1.1 1.1v4.4a1.1 1.1 0 0 0 2.2 0v-4.4a1.1 1.1 0 0 0-1.1-1.1m15.6 0a1.1 1.1 0 0 0-1.1 1.1v4.4a1.1 1.1 0 0 0 2.2 0v-4.4a1.1 1.1 0 0 0-1.1-1.1"/></svg>
      <span><small>{tr('Admins only', 'للمشرفين فقط')}</small><b>Echo DJ {tr('for Android', 'لأندرويد')}</b></span>
    </button>
    {open && <div className="android-badge-form">
      <span>{tr('We will email the download link to your administrator address', 'سنرسل رابط التنزيل إلى بريدك الإلكتروني كمشرف')}{user.email?': '+user.email:'.'}</span>
      <button type="button" disabled={state.busy||state.ok} onClick={send}>{state.busy ? '…' : tr('Send me the link', 'أرسل لي الرابط')}</button>
      {state.msg && <p role="status" className={state.ok ? 'ok' : 'err'}>{state.msg}</p>}
    </div>}
  </div>;
}
