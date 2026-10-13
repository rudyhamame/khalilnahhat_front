import { useState } from 'react';
import { clearCart, setCartItem, useCart } from './cart';

const RETURN_KEY = 'khalil-auth-return';
const BLANK = {
  eventType: 'wedding', eventDate: '', startTime: '', endTime: '', phone: '', contactMethod: 'email', company: '',
  venueName: '', venueAddress: '', city: '', postalCode: '', inGta: true, indoor: true, guests: '',
  services: [], musicStyle: 'mixed', notes: '',
};

export default function QuotePage({ lang, user, isSessionReady, onCreateServiceRequest }) {
  const { t } = lang;
  const q = t.q;
  const cart = useCart();
  const [f, setF] = useState(BLANK);
  const [state, setState] = useState({ busy: false, error: '', done: null });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggleSvc = (k) =>
    setF({ ...f, services: f.services.includes(k) ? f.services.filter((s) => s !== k) : [...f.services, k] });

  const signIn = () => {
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
      const lines = items.length
        ? items.map(({ id, name, category, quantity }) => ({ serviceId: id, name, category, quantity }))
        : f.services.map((s) => ({ serviceId: `svc-${s}`, name: q.svcs[s], category: 'service', quantity: 1 }));
      if (!lines.length) lines.push({ serviceId: 'svc-general', name: q.eventTypes[f.eventType], category: 'service', quantity: 1 });
      const result = await onCreateServiceRequest({
        items: lines,
        event: { ...f, guests: Number(f.guests) || 0, services: f.services },
      });
      clearCart();
      setState({ busy: false, error: '', done: result.item?.requestNumber || '—' });
    } catch (err) {
      setState({ busy: false, error: err.message || 'Error', done: null });
    }
  };

  return (
    <section className="echo-section">
      <h1 className="echo-h1">{q.title}</h1>
      <p>{q.intro}</p>
      {isSessionReady && !user ? (
        <p><button type="button" className="echo-btn" onClick={signIn}>{q.signInCta}</button> <span className="echo-muted">{q.signIn}</span></p>
      ) : (
        <form className="echo-form" onSubmit={submit}>
          <fieldset><legend>{q.customer}</legend>
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
            <label>{q.date}*<input required type="date" value={f.eventDate} onChange={set('eventDate')} /></label>
            <label>{q.start}<input type="time" value={f.startTime} onChange={set('startTime')} /></label>
            <label>{q.end}<input type="time" value={f.endTime} onChange={set('endTime')} /></label>
            <label>{q.venue}<input value={f.venueName} onChange={set('venueName')} /></label>
            <label>{q.address}<input value={f.venueAddress} onChange={set('venueAddress')} /></label>
            <label>{q.city}<input value={f.city} onChange={set('city')} /></label>
            <label>{q.postal}<input value={f.postalCode} onChange={set('postalCode')} autoComplete="postal-code" /></label>
            <label>{q.guests}<input type="number" min="0" value={f.guests} onChange={set('guests')} /></label>
            <label className="echo-check"><input type="checkbox" checked={f.inGta} onChange={(e) => setF({ ...f, inGta: e.target.checked })} />{q.gta}</label>
            <label className="echo-check"><input type="checkbox" checked={f.indoor} onChange={(e) => setF({ ...f, indoor: e.target.checked })} />{q.indoor}</label>
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
                  <input type="number" min="1" value={i.quantity} aria-label={t.qty}
                    onChange={(e) => setCartItem(i, Math.max(1, Number(e.target.value) || 1))} />
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
          </fieldset>

          <fieldset><legend>{q.extra}</legend>
            <label>{q.notes}<textarea rows="4" value={f.notes} onChange={set('notes')} /></label>
          </fieldset>

          {state.error && <p role="alert" className="echo-error">{state.error}</p>}
          <button className="echo-btn" disabled={state.busy || !isSessionReady}>{state.busy ? q.submitting : q.submit}</button>
        </form>
      )}
    </section>
  );
}
