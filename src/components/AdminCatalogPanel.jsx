import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiBaseUrl, apiRequest } from '../lib/api';
import EquipmentQuantityField from './EquipmentQuantityField';
import './adminCatalog.css';

// Each service has its own price; its equipment is nested under it and priced individually.
const SERVICES = [
  { category: 'dj', priceId: 'service-dj', name: 'DJ Services' },
  { category: 'sound', priceId: 'service-sound', name: 'Sound Systems' },
  { category: 'lighting', priceId: 'service-lighting', name: 'Lighting' },
  { category: 'video', priceId: 'service-video', name: 'LED Walls & Video' },
  { category: 'effects', priceId: 'service-effects', name: 'Special Effects' },
];
const money = (cents) => (Number(cents || 0) / 100).toFixed(2);

async function uploadPhoto(file, id, token) {
  const body = new FormData();
  body.append('photo', file);
  const response = await fetch(`${apiBaseUrl}/equipment/${id}/photo`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || 'Upload failed.');
}

function ServicePriceBar({ service, price, token, onSaved, report }) {
  const [amount, setAmount] = useState(money(price?.amountCents));
  const [active, setActive] = useState(price?.isActive !== false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setAmount(money(price?.amountCents)); setActive(price?.isActive !== false); }, [price]);
  if (!price) return <p className="catalog-note">Service price unavailable until the server is updated.</p>;
  const save = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) { report(`Enter a valid price for ${service.name}.`, true); return; }
    setBusy(true);
    try {
      await apiRequest(`/prices/${price.id}`, { method: 'PATCH', token, body: { amountCents: Math.round(value * 100), currency: price.currency || 'CAD', isActive: active } });
      report(`${service.name} price saved.`); onSaved();
    } catch (error) { report(error.message || 'The price could not be saved.', true); } finally { setBusy(false); }
  };
  return <div className="catalog-service-price">
    <label>Service price ({price.currency || 'CAD'})<input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
    <label className="catalog-check"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />Active</label>
    <button type="button" className="catalog-save" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save price'}</button>
  </div>;
}

function EquipmentRow({ item, token, reload, report }) {
  const patch = async (body) => { try { await apiRequest(`/equipment/${item.id}`, { method: 'PATCH', body, token }); report(''); reload(); } catch (error) { report(error.message, true); } };
  return <tr>
    <th scope="row"><strong>{item.name}</strong>{item.brandModel ? <small>{item.brandModel}</small> : null}</th>
    <td><label className="catalog-price"><span className="sr-only">Price for {item.name}</span><input type="number" min="0" step="0.01" defaultValue={money(item.priceCents)} onBlur={(event) => patch({ priceCents: Math.round(Number(event.target.value) * 100) })} /></label></td>
    <td><input className="catalog-small" type="number" min="1" defaultValue={item.minQuantity} aria-label={`Minimum quantity for ${item.name}`} onBlur={(event) => patch({ minQuantity: Number(event.target.value) })} /></td>
    <td><EquipmentQuantityField equipmentId={item.id} name={item.name} availableQuantity={item.availableQuantity} token={token} onSaved={reload} /></td>
    <td><label className="catalog-check"><input type="checkbox" defaultChecked={item.stockTracked} onChange={(event) => patch({ stockTracked: event.target.checked })} />Track</label></td>
    <td><label className="catalog-check"><input type="checkbox" defaultChecked={item.isActive} onChange={(event) => patch({ isActive: event.target.checked })} />Available</label></td>
    <td className="catalog-more"><details><summary>Details</summary>
      <label>Description<input defaultValue={item.description} onBlur={(event) => patch({ description: event.target.value })} /></label>
      <label>Photo<input type="file" accept="image/*" onChange={async (event) => { try { await uploadPhoto(event.target.files[0], item.id, token); reload(); } catch (error) { report(error.message, true); } }} /></label>
      <button type="button" className="catalog-danger" onClick={() => window.confirm(`Delete ${item.name}?`) && apiRequest(`/equipment/${item.id}`, { method: 'DELETE', token }).then(reload).catch((error) => report(error.message, true))}>Delete</button>
    </details></td>
  </tr>;
}

export default function AdminCatalogPanel({ token }) {
  const [equipment, setEquipment] = useState([]);
  const [prices, setPrices] = useState([]);
  const [status, setStatus] = useState({ text: '', error: false });
  const report = useCallback((text, error = false) => setStatus({ text, error }), []);
  const load = useCallback(() => Promise.all([apiRequest('/equipment/admin', { token }), apiRequest('/prices', { token })])
    .then(([equipmentResult, priceResult]) => { setEquipment(equipmentResult.items || []); setPrices(priceResult.items || []); })
    .catch((error) => report(error.message || 'Could not load services and equipment.', true)), [token, report]);
  useEffect(() => { load(); }, [load]);
  const live = prices.find((price) => price.id === 'song-request-live');
  const groups = useMemo(() => {
    const known = new Set(SERVICES.map((service) => service.category));
    const other = equipment.filter((item) => !known.has(item.category));
    return [...SERVICES.map((service) => ({ ...service, items: equipment.filter((item) => item.category === service.category), price: prices.find((price) => price.id === service.priceId) })),
      ...(other.length ? [{ category: 'other', name: 'Other equipment', items: other, price: null, noPrice: true }] : [])];
  }, [equipment, prices]);
  const add = async (event, group) => {
    event.preventDefault();
    const form = new FormData(event.target);
    try { await apiRequest('/equipment', { method: 'POST', token, body: { slug: form.get('slug'), category: group.category, name: form.get('name') } }); event.target.reset(); report(''); load(); } catch (error) { report(error.message, true); }
  };
  return <section className="admin-catalog" aria-label="Services and equipment">
    <header className="catalog-intro">
      <p className="detail-label">SERVICES &amp; EQUIPMENT</p>
      <h3>Each service has its own price, and its equipment is priced underneath it.</h3>
      <p>Equipment fields save when you leave them. Service prices use their own Save button. Quantities update the equipment viewer; date availability is confirmed with the quote.</p>
    </header>
    {status.text ? <p className={`catalog-status${status.error ? ' is-error' : ''}`} role={status.error ? 'alert' : 'status'}>{status.text}</p> : null}
    {groups.map((group) => <article className="catalog-service" key={group.category}>
      <header>
        <div><h4>{group.name}</h4><span>{group.items.length} equipment item{group.items.length === 1 ? '' : 's'}</span></div>
        {group.noPrice ? null : <ServicePriceBar service={group} price={group.price} token={token} onSaved={load} report={report} />}
      </header>
      <div className="catalog-table-wrap">
        <table className="catalog-table">
          <thead><tr><th>Equipment</th><th>Price (CAD)</th><th>Min qty</th><th>Available qty</th><th>Stock</th><th>Status</th><th /></tr></thead>
          <tbody>{group.items.length ? group.items.map((item) => <EquipmentRow key={item.id} item={item} token={token} reload={load} report={report} />) : <tr><td colSpan="7" className="catalog-empty">No equipment under this service yet.</td></tr>}</tbody>
        </table>
      </div>
      {group.noPrice ? null : <form className="catalog-add" onSubmit={(event) => add(event, group)}>
        <label>Id (a-z, 0-9, -)<input name="slug" pattern="[a-z0-9-]+" required /></label>
        <label>Name<input name="name" required /></label>
        <button type="submit" className="catalog-save">Add equipment</button>
      </form>}
    </article>)}
    {live ? <article className="catalog-service">
      <header><div><h4>Live events</h4><span>Charged per live song request</span></div><ServicePriceBar service={{ name: 'Live song request' }} price={live} token={token} onSaved={load} report={report} /></header>
    </article> : null}
  </section>;
}
