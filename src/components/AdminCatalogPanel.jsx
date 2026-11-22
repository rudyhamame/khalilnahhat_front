import {notifyCatalogChanged} from '../lib/catalogChanges';
import Equipment3DGenerator from './Equipment3DGenerator';
import {equipmentSetMemberships,isEquipmentSet} from './equipmentSets';
import {withServiceIds,equipmentInService} from '../lib/treeCore';
import CatalogEntryManager from './CatalogEntryManager';
import NumberInput from './NumberInput';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { adminToast } from './adminToast';
import { Check, Languages, CalendarDays, Layers, Package, Pencil, Plus, Search, TriangleAlert, X, Trash2 } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { GalleryImageField } from '../echo/GalleryPicker';
import './adminCatalog.css';
import './equipmentEditor.css';

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
  const [currency, setCurrency] = useState(price?.currency || 'CAD');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setAmount(money(price?.amountCents)); setActive(price?.isActive !== false); setCurrency(price?.currency || 'CAD'); }, [price]);
  if (!price) return <span className="cat-muted">No price set up yet</span>;
  const dirty = amount !== money(price.amountCents) || active !== (price.isActive !== false) || currency !== (price.currency || 'CAD');
  const save = async (nextActive = active, nextCurrency = currency) => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) { report(`Enter a valid price for ${label}.`, true); return; }
    setBusy(true);
    try {
      await apiRequest(`/prices/${price.id}`, { method: 'PATCH', token, body: { amountCents: Math.round(value * 100), currency: nextCurrency, isActive: nextActive } });
      report(`${label} price saved.`); onSaved();
    } catch (error) {if(error.cancelled)return; report(error.message || 'The price could not be saved.', true); } finally { setBusy(false); }
  };
  return <div className="cat-price">
    <label className="cat-money"><select value={currency} aria-label={`${label} currency`} onChange={(event) => { setCurrency(event.target.value); save(active, event.target.value); }}><option>CAD</option><option>USD</option></select><input type="number" min="0" step="0.01" value={amount} aria-label={`${label} price`} onChange={(event) => setAmount(event.target.value)} onBlur={() => { if (dirty && !busy) save(); }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} /></label>
    <Switch checked={active} onChange={(next) => { setActive(next); save(next); }} label="Active" />
  </div>;
}

const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

// Same editor panel as events and services: always open, a blank "New equipment" form until a row is selected.
function EquipmentEditor({ item, services, token, reload, report, onSelect, onDraft }) {
  const editing = Boolean(item);
  const [v, setV] = useState(() => item
    ? { slug: item.id, name: item.name, brandModel: item.brandModel || '', brand: (item.brandModel || '').split(' ')[0], model: (item.brandModel || '').split(' ').slice(1).join(' '), category: item.category, serviceId: item.serviceId || services.find((service) => service.category === item.category)?.id || '', description: item.description || '', price: money(item.priceCents), minQuantity: item.minQuantity || 1, stockTracked: Boolean(item.stockTracked), quantityOwned: String(item.quantityOwned ?? 1), isActive: item.isActive !== false,imageUrl:item.imageUrl||'',youtubeUrl:item.youtubeUrl||'',modelParts:(item.modelParts||[]).map(part=>({...part})),modelUrl:item.modelUrl||'',modelJobId:item.modelJobId||'',functionSummary:item.functionSummary||'',eventFit:{...(item.eventFit||{})} }
    : { slug: '', name: '', brandModel: '', brand: '', model: '', category: services[0]?.category || '', serviceId: services[0]?.id || '', description: '', price: '0.00', minQuantity: 1, stockTracked: true, quantityOwned: '1', isActive: true,imageUrl:'',youtubeUrl:'',modelParts:[],modelUrl:'',modelJobId:null,functionSummary:'',eventFit:{} });
  const [busy, setBusy] = useState(false),[modelBusy,setModelBusy]=useState(false);
  const set = (key, value) => setV((current) => ({ ...current, [key]: value }));
  useEffect(() => { onDraft({ ...v, id: item?.id || '__new' }); }, [v, item, onDraft]);
  useEffect(() => () => onDraft(null), [onDraft]);
  useEffect(() => { const key = (event) => { if (event.key === 'Escape' && !busy) onSelect(''); }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); });
  const remove = async () => {
    setBusy(true);
    try { await apiRequest(`/equipment/${item.id}`, { method: 'DELETE', token }); report(`${item.name} deleted.`); await reload(); onSelect(''); notifyCatalogChanged(); } catch (error) {if(error.cancelled)return; report(error.message || 'The equipment could not be deleted.', true); } finally { setBusy(false); }
  };
  const save = async (event) => {
    event.preventDefault();
    if(modelBusy)return;
    const priceCents = Math.round(Number(v.price) * 100);
    if (!Number.isFinite(priceCents) || priceCents < 0) { report('Enter a valid price.', true); return; }
    const body = { ...(!editing||v.modelJobId!==item.modelJobId||v.modelUrl!==item.modelUrl?{modelJobId:v.modelJobId}:{}), modelParts: v.modelParts, category: v.category, serviceId: v.serviceId, name: v.name.trim(), brandModel: v.brandModel.trim(), description: v.description.trim(), priceCents, minQuantity: Math.max(1, Number(v.minQuantity) || 1), quantityOwned: Math.max(0, Math.round(Number(v.quantityOwned) || 0)), stockTracked: true, isActive: v.isActive, imageUrl: v.imageUrl, youtubeUrl: v.youtubeUrl.trim(), functionSummary: v.functionSummary.trim(), eventFit: Object.fromEntries(Object.entries(v.eventFit).map(([type, text]) => [type, String(text || '').trim()]).filter(([, text]) => text)) };
    setBusy(true);
    const slug = v.slug || 'item-' + Date.now().toString(36);
    try {
      if (editing) await apiRequest(`/equipment/${item.id}`, { method: 'PATCH', token, body });
      else await apiRequest('/equipment', { method: 'POST', token, body: { slug, ...body } });
      report(`${body.name} saved.`); await reload(); notifyCatalogChanged();
      onSelect(editing ? item.id : slug);
    } catch (error) {if(error.cancelled)return; report(error.message || 'The equipment could not be saved.', true); } finally { setBusy(false); }
  };
  return <div className="catalog-popup equipment-popup" role="dialog" aria-modal="true" aria-label="Equipment editor" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onSelect(''); }}><form onSubmit={save} onInvalid={event=>event.target.closest('details')?.setAttribute('open','')}>
    <header className="equipment-editor-header"><h3>{editing?'Edit':'Add'} equipment</h3><button type="button" disabled={busy} onClick={()=>onSelect('')} aria-label="Close" title="Close"><X size={18}/></button></header>
    <fieldset className="equipment-editor-body" disabled={busy}>
      <section className="equipment-editor-section" aria-labelledby="equipment-details-title">
        <h4 id="equipment-details-title"><span>01</span>Equipment details</h4>
        <label>Name <b className="req" aria-hidden="true">*</b><input autoFocus required maxLength={160} placeholder="Equipment name" value={v.name} onChange={event=>{const name=event.target.value;setV(current=>({...current,name,...(!editing?{slug:slugify(name)}:{})}));}}/></label>
        <label>Service <b className="req" aria-hidden="true">*</b><select required value={v.serviceId} onChange={event=>{const service=services.find(row=>row.id===event.target.value);set('serviceId',event.target.value);set('category',service?.category||event.target.value);}}><option value="" disabled>Select a service</option>{services.filter(service=>service.id!=='__new').map(service=><option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
        <div className="equipment-editor-pair"><label>Brand <b className="req" aria-hidden="true">*</b><input required maxLength={80} placeholder="Brand" value={v.brand} onChange={event=>setV(current=>({...current,brand:event.target.value,brandModel:[event.target.value.trim(),current.model.trim()].filter(Boolean).join(' ')}))}/></label><label>Model<input maxLength={80} placeholder="Model" value={v.model} onChange={event=>setV(current=>({...current,model:event.target.value,brandModel:[current.brand.trim(),event.target.value.trim()].filter(Boolean).join(' ')}))}/></label></div>
        <label>Description <b className="req" aria-hidden="true">*</b><textarea required rows={3} maxLength={2000} placeholder="Describe this equipment for your clients." value={v.description} onChange={event=>set('description',event.target.value)}/></label>
        <label>What it does <b className="req" aria-hidden="true">*</b><textarea required rows={2} maxLength={600} placeholder="A short explanation of what this equipment does." value={v.functionSummary} onChange={event=>set('functionSummary',event.target.value)}/></label>
        <label>YouTube link for illustration<input type="url" inputMode="url" maxLength={300} placeholder="https://youtube.com/watch?v=…" pattern="https://(www\.|m\.)?(youtube\.com|youtu\.be)/.*" value={v.youtubeUrl} onChange={event=>set('youtubeUrl',event.target.value)}/></label>
      </section>
      <section className="equipment-editor-section" aria-labelledby="equipment-stock-title">
        <h4 id="equipment-stock-title"><span>02</span>Availability</h4>
        <div className="equipment-editor-pair"><label>Available quantity to rent <b className="req" aria-hidden="true">*</b><NumberInput required min="0" step="1" value={v.quantityOwned} onChange={event=>set('quantityOwned',event.target.value)}/></label><label>Minimum quantity to rent <b className="req" aria-hidden="true">*</b><NumberInput required min="1" step="1" value={v.minQuantity} onChange={event=>set('minQuantity',event.target.value)}/></label></div>
      </section>
      <section className="equipment-editor-section" aria-labelledby="equipment-media-title">
        <h4 id="equipment-media-title"><span>03</span>Artwork</h4>
        <div className="equipment-artwork-row">
        <GalleryImageField token={token} label="Equipment photo" previewPicks value={v.imageUrl} disabled={busy} onChange={url=>set('imageUrl',url)}/>
        <Equipment3DGenerator token={token} name={v.name} value={{modelUrl:v.modelUrl,modelJobId:v.modelJobId}} onBusyChange={setModelBusy} onChange={model=>setV(current=>({...current,...model}))}/>
        </div>
      </section>
    </fieldset>
    <footer><Switch checked={v.isActive} onChange={(next) => set('isActive', next)} label={v.isActive ? 'Available' : 'Unavailable'} /><span className="cat-footer-spacer"/>{editing&&<button type="button" className="catalog-add-btn is-danger" disabled={busy} onClick={remove}><Trash2 size={15} aria-hidden="true"/><span>Delete</span></button>}<button type="submit" className="catalog-add-btn" disabled={busy||modelBusy}>{!editing&&<Plus size={15} aria-hidden="true"/>}<span>{busy?'Saving…':editing?'Save':'Add'}</span></button></footer>
  </form></div>;
}

// What the booking expects to find: the DJ and MC services (matched by id). The booking does not need any specific equipment ids.
// Anything of these that is not in the catalogue shows in the tree under "To add".
export default function AdminCatalogPanel({ token, mode = 'catalog' }) {
  const [equipment, setEquipment] = useState([]);
  const [prices, setPrices] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [tab, setTab] = useState(mode === 'events' ? 'events' : 'equipment');
  const [ar, setAr] = useState(false);
  const pick = (row, key) => (ar && row[key + 'Ar']) || row[key];
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('all');
  const [deletingService, setDeletingService] = useState('');
  const eventManager=useRef(null),root=useRef(null);
  const [selectedEvent,setSelectedEvent]=useState('');
  const [draft, setDraft] = useState(null);
  const [eqOpen,setEqOpen]=useState(false),[reading,setReading]=useState(null);
  // Escape closes the read popup.
  useEffect(()=>{if(!reading)return undefined;const key=event=>{if(event.key==='Escape')setReading(null);};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[reading]);
  const selectEquipment=id=>{setSelectedEvent(id);setEqOpen(Boolean(id));};
  const openEvent = (item) => { if (item.id !== '__new') eventManager.current?.open('event', catalog.find((entry) => entry.id === item.id && entry.kind === 'event') || item); };
  const report = useCallback((text, error = false) => adminToast(text, error), []);
  const deleteService = async (service) => {
    setDeletingService(service.id); report('');
    try {
      await apiRequest(`/admin/setup-catalog/service/${encodeURIComponent(service.id)}`, { method: 'DELETE', token });
      if (selectedEvent === service.id) setSelectedEvent('');
      await load(); notifyCatalogChanged();
      report(`${service.name} deleted.`);
    } catch (error) {if(error.cancelled)return; report(error.message || 'The service could not be deleted.', true); }
    finally { setDeletingService(''); }
  };
  const load = useCallback(() => Promise.all([apiRequest('/equipment/admin', { token }), apiRequest('/prices', { token }), apiRequest('/admin/setup-catalog', { token }).catch((error) => { if (error.status === 404) return { items: [] }; throw error; })])
    .then(([equipmentResult, priceResult, catalogResult]) => { setCatalog(catalogResult.items || []); setEquipment(withServiceIds(catalogResult.items || [], equipmentResult.items || [])); setPrices(priceResult.items || []); })
    .catch((error) => report(error.message || 'Could not load services and equipment.', true)), [token, report]);
  useEffect(() => { load();
    const changed=event=>{if(event.type!=='storage'||event.key==='echo:catalog-revision')load();};
    window.addEventListener('echo:administrator-data-changed',changed);window.addEventListener('storage',changed);
    return()=>{window.removeEventListener('echo:administrator-data-changed',changed);window.removeEventListener('storage',changed);};
  }, [load]);
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
  // Live view: the row being added or edited mirrors the editor form as you type.
  const liveCatalog = useMemo(() => {
    if (!draft || draft.kind === undefined || !['event', 'service'].includes(draft.kind)) return catalog;
    const row = { ...draft, id: draft.id || '__new' };
    if (draft.__new) return row.name?.trim() ? [...catalog, row] : catalog;
    return catalog.map((item) => (item.id === draft.id && item.kind === draft.kind ? { ...item, ...row } : item));
  }, [catalog, draft]);
  const liveEquipment = useMemo(() => {
    if (!draft || draft.kind !== undefined || draft.slug === undefined) return equipment;
    const row = { id: draft.id, name: draft.name, brandModel: draft.brandModel, category: draft.category, description: draft.description, priceCents: Math.round(Number(draft.price || 0) * 100), isSet:Boolean(draft.isSet), setItems:draft.setItems||[], modelParts:draft.modelParts||[], modelUrl:draft.modelUrl||'', minQuantity: draft.minQuantity, stockTracked: draft.stockTracked, isActive: draft.isActive, imageUrl: draft.imageUrl };
    if (draft.id === '__new') return row.name?.trim() ? [...equipment, row] : equipment;
    return equipment.map((item) => (item.id === draft.id ? { ...item, ...row } : item));
  }, [equipment, draft]);
  const setMemberships=useMemo(()=>equipmentSetMemberships(liveEquipment),[liveEquipment]);
  const events = liveCatalog.filter((item) => item.kind === 'event');
  const groups = useMemo(() => {
    const services = liveCatalog.filter((item) => item.kind === 'service');
    const other = liveEquipment.filter((item) => !isEquipmentSet(item) && !services.some((service) => equipmentInService(item, service)));
    return [...services.map((service) => ({ ...service, items: liveEquipment.filter((item) => equipmentInService(item, service)), price: service.__new && service.newPrice ? { amountCents: Math.round(Number(service.newPrice) * 100), currency: service.newCurrency || 'CAD' } : prices.find((price) => price.id === service.priceId) })),
      ...(other.length ? [{ id: 'other', category: 'other', name: 'Other equipment', items: other, price: null, noPrice: true }] : [])];
  }, [liveEquipment, prices, liveCatalog]);
  const serviceGroups = groups.filter((group) => !group.noPrice);
  useEffect(() => { if (scope !== 'all' && groups.length && !groups.some((group) => group.id === scope)) setScope('all'); }, [groups, scope]);
  const selectedService = serviceGroups.find((group) => scope !== 'all' && group.id === scope && group.id !== '__new');
  const needle = query.trim().toLowerCase();
  const eqRows = groups.filter((group) => scope === 'all' || group.id === scope)
    .flatMap((group) => group.items.filter((item) => !isEquipmentSet(item)).map((item) => ({ ...item, serviceName: group.name })))
    .filter((item) => (!needle || `${item.name} ${item.brandModel || ''} ${(setMemberships.get(item.id)||[]).map(set=>set.name).join(' ')}`.toLowerCase().includes(needle)));
  const eqSubtabs = <div className="cat-subtabs" aria-label="Equipment"><label className="cat-search"><Search size={15} aria-hidden="true" /><input type="search" placeholder="Search equipment" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search equipment" /></label><span className="cat-subtab-actions"><button type="button" className="is-primary" onClick={() => {setSelectedEvent('');setEqOpen(true);}}><Plus size={15} />Add equipment</button></span></div>;
  const tabs = [['events', 'Events', CalendarDays, events.length], ['services', 'Services', Layers, serviceGroups.length], ['equipment', 'Equipment', Package, equipment.length]].filter(([id]) => (id === 'events') === (mode === 'events'));

  return <section ref={root} className={`admin-catalog${tab === 'pricing' ? '' : ' has-event-editor'}${mode !== 'events' ? ' is-service-tab' : ''}`} aria-label={mode === 'events' ? 'Events' : 'Services and equipment'}>
    {mode !== 'events' ? <aside className="cat-service-list" aria-label="Services">
      <header><h3>Services</h3><span className="cat-svc-head-actions">{selectedService ? <><button type="button" className="cat-svc-act" aria-label="Edit service" title="Edit service" onClick={() => eventManager.current?.open('service', catalog.find((item) => item.kind === 'service' && item.id === selectedService.id))}><Pencil size={15} /></button><button type="button" className="cat-svc-act is-danger" aria-label="Delete service" title="Delete service" disabled={deletingService === selectedService.id} onClick={() => deleteService(selectedService)}><Trash2 size={15} /></button></> : null}<button type="button" className="cat-svc-add" onClick={() => eventManager.current?.open('service')} aria-label="Add service" title="Add service"><Plus size={16} /></button></span></header>
      <ul>
        <li><button type="button" className={`cat-svc-item${scope === 'all' ? ' is-active' : ''}`} onClick={() => setScope('all')}><span>All equipment</span><b>{equipment.length}</b></button></li>
        {serviceGroups.filter((group) => group.id !== '__new').map((group) => { const entry = catalog.find((item) => item.kind === 'service' && item.id === group.id); return <li key={group.id || group.category}>
          <button type="button" className={`cat-svc-item${scope === group.id ? ' is-active' : ''}${group.isActive === false ? ' is-hidden' : ''}`} onClick={() => setScope(group.id)} onDoubleClick={() => eventManager.current?.open('service', entry)}><span>{pick(group, 'name')}</span><b>{group.items.length}</b></button>
          {pick(group, 'description') ? <div className="cat-svc-desc" data-open={scope === group.id} dir={ar ? 'rtl' : undefined}><p>{pick(group, 'description')}</p></div> : null}
          
        </li>; })}
      </ul>
      {!serviceGroups.length && <p className="cat-empty">No services yet.</p>}
    </aside> : null}
    {/* The event editor lives outside the page content: a full-height column that starts at the very top. */}
    {tab === 'events' || mode !== 'events' ? <CatalogEntryManager onDraft={setDraft} key={mode} ref={eventManager} inline startClosed={mode !== 'events'} kind={mode === 'events' ? 'event' : 'service'} hideList renderPrice={(entry) => <PriceEditor key={entry.priceId} label={entry.name} price={prices.find((price) => price.id === entry.priceId)} token={token} onSaved={load} report={report} />} items={catalog} equipment={equipment} token={token} onSaved={load} report={report} onSelectionChange={setSelectedEvent}/> : null}
    {tab === 'equipment' ? (eqOpen ? <EquipmentEditor onDraft={setDraft} key={selectedEvent || 'new'} item={equipment.find((entry) => entry.id === selectedEvent)} services={serviceGroups} token={token} reload={load} report={report} onSelect={() => { setSelectedEvent(''); setEqOpen(false); }} /> : null) : null}
    <div className="cat-main">

    <div className="cat-bar">
    {tab !== 'equipment' && tab !== 'pricing' ? <button type="button" className="cat-btn cat-lang" aria-pressed={ar} onClick={() => setAr((value) => !value)}><Languages size={15} />{ar ? "English view" : "عرض بالعربية"}</button> : null}
    {mode === 'events' ? <nav className="cat-tabs" aria-label="Catalog sections">
      {tabs.map(([id, label, Icon, count]) => <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => {setTab(id);setSelectedEvent('');}}><Icon size={16} strokeWidth={1.7} />{label}{count != null && <b>{count}</b>}</button>)}
    </nav> : null}
      {tab === 'events' ? <button type="button" className="cat-btn is-primary" onClick={()=>eventManager.current?.open('event')}><Plus size={15}/>Add event</button> : null}
    </div>


    {tab === 'events' ? <div className="cat-events-workspace">
      <div className="cat-pane cat-events-main">
                <div className="cat-events-table-wrap"><table className="cat-events-table" dir={ar ? 'rtl' : undefined}><thead><tr><th>Event</th><th>Description</th><th>Visibility</th><th>Order</th></tr></thead><tbody>{events.map(item=><tr key={item.id} aria-selected={selectedEvent===item.id} onClick={()=>openEvent(item)}><th scope="row"><button type="button" className="cat-event-name" onClick={e=>{e.stopPropagation();openEvent(item);}}><Thumb src={item.imageUrl} icon={CalendarDays} name={item.name}/><span>{pick(item, 'name')}</span></button></th><td><span className="cat-event-description">{pick(item, 'description') || '—'}</span></td><td><span className={'cat-event-visibility'+(item.isActive?'':' is-hidden')}>{item.isActive?'Visible':'Hidden'}</span></td><td>{item.sortOrder}</td></tr>)}</tbody></table>{!events.length&&<p className="cat-empty">No events yet. Add the first one.</p>}</div>
      </div>
    </div> : null}


    {tab === 'equipment' ? <div className="cat-events-workspace">
      <div className="cat-pane cat-events-main">
        {eqSubtabs}
        <div className="cat-events-table-wrap cat-equipment-table-wrap"><table className="cat-events-table cat-equipment-table"><thead><tr><th>Rental Equipment</th><th>Rental Service</th><th>Brand</th><th>Model</th><th>Description</th><th>What it does</th><th>YouTube link</th><th>Available qty to rent</th><th>Min qty to rent</th><th>3D model</th></tr></thead><tbody>
          {eqRows.map((item) => <tr key={item.id} aria-selected={selectedEvent === item.id} onClick={() => item.id !== '__new' && selectEquipment(item.id)}>
            <th scope="row"><button type="button" className="cat-event-name" onClick={(e) => { e.stopPropagation(); if (item.id !== '__new') selectEquipment(item.id); }}><Thumb src={item.imageUrl} name={item.name} /><span>{item.name}</span></button></th>
            <td>{item.serviceName}</td>
            <td>{(item.brandModel || '').split(' ')[0] || '—'}</td>
            <td>{(item.brandModel || '').split(' ').slice(1).join(' ') || '—'}</td>
            <td>{item.description ? <button type="button" className="cat-read-link" onClick={(e) => { e.stopPropagation(); setReading({ title: item.name, label: 'Description', text: item.description }); }} title="Opens a popup">Click to read</button> : '—'}</td>
            <td>{item.functionSummary ? <button type="button" className="cat-read-link" onClick={(e) => { e.stopPropagation(); setReading({ title: item.name, label: 'What it does', text: item.functionSummary }); }} title="Opens a popup">Click to read</button> : '—'}</td>
            <td>{item.youtubeUrl ? <a href={item.youtubeUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>Open video</a> : '—'}</td>
            <td>{item.quantityOwned ?? '—'}</td>
            <td>{item.minQuantity ?? '—'}</td>
            <td>{item.modelUrl || item.modelParts?.length ? 'Yes' : '—'}</td>
          </tr>)}
        </tbody></table>{!eqRows.length && <p className="cat-empty">{equipment.length ? 'Nothing matches the filters.' : 'No equipment yet. Add the first item.'}</p>}</div>
      </div>
    </div> : null}

    </div>
    {reading ? <div className="catalog-popup cat-read-popup" role="dialog" aria-modal="true" aria-label={`${reading.title}: ${reading.label}`} onMouseDown={(event) => { if (event.target === event.currentTarget) setReading(null); }}><form onSubmit={(event) => event.preventDefault()}>
      <header><h3>{reading.title} · {reading.label}</h3><button type="button" onClick={() => setReading(null)} aria-label="Close" title="Close" autoFocus><X size={18} /></button></header>
      <p className="cat-read-text">{reading.text}</p>
    </form></div> : null}
  </section>;
}
