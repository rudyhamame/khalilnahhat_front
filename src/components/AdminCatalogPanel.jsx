import Equipment3DGenerator from './Equipment3DGenerator';
import CatalogEntryManager from './CatalogEntryManager';
import catalogDefaults from '../lib/contracts/setup-catalog.json';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Layers, Package, Pencil, Plus, Search, TriangleAlert, X, Trash2 } from 'lucide-react';
import { apiRequest } from '../lib/api';
import EquipmentQuantityField from './EquipmentQuantityField';
import { GalleryImageField } from '../echo/GalleryPicker';
import './adminCatalog.css';

// Three focused views: Events (what you celebrate), Services (what you sell, with its price) and Equipment (what each service uses).

const money = (cents) => (Number(cents || 0) / 100).toFixed(2);

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

const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

// Same editor panel as events and services: always open, a blank "New equipment" form until a row is selected.
function EquipmentEditor({ item, services, token, reload, report, onSelect }) {
  const editing = Boolean(item);
  const [v, setV] = useState(() => item
    ? { slug: item.id, name: item.name, brandModel: item.brandModel || '', category: item.category, description: item.description || '', price: money(item.priceCents), minQuantity: item.minQuantity || 1, stockTracked: Boolean(item.stockTracked), isActive: item.isActive !== false,modelUrl:item.modelUrl||'',modelJobId:item.modelJobId||'',functionSummary:item.functionSummary||'',eventFit:{...(item.eventFit||{})} }
    : { slug: '', name: '', brandModel: '', category: services[0]?.category || '', description: '', price: '0.00', minQuantity: 1, stockTracked: false, isActive: true,modelUrl:'',modelJobId:null,functionSummary:'',eventFit:{} });
  const [busy, setBusy] = useState(false),[modelBusy,setModelBusy]=useState(false);
  const set = (key, value) => setV((current) => ({ ...current, [key]: value }));
  const save = async (event) => {
    event.preventDefault();
    if(modelBusy)return;
    const priceCents = Math.round(Number(v.price) * 100);
    if (!Number.isFinite(priceCents) || priceCents < 0) { report('Enter a valid price.', true); return; }
    const body = { ...(!editing||v.modelJobId!==item.modelJobId||v.modelUrl!==item.modelUrl?{modelJobId:v.modelJobId}:{}), category: v.category, name: v.name.trim(), brandModel: v.brandModel.trim(), description: v.description.trim(), priceCents, minQuantity: Math.max(1, Number(v.minQuantity) || 1), stockTracked: v.stockTracked, isActive: v.isActive, imageUrl: v.imageUrl, functionSummary: v.functionSummary.trim(), eventFit: Object.fromEntries(Object.entries(v.eventFit).map(([type, text]) => [type, String(text || '').trim()]).filter(([, text]) => text)) };
    setBusy(true);
    try {
      if (editing) await apiRequest(`/equipment/${item.id}`, { method: 'PATCH', token, body });
      else await apiRequest('/equipment', { method: 'POST', token, body: { slug: v.slug, ...body } });
      report(`${body.name} saved.`); await reload(); window.dispatchEvent(new Event('echo:setup-catalog-changed'));
      onSelect(editing ? item.id : v.slug);
    } catch (error) { report(error.message || 'The equipment could not be saved.', true); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!window.confirm(`Delete ${item.name}?`)) return;
    try { await apiRequest(`/equipment/${item.id}`, { method: 'DELETE', token }); report(`${item.name} deleted.`); await reload(); onSelect(''); } catch (error) { report(error.message, true); }
  };
  return <aside className="catalog-entry-dialog catalog-event-editor" aria-label="Equipment editor"><form onSubmit={save}>
    <header><div><small>WEBSITE CATALOG</small><h3>{editing ? 'Edit' : 'New'} equipment</h3></div>{editing ? <button type="button" disabled={busy} onClick={() => onSelect('')} aria-label="Start new equipment" title="Start new equipment"><X size={18} /></button> : null}</header>
    <fieldset disabled={busy}>
      <div className="catalog-editor-grid">
        <label>Name<input autoFocus required maxLength={160} value={v.name} onChange={(event) => { const name = event.target.value; setV((c) => ({ ...c, name, ...(!editing ? { slug: slugify(name) } : {}) })); }} /></label>
        <label>Item ID<input required disabled={editing} pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} value={v.slug} onChange={(event) => set('slug', event.target.value)} /></label>
        <label>Service<select value={v.category} onChange={(event) => set('category', event.target.value)}>{services.map((service) => <option key={service.category} value={service.category}>{service.name}</option>)}{!services.some((service) => service.category === v.category) && v.category ? <option value={v.category}>{v.category}</option> : null}</select></label>
        <label>Brand / model<input maxLength={160} value={v.brandModel} onChange={(event) => set('brandModel', event.target.value)} /></label>
        <label>Price (CAD)<input type="number" min="0" step="0.01" value={v.price} onChange={(event) => set('price', event.target.value)} /></label>
        <label>Min quantity<input type="number" min="1" value={v.minQuantity} onChange={(event) => set('minQuantity', event.target.value)} /></label>
      </div>
      <label>Description<textarea maxLength={2000} value={v.description} onChange={(event) => set('description', event.target.value)} /></label>
      <label>What it does<textarea rows={2} maxLength={600} placeholder="The function of this equipment, in a sentence or two." value={v.functionSummary} onChange={(event) => set('functionSummary', event.target.value)} /><small>Shown in the website's Selected experience.</small></label>
      <fieldset className="cat-event-fit"><legend>Why it works for each event</legend>
        {[['wedding', 'Wedding'], ['engagement', 'Engagement'], ['birthday', 'Birthday'], ['corporate', 'Corporate'], ['party', 'Party'], ['graduation', 'Graduation'], ['other', 'Other']].map(([type, label]) => <label key={type}>{label}<textarea rows={2} maxLength={600} placeholder={`Why this suits a ${label.toLowerCase()} (optional)`} value={v.eventFit[type] || ''} onChange={(event) => setV((current) => ({ ...current, eventFit: { ...current.eventFit, [type]: event.target.value } }))} /></label>)}
      </fieldset>
      {editing ? <div className="catalog-editor-grid">
        <div className="cat-field"><span>Available quantity</span><EquipmentQuantityField equipmentId={item.id} name={item.name} availableQuantity={item.availableQuantity} token={token} onSaved={reload} /></div>
        <GalleryImageField token={token} label="Photo" compact value={v.imageUrl} onChange={(url) => set('imageUrl', url)} />
      </div> : null}
      <Equipment3DGenerator token={token} name={v.name} value={{modelUrl:v.modelUrl,modelJobId:v.modelJobId}} onBusyChange={setModelBusy} onChange={model=>setV(current=>({...current,...model}))}/>
      <div className="cat-eq-checks"><label className="catalog-check"><input type="checkbox" checked={v.stockTracked} onChange={(event) => set('stockTracked', event.target.checked)} />Track stock</label><label className="catalog-check"><input type="checkbox" checked={v.isActive} onChange={(event) => set('isActive', event.target.checked)} />Available</label></div>
    </fieldset>
    <footer>{editing ? <button type="button" className="cat-btn is-danger" disabled={busy} onClick={remove}>Delete</button> : null}<span className="cat-footer-spacer" /><button type="submit" className="catalog-save" disabled={busy||modelBusy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add equipment'}</button></footer>
  </form></aside>;
}

export default function AdminCatalogPanel({ token }) {
  const [equipment, setEquipment] = useState([]);
  const [prices, setPrices] = useState([]);
  const [catalog, setCatalog] = useState(catalogDefaults);
  const [status, setStatus] = useState({ text: '', error: false });
  const [tab, setTab] = useState('events');
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState(() => catalogDefaults.find((item) => item.kind === 'service')?.category || 'all');
  const [stock, setStock] = useState('all');
  const [deletingService, setDeletingService] = useState('');
  const eventManager=useRef(null),root=useRef(null);
  const [selectedEvent,setSelectedEvent]=useState('');
  const report = useCallback((text, error = false) => setStatus({ text, error }), []);
  const deleteService = async (service) => {
    if (!window.confirm(`Delete “${service.name}” from the service catalog? Equipment in this category will remain available under Other equipment.`)) return;
    setDeletingService(service.id); report('');
    try {
      await apiRequest(`/admin/setup-catalog/service/${encodeURIComponent(service.id)}`, { method: 'DELETE', token });
      if (selectedEvent === service.id) setSelectedEvent('');
      await load(); window.dispatchEvent(new Event('echo:setup-catalog-changed'));
      report(`${service.name} deleted.`);
    } catch (error) { report(error.message || 'The service could not be deleted.', true); }
    finally { setDeletingService(''); }
  };
  const load = useCallback(() => Promise.all([apiRequest('/equipment/admin', { token }), apiRequest('/prices', { token }), apiRequest('/admin/setup-catalog', { token }).catch((error) => { if (error.status === 404) return { items: catalogDefaults }; throw error; })])
    .then(([equipmentResult, priceResult, catalogResult]) => { setCatalog(catalogResult.items || []); setEquipment(equipmentResult.items || []); setPrices(priceResult.items || []); })
    .catch((error) => report(error.message || 'Could not load services and equipment.', true)), [token, report]);
  useEffect(() => { load(); }, [load]);
  // One screen: size the panel to the space left below it in the window; the lists scroll inside it.
  useEffect(() => {
    const element = root.current;
    if (!element) return undefined;
    const fit = () => {
      let top = element.getBoundingClientRect().top + window.scrollY;
      for (let parent = element.parentElement; parent; parent = parent.parentElement) top += parent.scrollTop || 0;
      element.style.setProperty('--cat-height', `${Math.max(320, window.innerHeight - top - 14)}px`);
    };
    fit();
    window.addEventListener('resize', fit);
    const observer = new ResizeObserver(fit);
    observer.observe(document.body);
    const main = element.closest('.aw-main');
    main?.classList.add('is-one-screen');
    return () => { window.removeEventListener('resize', fit); observer.disconnect(); main?.classList.remove('is-one-screen'); };
  }, []);
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
  const selectedService = serviceGroups.find((group) => group.id === selectedEvent);
  useEffect(() => { if (scope !== 'all' && groups.length && !groups.some((group) => group.category === scope)) setScope('all'); }, [groups, scope]);
  const needle = query.trim().toLowerCase();
  const eqRows = groups.filter((group) => scope === 'all' || group.category === scope)
    .flatMap((group) => group.items.map((item) => ({ ...item, serviceName: group.name })))
    .filter((item) => (stock === 'all' || (stock === 'off' ? !item.isActive : item.isActive)) && (!needle || `${item.name} ${item.brandModel || ''}`.toLowerCase().includes(needle)));
  const unavailable = equipment.filter((item) => !item.isActive).length;
  const tabs = [['events', 'Events', CalendarDays, events.length], ['services', 'Services', Layers, serviceGroups.length], ['equipment', 'Equipment', Package, equipment.length]];

  return <section ref={root} className={`admin-catalog has-event-editor${tab === 'services' ? ' is-service-tab' : ''}`} aria-label="Events, services and equipment">
    {/* The event editor lives outside the page content: a full-height column that starts at the very top. */}
    {tab === 'events' || tab === 'services' ? <CatalogEntryManager key={tab} ref={eventManager} inline startClosed={tab === 'services'} kind={tab === 'events' ? 'event' : 'service'} hideList items={catalog} equipment={equipment} token={token} onSaved={load} report={report} onSelectionChange={setSelectedEvent}/> : null}
    {tab === 'equipment' ? <EquipmentEditor key={selectedEvent || 'new'} item={equipment.find((entry) => entry.id === selectedEvent)} services={serviceGroups} token={token} reload={load} report={report} onSelect={setSelectedEvent} /> : null}
    <div className="cat-main">
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

    <div className="cat-bar">
    <nav className="cat-tabs" aria-label="Catalog sections">
      {tabs.map(([id, label, Icon, count]) => <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => {setTab(id);setSelectedEvent('');}}><Icon size={16} strokeWidth={1.7} />{label}<b>{count}</b></button>)}
    </nav>
      {tab === 'events' ? <button type="button" className="cat-btn is-primary" onClick={()=>eventManager.current?.open('event')}><Plus size={15}/>Add event</button> : tab === 'services' ? <div className="cat-service-toolbar-actions"><button type="button" className="cat-btn is-primary" onClick={() => eventManager.current?.open('service')}><Plus size={15} />Add service</button>{selectedService ? <><button type="button" className="cat-btn" onClick={() => eventManager.current?.open('service', catalog.find(item => item.kind === 'service' && item.id === selectedService.id))}><Pencil size={14} />Edit service</button><button type="button" className="cat-btn is-danger" disabled={deletingService === selectedService.id} onClick={() => deleteService(selectedService)}><Trash2 size={14} />{deletingService === selectedService.id ? 'Deleting…' : 'Delete service'}</button></> : null}</div> : <button type="button" className="cat-btn is-primary" onClick={() => setSelectedEvent('')}><Plus size={15} />Add equipment</button>}
    </div>

    {tab === 'events' ? <div className="cat-events-workspace">
      <div className="cat-pane cat-events-main">
                <div className="cat-events-table-wrap"><table className="cat-events-table"><thead><tr><th>Event</th><th>Arabic name</th><th>Description</th><th>Booking category</th><th>Visibility</th><th>Order</th><th><span className="sr-only">Edit</span></th></tr></thead><tbody>{events.map(item=><tr key={item.id} aria-selected={selectedEvent===item.id} onClick={()=>eventManager.current?.open('event',item)}><th scope="row"><button type="button" className="cat-event-name" onClick={e=>{e.stopPropagation();eventManager.current?.open('event',item);}}><Thumb src={item.imageUrl} icon={CalendarDays} name={item.name}/><span>{item.name}</span></button></th><td dir="auto">{item.nameAr||'—'}</td><td><span className="cat-event-description">{item.description||'—'}</span></td><td>{item.bookingType}</td><td><span className={'cat-event-visibility'+(item.isActive?'':' is-hidden')}>{item.isActive?'Visible':'Hidden'}</span></td><td>{item.sortOrder}</td><td><button className="cat-icon-btn" type="button" aria-label={'Edit '+item.name} onClick={e=>{e.stopPropagation();eventManager.current?.open('event',item);}}><Pencil size={14}/></button></td></tr>)}</tbody></table>{!events.length&&<p className="cat-empty">No events yet. Add the first one.</p>}</div>
      </div>
    </div> : null}

    {tab === 'services' ? <div className="cat-events-workspace">
      <div className="cat-pane cat-events-main">
        <div className="cat-events-table-wrap"><table className="cat-events-table cat-services-table"><thead><tr><th>Service</th><th>Description</th><th>Equipment</th><th>Price</th><th>Visibility</th></tr></thead><tbody>
          {serviceGroups.map((group) => { const entry = catalog.find((item) => item.id === group.id); return <tr key={group.id || group.category} aria-selected={selectedEvent === group.id} onClick={() => eventManager.current?.open('service', entry)}>
            <th scope="row"><button type="button" className="cat-event-name" onClick={(e) => { e.stopPropagation(); eventManager.current?.open('service', entry); }}><Thumb src={group.imageUrl} icon={Layers} name={group.name} /><span>{group.name}</span></button></th>
            <td><span className="cat-event-description">{group.description || '—'}</span></td>
            <td>{group.items.length}</td>
            <td className="cat-price-cell" onClick={(e) => e.stopPropagation()}><PriceEditor label={group.name} price={group.price} token={token} onSaved={load} report={report} /></td>
            <td><span className={'cat-event-visibility' + (group.isActive === false ? ' is-hidden' : '')}>{group.isActive === false ? 'Hidden' : 'Visible'}</span></td>
          </tr>; })}
          {live ? <tr className="is-live"><th scope="row"><span className="cat-event-name is-static"><Thumb icon={CalendarDays} name="Live events" /><span>Live events</span></span></th><td><span className="cat-event-description">Charged per live song request</span></td><td>—</td><td className="cat-price-cell"><PriceEditor label="Live song request" price={live} token={token} onSaved={load} report={report} /></td><td>—</td></tr> : null}
        </tbody></table>{!serviceGroups.length && <p className="cat-empty">No services yet. Add the first one.</p>}</div>
      </div>
    </div> : null}

    {tab === 'equipment' ? <div className="cat-events-workspace">
      <div className="cat-pane cat-events-main">
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
        <div className="cat-events-table-wrap"><table className="cat-events-table cat-equipment-table"><thead><tr><th>Equipment</th><th>Service</th><th>Price</th><th>Min qty</th><th>Available qty</th><th>Stock</th><th>Status</th><th><span className="sr-only">Edit</span></th></tr></thead><tbody>
          {eqRows.map((item) => <tr key={item.id} aria-selected={selectedEvent === item.id} onClick={() => setSelectedEvent(item.id)}>
            <th scope="row"><button type="button" className="cat-event-name" onClick={(e) => { e.stopPropagation(); setSelectedEvent(item.id); }}><Thumb src={item.imageUrl} name={item.name} /><span>{item.name}{item.brandModel ? <small>{item.brandModel}</small> : null}</span></button></th>
            <td>{item.serviceName}</td>
            <td>{money(item.priceCents)}</td>
            <td>{item.minQuantity}</td>
            <td>{Number.isFinite(item.availableQuantity) ? item.availableQuantity : '—'}</td>
            <td>{item.stockTracked ? 'Tracked' : '—'}</td>
            <td><span className={'cat-event-visibility' + (item.isActive ? '' : ' is-hidden')}>{item.isActive ? 'Available' : 'Unavailable'}</span></td>
            <td><button className="cat-icon-btn" type="button" aria-label={'Edit ' + item.name} onClick={(e) => { e.stopPropagation(); setSelectedEvent(item.id); }}><Pencil size={14} /></button></td>
          </tr>)}
        </tbody></table>{!eqRows.length && <p className="cat-empty">{equipment.length ? 'Nothing matches the filters.' : 'No equipment yet. Add the first item.'}</p>}</div>
      </div>
    </div> : null}

    </div>
  </section>;
}
