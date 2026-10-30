import CatalogEntryManager from './CatalogEntryManager';
import catalogDefaults from '../lib/contracts/setup-catalog.json';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, Layers, Package, Pencil, Plus, Search, TriangleAlert } from 'lucide-react';
import { apiBaseUrl, apiRequest } from '../lib/api';
import EquipmentQuantityField from './EquipmentQuantityField';
import './adminCatalog.css';

// Three focused views: Events (what you celebrate), Services (what you sell, with its price) and Equipment (what each service uses).

const money = (cents) => (Number(cents || 0) / 100).toFixed(2);

async function uploadPhoto(file, id, token) {
  const body = new FormData();
  body.append('photo', file);
  const response = await fetch(`${apiBaseUrl}/equipment/${id}/photo`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || 'Upload failed.');
}

function Switch({ checked, onChange, label }) {
  return <label className="cat-switch"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><i aria-hidden="true" /><span>{label}</span></label>;
}

function Thumb({ src, icon: Icon = Package, name }) {
  return <span className="cat-thumb">{src ? <img src={src} alt="" loading="lazy" /> : <Icon size={18} strokeWidth={1.6} aria-label={name} />}</span>;
}

function PriceEditor({ label, price, token, onSaved, report }) {
  const [amount, setAmount] = useState(money(price?.amountCents));
  const [active, setActive] = useState(price?.isActive !== false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setAmount(money(price?.amountCents)); setActive(price?.isActive !== false); }, [price]);
  if (!price) return <span className="cat-muted">No price set up yet</span>;
  const dirty = amount !== money(price.amountCents) || active !== (price.isActive !== false);
  const save = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) { report(`Enter a valid price for ${label}.`, true); return; }
    setBusy(true);
    try {
      await apiRequest(`/prices/${price.id}`, { method: 'PATCH', token, body: { amountCents: Math.round(value * 100), currency: price.currency || 'CAD', isActive: active } });
      report(`${label} price saved.`); onSaved();
    } catch (error) { report(error.message || 'The price could not be saved.', true); } finally { setBusy(false); }
  };
  return <div className="cat-price">
    <label className="cat-money"><span>{price.currency || 'CAD'}</span><input type="number" min="0" step="0.01" value={amount} aria-label={`${label} price`} onChange={(event) => setAmount(event.target.value)} /></label>
    <Switch checked={active} onChange={setActive} label="Active" />
    <button type="button" className="cat-btn is-primary" onClick={save} disabled={busy || !dirty}>{busy ? 'Saving…' : dirty ? 'Save' : 'Saved'}</button>
  </div>;
}

function EquipmentRow({ item, token, reload, report }) {
  const [open, setOpen] = useState(false);
  const patch = async (body) => { try { await apiRequest(`/equipment/${item.id}`, { method: 'PATCH', body, token }); report(''); reload(); } catch (error) { report(error.message, true); } };
  return <li className={`cat-eq${item.isActive ? '' : ' is-off'}`}>
    <div className="cat-eq-row">
      <div className="cat-eq-name"><Thumb src={item.imageUrl} name={item.name} /><span><strong>{item.name}</strong>{item.brandModel ? <small>{item.brandModel}</small> : null}</span></div>
      <label className="cat-field"><span>Price</span><label className="cat-money"><span>CAD</span><input type="number" min="0" step="0.01" defaultValue={money(item.priceCents)} key={`p${item.priceCents}`} aria-label={`Price for ${item.name}`} onBlur={(event) => patch({ priceCents: Math.round(Number(event.target.value) * 100) })} /></label></label>
      <label className="cat-field"><span>Min qty</span><input type="number" min="1" defaultValue={item.minQuantity} key={`m${item.minQuantity}`} aria-label={`Minimum quantity for ${item.name}`} onBlur={(event) => patch({ minQuantity: Number(event.target.value) })} /></label>
      <div className="cat-field"><span>Available qty</span><EquipmentQuantityField equipmentId={item.id} name={item.name} availableQuantity={item.availableQuantity} token={token} onSaved={reload} /></div>
      <div className="cat-eq-switches">
        <Switch checked={Boolean(item.stockTracked)} onChange={(value) => patch({ stockTracked: value })} label="Track stock" />
        <Switch checked={Boolean(item.isActive)} onChange={(value) => patch({ isActive: value })} label="Available" />
      </div>
      <button type="button" className="cat-icon-btn" aria-expanded={open} aria-label={`${open ? 'Hide' : 'Show'} more options for ${item.name}`} onClick={() => setOpen(!open)}><ChevronDown size={16} /></button>
    </div>
    {open ? <div className="cat-eq-more">
      <label className="cat-field"><span>Description</span><input defaultValue={item.description} onBlur={(event) => patch({ description: event.target.value })} /></label>
      <label className="cat-field"><span>Photo</span><input type="file" accept="image/*" onChange={async (event) => { try { await uploadPhoto(event.target.files[0], item.id, token); reload(); } catch (error) { report(error.message, true); } }} /></label>
      <button type="button" className="cat-btn is-danger" onClick={() => window.confirm(`Delete ${item.name}?`) && apiRequest(`/equipment/${item.id}`, { method: 'DELETE', token }).then(reload).catch((error) => report(error.message, true))}>Delete equipment</button>
    </div> : null}
  </li>;
}

export default function AdminCatalogPanel({ token }) {
  const [equipment, setEquipment] = useState([]);
  const [prices, setPrices] = useState([]);
  const [catalog, setCatalog] = useState(catalogDefaults);
  const [status, setStatus] = useState({ text: '', error: false });
  const [tab, setTab] = useState('events');
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('all');
  const [stock, setStock] = useState('all');
  const [adding, setAdding] = useState('');
  const manager = useRef(null);
  const report = useCallback((text, error = false) => setStatus({ text, error }), []);
  const load = useCallback(() => Promise.all([apiRequest('/equipment/admin', { token }), apiRequest('/prices', { token }), apiRequest('/admin/setup-catalog', { token }).catch((error) => { if (error.status === 404) return { items: catalogDefaults }; throw error; })])
    .then(([equipmentResult, priceResult, catalogResult]) => { setCatalog(catalogResult.items || []); setEquipment(equipmentResult.items || []); setPrices(priceResult.items || []); })
    .catch((error) => report(error.message || 'Could not load services and equipment.', true)), [token, report]);
  useEffect(() => { load(); }, [load]);
  const live = prices.find((price) => price.id === 'song-request-live');
  const events = catalog.filter((item) => item.kind === 'event');
  const groups = useMemo(() => {
    const services = catalog.filter((item) => item.kind === 'service');
    const known = new Set(services.map((service) => service.category));
    const other = equipment.filter((item) => !known.has(item.category));
    return [...services.map((service) => ({ ...service, items: equipment.filter((item) => item.category === service.category), price: prices.find((price) => price.id === service.priceId) })),
      ...(other.length ? [{ id: 'other', category: 'other', name: 'Other equipment', items: other, price: null, noPrice: true }] : [])];
  }, [equipment, prices, catalog]);
  const serviceGroups = groups.filter((group) => !group.noPrice);
  const add = async (event, group) => {
    event.preventDefault();
    const form = new FormData(event.target);
    try { await apiRequest('/equipment', { method: 'POST', token, body: { slug: form.get('slug'), category: group.category, name: form.get('name') } }); event.target.reset(); setAdding(''); report('Equipment added.'); load(); window.dispatchEvent(new Event('echo:setup-catalog-changed')); } catch (error) { report(error.message, true); }
  };
  const needle = query.trim().toLowerCase();
  const visible = groups.map((group) => ({ ...group, shown: group.items.filter((item) => (stock === 'all' || (stock === 'off' ? !item.isActive : item.isActive)) && (!needle || `${item.name} ${item.brandModel || ''}`.toLowerCase().includes(needle))) }))
    .filter((group) => (scope === 'all' || group.category === scope) && (group.shown.length || (!needle && stock === 'all')));
  const unavailable = equipment.filter((item) => !item.isActive).length;
  const tabs = [['events', 'Events', CalendarDays, events.length], ['services', 'Services', Layers, serviceGroups.length], ['equipment', 'Equipment', Package, equipment.length]];

  return <section className="admin-catalog" aria-label="Events, services and equipment">
    <header className="cat-hero">
      <div><p className="detail-label">EVENTS, SERVICES &amp; EQUIPMENT</p><h3>What you offer, and what it costs.</h3><p>Everything shown on your website. Changes save as you go.</p></div>
      <dl className="cat-stats">
        <div><dt>Events</dt><dd>{events.length}</dd></div>
        <div><dt>Services</dt><dd>{serviceGroups.length}</dd></div>
        <div><dt>Equipment</dt><dd>{equipment.length}</dd></div>
        <div className={unavailable ? 'is-warn' : ''}><dt>Unavailable</dt><dd>{unavailable}</dd></div>
      </dl>
    </header>
    {status.text ? <p className={`cat-status${status.error ? ' is-error' : ''}`} role={status.error ? 'alert' : 'status'}>{status.error ? <TriangleAlert size={15} /> : null}{status.text}</p> : null}

    <nav className="cat-tabs" aria-label="Catalog sections">
      {tabs.map(([id, label, Icon, count]) => <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}><Icon size={16} strokeWidth={1.7} />{label}<b>{count}</b></button>)}
    </nav>

    {tab === 'events' ? <div className="cat-pane">
      <div className="cat-pane-head"><p>The occasions people can book. Hidden events stay out of the website.</p><button type="button" className="cat-btn is-primary" onClick={() => manager.current?.open('event')}><Plus size={15} />Add event</button></div>
      <div className="cat-cards">
        {events.map((item) => <button key={item.id} type="button" className={`cat-card${item.isActive ? '' : ' is-off'}`} onClick={() => manager.current?.open('event', item)}>
          <Thumb src={item.imageUrl} icon={CalendarDays} name={item.name} />
          <span className="cat-card-text"><strong>{item.name}</strong><small>{item.isActive ? 'Visible on website' : 'Hidden'}</small></span>
          <Pencil size={14} className="cat-card-edit" aria-hidden="true" />
        </button>)}
        {!events.length ? <p className="cat-empty">No events yet. Add the first one.</p> : null}
      </div>
    </div> : null}

    {tab === 'services' ? <div className="cat-pane">
      <div className="cat-pane-head"><p>Each service has one price. Its equipment is managed in the Equipment tab.</p><button type="button" className="cat-btn is-primary" onClick={() => manager.current?.open('service')}><Plus size={15} />Add service</button></div>
      <ul className="cat-list">
        {serviceGroups.map((group) => <li key={group.id || group.category} className={`cat-service${group.isActive === false ? ' is-off' : ''}`}>
          <button type="button" className="cat-service-main" onClick={() => manager.current?.open('service', catalog.find((item) => item.id === group.id))} aria-label={`Edit ${group.name}`}>
            <Thumb src={group.imageUrl} icon={Layers} name={group.name} />
            <span className="cat-card-text"><strong>{group.name}</strong><small>{group.items.length} equipment item{group.items.length === 1 ? '' : 's'}{group.isActive === false ? ' · Hidden' : ''}</small></span>
            <Pencil size={14} className="cat-card-edit" aria-hidden="true" />
          </button>
          <PriceEditor label={group.name} price={group.price} token={token} onSaved={load} report={report} />
        </li>)}
        {live ? <li className="cat-service is-live"><div className="cat-service-main is-static"><Thumb icon={CalendarDays} name="Live events" /><span className="cat-card-text"><strong>Live events</strong><small>Charged per live song request</small></span></div><PriceEditor label="Live song request" price={live} token={token} onSaved={load} report={report} /></li> : null}
      </ul>
    </div> : null}

    {tab === 'equipment' ? <div className="cat-pane">
      <div className="cat-toolbar">
        <label className="cat-search"><Search size={15} aria-hidden="true" /><input type="search" placeholder="Search equipment" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search equipment" /></label>
        <div className="cat-chips" role="group" aria-label="Filter by service">
          <button type="button" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>All</button>
          {groups.map((group) => <button key={group.category} type="button" aria-pressed={scope === group.category} onClick={() => setScope(scope === group.category ? 'all' : group.category)}>{group.name}</button>)}
        </div>
        <div className="cat-chips is-segment" role="group" aria-label="Filter by availability">
          {[['all', 'All'], ['on', 'Available'], ['off', 'Unavailable']].map(([id, label]) => <button key={id} type="button" aria-pressed={stock === id} onClick={() => setStock(id)}>{label}</button>)}
        </div>
      </div>
      {visible.map((group) => <article className="cat-group" key={group.id || group.category}>
        <header><div><h4>{group.name}</h4><span>{group.shown.length === group.items.length ? `${group.items.length} item${group.items.length === 1 ? '' : 's'}` : `${group.shown.length} of ${group.items.length}`}</span></div>
          {group.noPrice ? null : <button type="button" className="cat-btn" onClick={() => setAdding(adding === group.category ? '' : group.category)}><Plus size={14} />Add equipment</button>}</header>
        {adding === group.category ? <form className="cat-add" onSubmit={(event) => add(event, group)}>
          <label className="cat-field"><span>Name</span><input name="name" required autoFocus /></label>
          <label className="cat-field"><span>ID · a-z, 0-9, -</span><input name="slug" pattern="[a-z0-9-]+" required /></label>
          <button type="submit" className="cat-btn is-primary">Add</button><button type="button" className="cat-btn" onClick={() => setAdding('')}>Cancel</button>
        </form> : null}
        {group.shown.length ? <ul className="cat-eq-list">{group.shown.map((item) => <EquipmentRow key={item.id} item={item} token={token} reload={load} report={report} />)}</ul> : <p className="cat-empty">{group.items.length ? 'Nothing matches the filters.' : 'No equipment under this service yet.'}</p>}
      </article>)}
      {!visible.length ? <p className="cat-empty">Nothing matches your search.</p> : null}
    </div> : null}

    <CatalogEntryManager ref={manager} hideList items={catalog} equipment={equipment} token={token} onSaved={load} report={report} />
  </section>;
}
