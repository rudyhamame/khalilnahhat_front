import { useState } from 'react';
import { validBookingDate } from '../lib/bookingCalendar';
import { clearCart, setCartItem, useCart } from './cart';

import { buildQuoteItems } from './quoteItems';
import { usePageMeta } from './meta';

const RETURN_KEY = 'khalil-auth-return';
const BLANK = {
  eventType: 'wedding', eventDate: '', startTime: '', endTime: '', phone: '', contactMethod: 'email', company: '',
  venueName: '', venueAddress: '', city: '', postalCode: '', inGta: true, indoor: true, guests: '',
  services: [], musicStyle: 'mixed', notes: '', setupRequirements: '', otherMusic: '', djMc: '', entrance: '', customMix: '', announcements: '',
};

export default function QuotePage({ lang, user, isSessionReady, onCreateServiceRequest }) {
  const { t } = lang;
  const q = t.q;
  const cart = useCart();
  const ar = lang.lang === 'ar';
  const tr = (en, arabic) => ar ? arabic : en;
  const draftKey = `echo-quote-draft:${user?.id || user?._id || 'guest'}`;
  const [draftMessage, setDraftMessage] = useState('');
  const [f, setF] = useState(() => {
    let form={...BLANK};
    try {
      const stored = JSON.parse(window.localStorage.getItem(draftKey) || window.localStorage.getItem('echo-quote-draft:guest') || 'null');
      if(stored?.form)form={...form,...stored.form};
    } catch { /* Continue with an empty form when storage is unavailable. */ }
    const params=new URLSearchParams(window.location.search);
    const date=params.get('eventDate'),type=params.get('eventType');
    if(validBookingDate(date))form.eventDate=date;
    if(Object.hasOwn(q.eventTypes,type))form.eventType=type;
    return form;
  });
  usePageMeta(tr('Request an Event Quote | Echo Toronto', 'اطلب عرض سعر | إيكو تورونتو'), q.intro);
  const saveDraft = () => {
    try { window.localStorage.setItem(draftKey, JSON.stringify({ form: f })); setDraftMessage(tr('Draft saved on this device.', 'تم حفظ المسودة على هذا الجهاز.')); return true; }
    catch { setDraftMessage(tr('Could not save on this device. Please keep this page open.', 'تعذر حفظ المسودة على هذا الجهاز. يرجى إبقاء الصفحة مفتوحة.')); return false; }
  };
  const discardDraft = () => {
    try { window.localStorage.removeItem(draftKey); window.localStorage.removeItem('echo-quote-draft:guest'); } catch { /* storage unavailable */ }
    setF(BLANK); setDraftMessage(tr('Draft cleared.', 'تم مسح المسودة.'));
  };
  const [state, setState] = useState({ busy: false, error: '', done: null });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggleSvc = (k) =>
    setF({ ...f, services: f.services.includes(k) ? f.services.filter((s) => s !== k) : [...f.services, k] });

  const signIn = () => {
    if (!saveDraft()) return;
    try { window.localStorage.setItem(RETURN_KEY, '/quote'); } catch { /* storage unavailable */ }
    window.location.href = '/login';
  };

  if (state.done) {
    return (
      <section className="echo-section">
        <h1 className="echo-h1">{q.done}</h1>
        <p>{q.doneText} <strong>{state.done}</strong></p>
        <p>{q.doneNext}</p>
        <a className="echo-btn" href="/dashboard">{q.dash}</a>
      </section>
    );
  }

  const items = Object.values(cart);
  const equipmentWanted = f.services.includes('rental') || items.length > 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!f.eventDate || !f.phone) return setState({ ...state, error: q.needFields });
    setState({ busy: true, error: '', done: null });
    try {
      const lines = buildQuoteItems(cart, f.services, q.svcs, q.eventTypes[f.eventType]);
      const result = await onCreateServiceRequest({
        items: lines,
        event: { ...f, guests: Number(f.guests) || 0, services: f.services },
      });
      clearCart();
      try { window.localStorage.removeItem(draftKey); window.localStorage.removeItem('echo-quote-draft:guest'); } catch { /* storage unavailable */ }
      setState({ busy: false, error: '', done: result.item?.requestNumber || '—' });
    } catch (err) {
      setState({ busy: false, error: err.message || 'Error', done: null });
    }
  };

  return (
    <section className="echo-section">
      <h1 className="echo-h1">{q.title}</h1>
      <p>{q.intro}</p>
      <div className="echo-draft-bar"><span>{tr('Save your progress on this device before leaving or signing in.', 'احفظ تقدمك على هذا الجهاز قبل المغادرة أو تسجيل الدخول.')}</span><button type="button" className="echo-link" onClick={saveDraft}>{tr('Save draft', 'حفظ المسودة')}</button><button type="button" className="echo-link" onClick={discardDraft}>{tr('Clear draft', 'مسح المسودة')}</button></div>
      {draftMessage && <p role="status" className="echo-status">{draftMessage}</p>}
      {(
        <form className="echo-form" onSubmit={submit}>
          <fieldset><legend>{q.customer}</legend>
            {user && <><label>{tr('Full name', 'الاسم الكامل')}<input value={`${user.firstName || ''} ${user.lastName || ''}`.trim()} readOnly autoComplete="name" /></label><label>{q.email}<input type="email" value={user.email || ''} readOnly autoComplete="email" /></label></>}
            {!user && <p className="echo-muted">{tr('Your name and email will be collected when you create your account before submitting.', 'سيُطلب اسمك وبريدك الإلكتروني عند إنشاء حسابك قبل إرسال الطلب.')}</p>}
            <label>{q.phone}*<input required value={f.phone} onChange={set('phone')} type="tel" autoComplete="tel" /></label>
            <label>{q.contact}
              <select value={f.contactMethod} onChange={set('contactMethod')}>
                {Object.entries(q.methods).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></label>
            <label>{q.company}<input value={f.company} onChange={set('company')} /></label>
          </fieldset>

          <fieldset><legend>{q.eventInfo}</legend>
            <label>{q.eventType}
              <select value={f.eventType} onChange={set('eventType')}>
                {Object.entries(q.eventTypes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></label>
            <label>{q.date}*<input required type="date" min={new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })} value={f.eventDate} onChange={set('eventDate')} /></label>
            <label>{q.start}<input type="time" value={f.startTime} onChange={set('startTime')} /></label>
            <label>{q.end}<input type="time" value={f.endTime} onChange={set('endTime')} /></label>
            <label>{q.venue}<input value={f.venueName} onChange={set('venueName')} /></label>
            <label>{q.address}<input value={f.venueAddress} onChange={set('venueAddress')} /></label>
            <label>{q.city}<input value={f.city} onChange={set('city')} /></label>
            <label>{q.postal}<input value={f.postalCode} onChange={set('postalCode')} autoComplete="postal-code" /></label>
            <label>{q.guests}<input type="number" min="0" value={f.guests} onChange={set('guests')} /></label>
            <label>{tr('Event area', 'منطقة الفعالية')}<select value={String(f.inGta)} onChange={(e) => setF({ ...f, inGta: e.target.value === 'true' })}><option value="true">{q.gta}</option><option value="false">{q.outGta}</option></select></label>
            <label>{tr('Event setting', 'مكان الفعالية')}<select value={String(f.indoor)} onChange={(e) => setF({ ...f, indoor: e.target.value === 'true' })}><option value="true">{q.indoor}</option><option value="false">{q.outdoor}</option></select></label>
            <label>{tr('Setup requirements', 'متطلبات التجهيز')}<textarea rows="3" maxLength={2000} value={f.setupRequirements} onChange={set('setupRequirements')} /></label>
          </fieldset>

          <fieldset><legend>{q.svc}</legend>
            {Object.entries(q.svcs).map(([k, v]) => (
              <label className="echo-check" key={k}>
                <input type="checkbox" checked={f.services.includes(k)} onChange={() => toggleSvc(k)} />{v}
              </label>
            ))}
          </fieldset>

          {equipmentWanted && (
            <fieldset><legend>{q.equip}</legend>
              {items.length ? items.map((i) => (
                <div className="echo-line" key={i.id}>
                  <span>{i.name}</span>
                  <input type="number" min={i.minQuantity || 1} value={i.quantity} aria-label={t.qty}
                    onChange={(e) => setCartItem(i, Math.max(i.minQuantity || 1, Math.floor(Number(e.target.value)) || 1))} />
                  <button type="button" className="echo-link" onClick={() => setCartItem(i, 0)}>{t.remove}</button>
                </div>
              )) : <p className="echo-muted">{q.noEquip}</p>}
              <a href="/equipment">{q.browse}</a>
            </fieldset>
          )}

          <fieldset><legend>{q.music}</legend>
            <label>{q.musicStyle}
              <select value={f.musicStyle} onChange={set('musicStyle')}>
                {Object.entries(q.musics).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></label>
            {[
              ['otherMusic', tr('Other music preferences', 'تفضيلات موسيقية أخرى')],
              ['djMc', tr('DJ / MC requirements', 'متطلبات الدي جي وتقديم الفقرات')],
              ['entrance', tr('Wedding entrance requirements', 'متطلبات دخول حفل الزفاف')],
              ['customMix', tr('Customized mix requests', 'طلبات ميكسات مخصصة')],
              ['announcements', tr('Special announcements', 'إعلانات خاصة')],
            ].map(([key, label]) => <label key={key}>{label}<textarea rows="2" maxLength={2000} value={f[key]} onChange={set(key)} /></label>)}
          </fieldset>

          <fieldset><legend>{q.extra}</legend>
            <label>{q.notes}<textarea rows="4" maxLength={3000} value={f.notes} onChange={set('notes')} /></label>
          </fieldset>

          {state.error && <p role="alert" className="echo-error">{state.error}</p>}
          {user ? <button className="echo-btn" disabled={state.busy || !isSessionReady}>{state.busy ? q.submitting : q.submit}</button> : <div><button type="button" className="echo-btn" disabled={!isSessionReady} onClick={signIn}>{q.signInCta}</button><p className="echo-muted">{q.signIn}</p></div>}
        </form>
      )}
    </section>
  );
}
