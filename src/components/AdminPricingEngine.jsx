import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Play, TriangleAlert, Info, CircleX } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { adminToast } from './adminToast';
import './pricingEngine.css';

const money = (cents) => (Number(cents || 0) / 100).toLocaleString('en-CA', { style: 'currency', currency: 'CAD' });
const toCents = (v) => Math.round(Number(v || 0) * 100);
const MODE_LABEL = { fixed: 'Fixed (per event)', hourly: 'Hourly', daily: 'Daily', per_unit: 'Per unit', per_unit_per_day: 'Per unit per day', tiered: 'Tiered by quantity', custom_quote: 'Custom quote', included: 'Included (free)' };
const needsAmount = (mode) => ['fixed', 'hourly', 'daily', 'per_unit', 'per_unit_per_day'].includes(mode);
const BLANK = { offeringId: '', name: '', pricingMode: 'fixed', amount: '', minimumDuration: '', includedQuantity: '', additionalRate: '', priority: 0, status: 'draft', effectiveFrom: '', effectiveUntil: '', tiers: [], conditions: [] };
const parseValue = (op, raw) => (op === 'in' || op === 'between' ? String(raw).split(',').map((x) => (x.trim() !== '' && !isNaN(x) ? Number(x) : x.trim())) : raw === 'true' ? true : raw === 'false' ? false : raw !== '' && !isNaN(raw) ? Number(raw) : raw);

function toPayload(f) {
  const body = { offeringId: f.offeringId, name: f.name.trim(), pricingMode: f.pricingMode, baseAmountCents: needsAmount(f.pricingMode) ? toCents(f.amount) : 0, priority: Number(f.priority) || 0, status: f.status,
    tiers: f.tiers.map((t) => ({ from: Number(t.from), to: t.to === '' ? null : Number(t.to), rateCents: toCents(t.rate) })),
    conditions: f.conditions.map((c) => ({ field: c.field.trim(), operator: c.operator, value: parseValue(c.operator, c.value), adjustmentType: c.adjustmentType, adjustmentValue: c.adjustmentType === 'percent' ? Math.round(Number(c.adjustmentValue) * 100) : toCents(c.adjustmentValue), priority: 0 })) };
  if (f.minimumDuration !== '') body.minimumDuration = Number(f.minimumDuration);
  if (f.includedQuantity !== '') body.includedQuantity = Number(f.includedQuantity);
  if (f.additionalRate !== '') body.additionalUnitRateCents = toCents(f.additionalRate);
  if (f.effectiveFrom) body.effectiveFrom = f.effectiveFrom;
  if (f.effectiveUntil) body.effectiveUntil = f.effectiveUntil;
  return body;
}
const toForm = (p) => ({ ...BLANK, offeringId: p.offeringId, name: p.name, pricingMode: p.pricingMode, amount: (p.baseAmountCents / 100).toFixed(2), minimumDuration: p.minimumDuration ?? '', includedQuantity: p.includedQuantity ?? '', additionalRate: p.additionalUnitRateCents != null ? (p.additionalUnitRateCents / 100).toFixed(2) : '', priority: p.priority, status: p.status, effectiveFrom: p.effectiveFrom || '', effectiveUntil: p.effectiveUntil || '',
  tiers: (p.tiers || []).map((t) => ({ from: t.from, to: t.to ?? '', rate: (t.rateCents / 100).toFixed(2) })),
  conditions: (p.conditions || []).map((c) => ({ field: c.field, operator: c.operator, value: Array.isArray(c.value) ? c.value.join(',') : String(c.value), adjustmentType: c.adjustmentType, adjustmentValue: c.adjustmentType === 'percent' ? c.adjustmentValue / 100 : (c.adjustmentValue / 100).toFixed(2) })) });

function PolicyForm({ form, setForm, offerings, onSave, onCancel, busy, editing }) {
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const row = (key, i, patch) => set(key, form[key].map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return <form className="pe-form" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
    <label>Offering<select required value={form.offeringId} onChange={(e) => set('offeringId', e.target.value)}><option value="">Choose…</option>{offerings.map((o) => <option key={o.id} value={o.id}>{o.name} · {o.type}</option>)}</select></label>
    <label>Policy name<input required maxLength={160} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Weekend rate" /></label>
    <label>Pricing mode<select value={form.pricingMode} onChange={(e) => set('pricingMode', e.target.value)}>{Object.entries(MODE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
    {needsAmount(form.pricingMode) && <label>Rate (CAD)<input required type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} /></label>}
    {form.pricingMode === 'hourly' && <label>Minimum hours<input type="number" min="0" step="0.5" value={form.minimumDuration} onChange={(e) => set('minimumDuration', e.target.value)} /></label>}
    {['fixed', 'per_unit'].includes(form.pricingMode) && <><label>Included quantity<input type="number" min="1" value={form.includedQuantity} onChange={(e) => set('includedQuantity', e.target.value)} /></label><label>Each extra unit (CAD)<input type="number" min="0" step="0.01" value={form.additionalRate} onChange={(e) => set('additionalRate', e.target.value)} /></label></>}
    <label>Priority (higher wins)<input type="number" min="0" value={form.priority} onChange={(e) => set('priority', e.target.value)} /></label>
    <label>Status<select value={form.status} onChange={(e) => set('status', e.target.value)}><option value="draft">Draft (not used)</option><option value="active">Active</option></select></label>
    <label>Effective from<input type="date" value={form.effectiveFrom} onChange={(e) => set('effectiveFrom', e.target.value)} /></label>
    <label>Effective until<input type="date" value={form.effectiveUntil} onChange={(e) => set('effectiveUntil', e.target.value)} /></label>
    {form.pricingMode === 'tiered' && <fieldset className="pe-wide"><legend>Tiers (the whole quantity is charged at its tier's rate)</legend>
      {form.tiers.map((t, i) => <div className="pe-row" key={i}><input type="number" min="1" placeholder="From qty" value={t.from} onChange={(e) => row('tiers', i, { from: e.target.value })} /><input type="number" min="1" placeholder="To (blank = no limit)" value={t.to} onChange={(e) => row('tiers', i, { to: e.target.value })} /><input type="number" min="0" step="0.01" placeholder="Rate / unit" value={t.rate} onChange={(e) => row('tiers', i, { rate: e.target.value })} /><button type="button" aria-label="Remove tier" onClick={() => set('tiers', form.tiers.filter((_, j) => j !== i))}><Trash2 size={15} /></button></div>)}
      <button type="button" className="cat-btn" onClick={() => set('tiers', [...form.tiers, { from: '', to: '', rate: '' }])}><Plus size={14} />Add tier</button></fieldset>}
    <fieldset className="pe-wide"><legend>Conditional adjustments (only apply when you add a rule; percentages apply to the base charge)</legend>
      {form.conditions.map((c, i) => <div className="pe-row pe-cond" key={i}>
        <input placeholder="Field (hours, weekend, venue…)" value={c.field} onChange={(e) => row('conditions', i, { field: e.target.value })} />
        <select value={c.operator} onChange={(e) => row('conditions', i, { operator: e.target.value })}>{[['eq', '='], ['neq', '≠'], ['gt', '>'], ['lt', '<'], ['between', 'between'], ['contains', 'contains'], ['in', 'in list']].map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <input placeholder="Value (comma list for in/between)" value={c.value} onChange={(e) => row('conditions', i, { value: e.target.value })} />
        <select value={c.adjustmentType} onChange={(e) => row('conditions', i, { adjustmentType: e.target.value })}>{[['fixed', 'Add amount'], ['percent', 'Add %'], ['per_additional_unit', 'Per extra unit'], ['per_additional_hour', 'Per extra hour'], ['override', 'Set price to']].map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <input type="number" step="0.01" placeholder={c.adjustmentType === 'percent' ? '%' : 'CAD'} value={c.adjustmentValue} onChange={(e) => row('conditions', i, { adjustmentValue: e.target.value })} />
        <button type="button" aria-label="Remove rule" onClick={() => set('conditions', form.conditions.filter((_, j) => j !== i))}><Trash2 size={15} /></button></div>)}
      <button type="button" className="cat-btn" onClick={() => set('conditions', [...form.conditions, { field: '', operator: 'eq', value: '', adjustmentType: 'fixed', adjustmentValue: '' }])}><Plus size={14} />Add rule</button></fieldset>
    <div className="pe-actions pe-wide"><button className="cat-btn is-primary" disabled={busy}>{editing ? 'Save policy' : 'Add policy'}</button>{(editing || form.offeringId) && <button type="button" className="cat-btn" onClick={onCancel}>Cancel</button>}</div>
  </form>;
}

function Simulator({ offerings, token }) {
  const [lines, setLines] = useState([{ offeringId: '', quantity: 1 }]);
  const [event, setEvent] = useState({ hours: '', days: '', date: '', startTime: '', endTime: '' });
  const [prep, setPrep] = useState(''), [dismantle, setDismantle] = useState('');
  const [tax, setTax] = useState(''), [discount, setDiscount] = useState(''), [fee, setFee] = useState('');
  const [out, setOut] = useState(null), [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const body = { selections: lines.filter((l) => l.offeringId).map((l) => ({ offeringId: l.offeringId, quantity: Number(l.quantity) })), event: { ...(event.hours !== '' ? { hours: Number(event.hours) } : {}), ...(event.days !== '' ? { days: Number(event.days) } : {}), ...(event.date ? { date: event.date } : {}), ...(event.startTime ? { startTime: event.startTime } : {}), ...(event.endTime ? { endTime: event.endTime } : {}) },
        prepMinutes: Math.round(Number(prep) || 0), dismantleMinutes: Math.round(Number(dismantle) || 0),
        taxes: tax ? [{ name: 'Tax', rateBps: Math.round(Number(tax) * 100) }] : [], discounts: discount ? [{ name: 'Discount', type: 'percent', value: Math.round(Number(discount) * 100) }] : [], fees: fee ? [{ name: 'Fee', amountCents: toCents(fee) }] : [] };
      setOut(await apiRequest('/admin/pricing/simulate', { method: 'POST', token, body }));
    } catch (e) { adminToast(e.message || 'Simulation failed.', true); } finally { setBusy(false); }
  };
  const r = out?.result;
  return <div className="pe-sim">
    <div className="pe-sim-in">
      {lines.map((l, i) => <div className="pe-row" key={i}><select value={l.offeringId} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, offeringId: e.target.value } : x)))}><option value="">Offering…</option>{offerings.filter((o) => o.isActive).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select><input type="number" min="1" value={l.quantity} aria-label="Quantity" onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} /><button type="button" aria-label="Remove" onClick={() => setLines(lines.filter((_, j) => j !== i))}><Trash2 size={15} /></button></div>)}
      <button type="button" className="cat-btn" onClick={() => setLines([...lines, { offeringId: '', quantity: 1 }])}><Plus size={14} />Add item</button>
      <div className="pe-grid">
        <label>Event hours<input type="number" min="0" step="0.5" value={event.hours} onChange={(e) => setEvent({ ...event, hours: e.target.value })} /></label>
        <label>Rental days<input type="number" min="1" value={event.days} onChange={(e) => setEvent({ ...event, days: e.target.value })} /></label>
        <label>Event date<input type="date" value={event.date} onChange={(e) => setEvent({ ...event, date: e.target.value })} /></label>
        <label>Start time<input type="time" value={event.startTime} onChange={(e) => setEvent({ ...event, startTime: e.target.value })} /></label>
        <label>End time<input type="time" value={event.endTime} onChange={(e) => setEvent({ ...event, endTime: e.target.value })} /></label>
        <label>Setup buffer (min)<input type="number" min="0" step="15" value={prep} onChange={(e) => setPrep(e.target.value)} /></label>
        <label>Dismantle buffer (min)<input type="number" min="0" step="15" value={dismantle} onChange={(e) => setDismantle(e.target.value)} /></label>
        <label>Discount %<input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} /></label>
        <label>Extra fee (CAD)<input type="number" min="0" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} /></label>
        <label>Tax %<input type="number" min="0" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} /></label>
      </div>
      <button type="button" className="cat-btn is-primary" disabled={busy} onClick={run}><Play size={14} />Calculate</button>
    </div>
    {r && <div className="pe-result" aria-live="polite">
      <p className={`pe-status ${r.quoteRequired ? 'is-quote' : ''}`}>{r.quoteRequired ? 'Quote required: estimate only' : 'Priced estimate (not a confirmed booking)'}</p>
      <table><thead><tr><th>Item</th><th>Qty</th><th>Basis</th><th>Total</th></tr></thead><tbody>{r.items.map((i, k) => <tr key={k} className={i.parent ? 'is-child' : ''}><td>{i.name}{i.status === 'included' ? ' · included' : ''}{i.status === 'quote_required' ? ' · needs quote' : ''}{i.adjustments.map((a, n) => <small key={n}>{a.label}: {money(a.change)}</small>)}</td><td>{i.quantity}</td><td>{i.billingBasis || '—'}</td><td>{i.status === 'quote_required' ? '—' : money(i.total)}</td></tr>)}</tbody></table>
      <dl>{[['Services', r.serviceSubtotal], ['Equipment', r.equipmentSubtotal], ['Packages', r.packageSubtotal], ['Fees', r.additionalFees], ['Discounts', -r.discountTotal], ['Before tax', r.subtotalBeforeTax], ...r.taxes.map((t) => [t.name, t.amount]), ['Total', r.total]].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{money(v)}</dd></div>)}</dl>
      {r.warnings.map((w, i) => <p className="pe-warn" key={i}><TriangleAlert size={14} />{w}</p>)}
      {out.availability?.checked ? <div className="pe-avail"><p className={`pe-status ${out.availability.ok ? '' : 'is-quote'}`}>{out.availability.ok ? (out.availability.needsConfirmation ? 'Available, but some items are on request and need confirmation' : 'Resources available for this window') : 'Not fully available'}</p>
        <ul>{out.availability.lines.map((l) => <li key={l.offeringId}>{l.name}: {l.requested} needed · {l.status === 'on_request' ? 'on request' : l.status === 'unavailable' ? 'unavailable' : `${l.available} free`}</li>)}</ul></div> : <p className="pe-muted">Enter an event date to check availability. Without start and end times the whole day is treated as busy.</p>}
      {Object.keys(out.demand).length > 0 && <p className="pe-muted">Reserves stock: {Object.entries(out.demand).map(([id, n]) => `${offerings.find((o) => o.id === id)?.name || id} ×${n}`).join(', ')}</p>}
      <p className="pe-muted">Policies used: {r.policyVersion}</p>
    </div>}
  </div>;
}

export default function AdminPricingEngine({ token }) {
  const [data, setData] = useState({ offerings: [], policies: [], issues: [] });
  const [form, setForm] = useState(BLANK), [editId, setEditId] = useState(null), [busy, setBusy] = useState(false), [open, setOpen] = useState(false);
  const load = useCallback(() => apiRequest('/admin/pricing', { token }).then(setData).catch((e) => adminToast(e.message || 'Pricing could not be loaded.', true)), [token]);
  useEffect(() => { load(); }, [load]);
  const nameOf = useMemo(() => new Map(data.offerings.map((o) => [o.id, o.name])), [data.offerings]);
  const save = async () => {
    setBusy(true);
    try { await apiRequest(editId ? `/admin/pricing/policies/${editId}` : '/admin/pricing/policies', { method: editId ? 'PUT' : 'POST', token, body: toPayload(form) }); adminToast('Pricing policy saved.'); setForm(BLANK); setEditId(null); setOpen(false); await load(); }
    catch (e) { adminToast(e.message || 'The policy could not be saved.', true); } finally { setBusy(false); }
  };
  const remove = async (p) => { try { await apiRequest(`/admin/pricing/policies/${p.id}`, { method: 'DELETE', token }); adminToast('Policy deleted.'); load(); } catch (e) { adminToast(e.message || 'Could not delete.', true); } };
  const Icon = { error: CircleX, warning: TriangleAlert, info: Info };
  return <div className="pe">
    <section className="pe-card"><h3>Pricing simulator</h3><p className="pe-muted">Test a hypothetical event. Nothing is saved or reserved.</p><Simulator offerings={data.offerings} token={token} /></section>
    <section className="pe-card"><div className="pe-head"><h3>Pricing policies</h3><button className="cat-btn is-primary" onClick={() => { setForm(BLANK); setEditId(null); setOpen(true); }}><Plus size={14} />New policy</button></div>
      {open && <PolicyForm form={form} setForm={setForm} offerings={data.offerings} onSave={save} onCancel={() => { setOpen(false); setEditId(null); setForm(BLANK); }} busy={busy} editing={Boolean(editId)} />}
      <div className="pe-scroll"><table><thead><tr><th>Offering</th><th>Policy</th><th>Mode</th><th>Rate</th><th>Priority</th><th>Status</th><th /></tr></thead><tbody>
        {data.policies.map((p) => <tr key={p.id}><td>{nameOf.get(p.offeringId) || p.offeringId}</td><td>{p.name}{p.legacy ? <small>from the existing price field</small> : <small>v{p.version}{p.effectiveFrom || p.effectiveUntil ? ` · ${p.effectiveFrom || '…'} → ${p.effectiveUntil || '…'}` : ''}</small>}</td><td>{MODE_LABEL[p.pricingMode]}</td><td>{needsAmount(p.pricingMode) ? money(p.baseAmountCents) : '—'}</td><td>{p.priority}</td><td>{p.status}</td>
          <td>{!p.legacy && <><button className="cat-btn" onClick={() => { setForm(toForm(p)); setEditId(p.id); setOpen(true); }}>Edit</button> <button className="cat-btn" aria-label="Delete policy" onClick={() => remove(p)}><Trash2 size={14} /></button></>}</td></tr>)}
        {!data.policies.length && <tr><td colSpan="7" className="pe-muted">No pricing policies yet. Existing item prices appear here once set.</td></tr>}
      </tbody></table></div>
      <p className="pe-muted">Existing prices keep working as base policies. Add a policy with a higher priority to override one, for example a seasonal rate. A rule never adds a surcharge unless you add it here.</p></section>
    <section className="pe-card"><h3>Review &amp; validation <b>{data.issues.length}</b></h3>
      {data.issues.length === 0 ? <p className="pe-muted">No issues found.</p> : <ul className="pe-issues">{data.issues.map((i, k) => { const I = Icon[i.severity] || Info; return <li key={k} className={`is-${i.severity}`}><I size={15} />{i.message}</li>; })}</ul>}</section>
  </div>;
}
