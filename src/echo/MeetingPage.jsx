import { useCallback, useEffect, useState } from 'react';
import { apiBaseUrl, apiRequest } from '../lib/api';
import { usePageMeta } from './meta';

const RETURN_KEY = 'khalil-auth-return';

export default function MeetingPage({ lang, user, token, isSessionReady }) {
  const L = (en, ar) => (lang.lang === 'ar' ? ar : en);
  usePageMeta('Book a Meeting | Echo Event Entertainment', 'Book an online or in-person consultation with DJ Khalil and Echo Event Entertainment.');
  const [slots, setSlots] = useState([]);
  const [mine, setMine] = useState([]);
  const [topic, setTopic] = useState('');
  const [msg, setMsg] = useState('');
  const [moving, setMoving] = useState('');

  const load = useCallback(async () => {
    const s = await apiRequest('/meetings/slots').catch(() => ({ items: [] }));
    setSlots(s.items);
    if (token && user) setMine((await apiRequest('/meetings/mine', { token }).catch(() => ({ items: [] }))).items);
  }, [token, user]);
  useEffect(() => { load(); }, [load]);

  const fmt = (d) => new Intl.DateTimeFormat(lang.lang === 'ar' ? 'ar-CA' : 'en-CA', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Toronto' }).format(new Date(d));
  const mode = (m) => (m === 'online' ? L('Online', 'عبر الإنترنت') : L('In person', 'حضورياً'));
  const act = async (fn) => {
    setMsg('');
    try { await fn(); await load(); } catch (e) { setMsg(e.message); await load(); }
  };
  const signIn = () => {
    try { window.localStorage.setItem(RETURN_KEY, '/meeting'); } catch { /* storage unavailable */ }
    window.location.href = '/login';
  };
  const downloadIcs = async (id) => {
    const r = await fetch(`${apiBaseUrl}/meetings/${id}/ics`, { headers: { Authorization: `Bearer ${token}` } });
    const url = URL.createObjectURL(await r.blob());
    Object.assign(document.createElement('a'), { href: url, download: 'meeting.ics' }).click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="echo-section">
      <h1 className="echo-h1">{L('Book a Meeting', 'احجز اجتماعاً')}</h1>
      <p>{L('Pick a time for an online or in-person consultation. Times are shown in Toronto time.', 'اختر وقتاً لاستشارة عبر الإنترنت أو حضورية. الأوقات بتوقيت تورونتو.')}</p>
      {msg && <p role="alert" className="echo-error">{msg}</p>}

      {mine.length > 0 && (
        <>
          <h2>{L('My meetings', 'اجتماعاتي')}</h2>
          {mine.map((m) => (
            <div className="echo-card" key={m.id}>
              <strong>{fmt(m.start)}</strong>
              <span>{mode(m.mode)}{m.mode === 'online' && m.link ? <> · <a href={m.link}>{L('Join link', 'رابط الانضمام')}</a></> : m.location ? ` · ${m.location}` : ''}</span>
              <div className="echo-ctas">
                <button type="button" className="echo-link" onClick={() => downloadIcs(m.id)}>{L('Add to calendar', 'إضافة إلى التقويم')}</button>
                <button type="button" className="echo-link" onClick={() => act(() => apiRequest(`/meetings/${m.id}/cancel`, { method: 'POST', token }))}>{L('Cancel', 'إلغاء')}</button>
                <button type="button" className="echo-link" onClick={() => setMoving(moving === m.id ? '' : m.id)}>{L('Reschedule', 'إعادة جدولة')}</button>
              </div>
              {moving === m.id && (
                <select defaultValue="" onChange={(e) => e.target.value && act(async () => {
                  await apiRequest(`/meetings/${m.id}/reschedule`, { method: 'POST', token, body: { toSlotId: e.target.value } });
                  setMoving('');
                })}>
                  <option value="" disabled>{L('Choose a new time', 'اختر وقتاً جديداً')}</option>
                  {slots.map((s) => <option key={s.id} value={s.id}>{fmt(s.start)}</option>)}
                </select>
              )}
            </div>
          ))}
        </>
      )}

      <h2>{L('Available times', 'الأوقات المتاحة')}</h2>
      {isSessionReady && !user && <p><button type="button" className="echo-btn" onClick={signIn}>{L('Sign in / Register to book', 'سجّل الدخول للحجز')}</button></p>}
      {user && <label className="echo-form"><span>{L('What would you like to discuss? (optional)', 'ما الذي تود مناقشته؟ (اختياري)')}</span>
        <textarea rows="2" value={topic} onChange={(e) => setTopic(e.target.value)} /></label>}
      {!slots.length && <p className="echo-muted">{L('No times are open right now. Please check back soon or request a quote.', 'لا توجد أوقات متاحة حالياً. تحقق لاحقاً أو اطلب عرض سعر.')}</p>}
      <div className="echo-grid">
        {slots.map((s) => (
          <article className="echo-card" key={s.id}>
            <strong>{fmt(s.start)}</strong>
            <span className="echo-muted">{mode(s.mode)} · {s.durationMin} {L('min', 'دقيقة')}</span>
            {user && <button type="button" className="echo-btn" onClick={() => act(() => apiRequest(`/meetings/${s.id}/book`, { method: 'POST', token, body: { topic } }))}>{L('BOOK', 'احجز')}</button>}
          </article>
        ))}
      </div>
    </section>
  );
}
