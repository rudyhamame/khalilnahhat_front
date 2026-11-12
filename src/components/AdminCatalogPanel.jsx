import {serviceIcon} from '../lib/serviceIcons';
import {notifyCatalogChanged} from '../lib/catalogChanges';
import Equipment3DGenerator from './Equipment3DGenerator';
import {equipmentSetMemberships,isEquipmentSet,setMembersFromItem} from './equipmentSets';
import EquipmentSetEditor from './EquipmentSetEditor';
import EquipmentRoomPlacement from './EquipmentRoomPlacement';
import CatalogEntryManager from './CatalogEntryManager';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { adminToast } from './adminToast';
import { Boxes, Box, Check, Languages, CalendarDays, Layers, Package, Pencil, Plus, Search, TriangleAlert, X, Trash2 } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { GalleryImageField } from '../echo/GalleryPicker';
import './adminCatalog.css';
import './equipmentEditor.css';
import './equipmentRoomPlacement.css';

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
    ? { slug: item.id, name: item.name, brandModel: item.brandModel || '', category: item.category, description: item.description || '', price: money(item.priceCents), minQuantity: item.minQuantity || 1, stockTracked: Boolean(item.stockTracked), quantityOwned: String(item.quantityOwned ?? 1), isActive: item.isActive !== false,imageUrl:item.imageUrl||'',modelParts:(item.modelParts||[]).map(part=>({...part})),modelUrl:item.modelUrl||'',modelJobId:item.modelJobId||'',functionSummary:item.functionSummary||'',eventFit:{...(item.eventFit||{})} }
    : { slug: '', name: '', brandModel: '', category: services[0]?.category || '', description: '', price: '0.00', minQuantity: 1, stockTracked: true, quantityOwned: '1', isActive: true,imageUrl:'',modelParts:[],modelUrl:'',modelJobId:null,functionSummary:'',eventFit:{} });
  const [busy, setBusy] = useState(false),[modelBusy,setModelBusy]=useState(false);
  const set = (key, value) => setV((current) => ({ ...current, [key]: value }));
  useEffect(() => { onDraft({ ...v, id: item?.id || '__new' }); }, [v, item, onDraft]);
  useEffect(() => () => onDraft(null), [onDraft]);
  const remove = async () => {
    setBusy(true);
    try { await apiRequest(`/equipment/${item.id}`, { method: 'DELETE', token }); report(`${item.name} deleted.`); await reload(); onSelect(''); notifyCatalogChanged(); } catch (error) {if(error.cancelled)return; report(error.message || 'The equipment could not be deleted.', true); } finally { setBusy(false); }
  };
  const save = async (event) => {
    event.preventDefault();
    if(modelBusy)return;
    const priceCents = Math.round(Number(v.price) * 100);
    if (!Number.isFinite(priceCents) || priceCents < 0) { report('Enter a valid price.', true); return; }
    const body = { ...(!editing||v.modelJobId!==item.modelJobId||v.modelUrl!==item.modelUrl?{modelJobId:v.modelJobId}:{}), modelParts: v.modelParts, category: v.category, name: v.name.trim(), brandModel: v.brandModel.trim(), description: v.description.trim(), priceCents, minQuantity: Math.max(1, Number(v.minQuantity) || 1), quantityOwned: Math.max(0, Math.round(Number(v.quantityOwned) || 0)), stockTracked: true, isActive: v.isActive, imageUrl: v.imageUrl, functionSummary: v.functionSummary.trim(), eventFit: Object.fromEntries(Object.entries(v.eventFit).map(([type, text]) => [type, String(text || '').trim()]).filter(([, text]) => text)) };
    setBusy(true);
    const slug = v.slug || 'item-' + Date.now().toString(36);
    try {
      if (editing) await apiRequest(`/equipment/${item.id}`, { method: 'PATCH', token, body });
      else await apiRequest('/equipment', { method: 'POST', token, body: { slug, ...body } });
      report(`${body.name} saved.`); await reload(); notifyCatalogChanged();
      onSelect(editing ? item.id : slug);
    } catch (error) {if(error.cancelled)return; report(error.message || 'The equipment could not be saved.', true); } finally { setBusy(false); }
  };
  return <aside className="catalog-entry-dialog catalog-event-editor equipment-editor" aria-label="Equipment editor"><form onSubmit={save} onInvalid={event=>event.target.closest('details')?.setAttribute('open','')}>
    <header className="equipment-editor-header"><span className="equipment-editor-icon"><Package size={21} strokeWidth={1.5}/></span><div><small>EQUIPMENT CATALOG</small><h3>{editing?'Edit equipment':'New equipment'}</h3></div></header>
    <fieldset className="equipment-editor-body" disabled={busy}>
      <section className="equipment-editor-section" aria-labelledby="equipment-details-title">
        <h4 id="equipment-details-title"><span>01</span>Equipment details</h4>
        <label>Name <span className="equipment-required">Required</span><input autoFocus required maxLength={160} placeholder="Equipment name" value={v.name} onChange={event=>{const name=event.target.value;setV(current=>({...current,name,...(!editing?{slug:slugify(name)}:{})}));}}/></label>
        <label>Service <span className="equipment-required">Required</span><select required value={v.category} onChange={event=>set('category',event.target.value)}><option value="" disabled>Select a service</option>{services.map(service=><option key={service.category} value={service.category}>{service.name}</option>)}{v.category&&!services.some(service=>service.category===v.category)&&<option value={v.category}>{v.category}</option>}</select></label>
        <label>Brand / model<input maxLength={160} placeholder="Brand and model name" value={v.brandModel} onChange={event=>set('brandModel',event.target.value)}/></label>
        <label>Description<textarea rows={3} maxLength={2000} placeholder="Describe this equipment for your clients." value={v.description} onChange={event=>set('description',event.target.value)}/></label>
        <label>What it does<textarea rows={2} maxLength={600} placeholder="A short explanation of what this equipment does." value={v.functionSummary} onChange={event=>set('functionSummary',event.target.value)}/></label>
      </section>
      <section className="equipment-editor-section" aria-labelledby="equipment-stock-title">
        <h4 id="equipment-stock-title"><span>02</span>Pricing & availability</h4>
        <div className="equipment-editor-pair"><label>Price (CAD)<input required type="number" min="0" step="0.01" value={v.price} onChange={event=>set('price',event.target.value)}/></label><label>Available quantity<input required type="number" min="0" step="1" value={v.quantityOwned} onChange={event=>set('quantityOwned',event.target.value)}/></label><label>Minimum quantity<input required type="number" min="1" step="1" value={v.minQuantity} onChange={event=>set('minQuantity',event.target.value)}/></label></div>
      </section>
      <section className="equipment-editor-section" aria-labelledby="equipment-media-title">
        <h4 id="equipment-media-title"><span>03</span>Artwork</h4>
        <GalleryImageField token={token} label="Equipment photo" previewPicks value={v.imageUrl} disabled={busy} onChange={url=>set('imageUrl',url)}/>
        <Equipment3DGenerator token={token} name={v.name} value={{modelUrl:v.modelUrl,modelJobId:v.modelJobId}} onBusyChange={setModelBusy} onChange={model=>setV(current=>({...current,...model}))}/>
      </section>
    </fieldset>
    <footer><Switch checked={v.isActive} onChange={(next) => set('isActive', next)} label={v.isActive ? 'Available' : 'Unavailable'} /><span className="cat-footer-spacer"/>{editing&&<button type="button" className="catalog-icon-btn is-danger" disabled={busy} onClick={remove} aria-label="Delete equipment" title="Delete equipment"><Trash2 size={18}/></button>}{editing&&<button type="button" className="catalog-icon-btn" disabled={busy} onClick={()=>onSelect('')} aria-label="Cancel" title="Cancel"><X size={18}/></button>}<button type="submit" className="catalog-save catalog-icon-btn" disabled={busy||modelBusy} aria-label={busy?'Saving…':editing?'Save equipment':'Add equipment'} title={busy?'Saving…':editing?'Save equipment':'Add equipment'}><Check size={18}/></button></footer>
  </form></aside>;
}

export default function AdminCatalogPanel({ token }) {
  const [equipment, setEquipment] = useState([]);
  const [prices, setPrices] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [tab, setTab] = useState('events');
  const [ar, setAr] = useState(false);
  const pick = (row, key) => (ar && row[key + 'Ar']) || row[key];
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('all');
  const [deletingService, setDeletingService] = useState('');
  const eventManager=useRef(null),root=useRef(null);
  const [selectedEvent,setSelectedEvent]=useState('');
  const [draft, setDraft] = useState(null);
  const [eqView,setEqView]=useState('individual');
  const [placing,setPlacing]=useState(null);
  const selectEquipment=id=>{if(isEquipmentSet(equipment.find(row=>row.id===id)))setEqView('sets');setSelectedEvent(id);};
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
    .then(([equipmentResult, priceResult, catalogResult]) => { setCatalog(catalogResult.items || []); setEquipment(equipmentResult.items || []); setPrices(priceResult.items || []); })
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
    const known = new Set(services.map((service) => service.category));
    const other = liveEquipment.filter((item) => !isEquipmentSet(item) && !known.has(item.category));
    return [...services.map((service) => ({ ...service, items: liveEquipment.filter((item) => item.category === service.category || (service.equipmentIds || []).includes(item.id)), price: service.__new && service.newPrice ? { amountCents: Math.round(Number(service.newPrice) * 100), currency: service.newCurrency || 'CAD' } : prices.find((price) => price.id === service.priceId) })),
      ...(other.length ? [{ id: 'other', category: 'other', name: 'Other equipment', items: other, price: null, noPrice: true }] : [])];
  }, [liveEquipment, prices, liveCatalog]);
  const serviceGroups = groups.filter((group) => !group.noPrice);
  const selectedService = serviceGroups.find((group) => group.id === selectedEvent);
  useEffect(() => { if (scope !== 'all' && groups.length && !groups.some((group) => group.category === scope)) setScope('all'); }, [groups, scope]);
  const needle = query.trim().toLowerCase();
  const eqRows = groups.filter((group) => scope === 'all' || group.category === scope)
    .flatMap((group) => group.items.filter((item) => !isEquipmentSet(item)).map((item) => ({ ...item, serviceName: group.name })))
    .filter((item) => (!needle || `${item.name} ${item.brandModel || ''} ${(setMemberships.get(item.id)||[]).map(set=>set.name).join(' ')}`.toLowerCase().includes(needle)));
  const setRows = liveEquipment.filter(isEquipmentSet).map((row) => ({ ...row, serviceName: serviceGroups.find((group) => group.category === row.category)?.name || row.category, pieces: (setMembersFromItem(row, equipment).map((member) => `${equipment.find((entry) => entry.id === member.equipmentId)?.name || member.equipmentId}${member.quantity > 1 ? ` ×${member.quantity}` : ''}`)) }));
  const eqSubtabs = <div className="cat-subtabs" role="tablist" aria-label="Equipment type">{[['individual', 'Individual', equipment.filter((row) => !isEquipmentSet(row)).length], ['sets', 'Sets', equipment.filter(isEquipmentSet).length]].map(([id, label, count]) => <button key={id} type="button" role="tab" aria-selected={eqView === id} onClick={() => { setEqView(id); setSelectedEvent(''); }}>{label}<b>{count}</b></button>)}</div>;
  const tabs = [['events', 'Events', CalendarDays, events.length], ['services', 'Services', Layers, serviceGroups.length], ['equipment', 'Equipment', Package, equipment.length]];

  return <section ref={root} className={`admin-catalog has-event-editor${tab === 'services' ? ' is-service-tab' : ''}`} aria-label="Events, services and equipment">
    {/* The event editor lives outside the page content: a full-height column that starts at the very top. */}
    {tab === 'events' || tab === 'services' ? <CatalogEntryManager onDraft={setDraft} key={tab} ref={eventManager} inline kind={tab === 'events' ? 'event' : 'service'} hideList renderPrice={(entry) => <PriceEditor key={entry.priceId} label={entry.name} price={prices.find((price) => price.id === entry.priceId)} token={token} onSaved={load} report={report} />} items={catalog} equipment={equipment} token={token} onSaved={load} report={report} onSelectionChange={setSelectedEvent}/> : null}
    {tab === 'equipment' && eqView === 'individual' ? <EquipmentEditor onDraft={setDraft} key={selectedEvent || 'new'} item={equipment.find((entry) => entry.id === selectedEvent)} services={serviceGroups} token={token} reload={load} report={report} onSelect={selectEquipment} /> : tab === 'equipment' ? <EquipmentSetEditor key={selectedEvent||'new-set'} item={equipment.find(entry=>entry.id===selectedEvent)} equipment={equipment.filter(row=>row.id!=='__new')} services={serviceGroups} category={scope==='all'?undefined:scope} token={token} onDraft={setDraft} report={report} onSaved={async id=>{await load();setSelectedEvent(id);}} onCancel={()=>setSelectedEvent('')}/> : null}
    <div className="cat-main">

    <div className="cat-bar">
    {tab !== 'equipment' ? <button type="button" className="cat-btn cat-lang" aria-pressed={ar} onClick={() => setAr((value) => !value)}><Languages size={15} />{ar ? "English view" : "عرض بالعربية"}</button> : null}
    <nav className="cat-tabs" aria-label="Catalog sections">
      {tabs.map(([id, label, Icon, count]) => <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => {setTab(id);setSelectedEvent('');}}><Icon size={16} strokeWidth={1.7} />{label}<b>{count}</b></button>)}
    </nav>
      {tab === 'equipment' && eqView === 'individual' ? <button type="button" className="cat-btn is-primary cat-set-actions" onClick={()=>{setSelectedEvent('');setEqView('sets');}}><Layers size={15}/>Make a set</button> : null}
      {tab === 'equipment' && eqView === 'sets' ? <button type="button" className="cat-btn is-primary cat-set-actions" onClick={()=>setSelectedEvent('')}><Plus size={15}/>New set</button> : null}
      {tab === 'events' ? <button type="button" className="cat-btn is-primary" onClick={()=>eventManager.current?.open('event')}><Plus size={15}/>Add event</button> : tab === 'services' ? <div className="cat-service-toolbar-actions"><button type="button" className="cat-btn is-primary" onClick={() => eventManager.current?.open('service')}><Plus size={15} />Add service</button>{selectedService ? <><button type="button" className="cat-btn" onClick={() => eventManager.current?.open('service', catalog.find(item => item.kind === 'service' && item.id === selectedService.id))}><Pencil size={14} />Edit service</button><button type="button" className="cat-btn is-danger" disabled={deletingService === selectedService.id} onClick={() => deleteService(selectedService)}><Trash2 size={14} />{deletingService === selectedService.id ? 'Deleting…' : 'Delete service'}</button></> : null}</div> : <button type="button" className="cat-btn is-primary cat-equipment-add" onClick={() => {setSelectedEvent('');setEqView('individual');}}><Plus size={15} />Add equipment</button>}
    </div>

    {tab === 'events' ? <div className="cat-events-workspace">
      <div className="cat-pane cat-events-main">
                <div className="cat-events-table-wrap"><table className="cat-events-table" dir={ar ? 'rtl' : undefined}><thead><tr><th>Event</th><th>Description</th><th>Visibility</th><th>Order</th></tr></thead><tbody>{events.map(item=><tr key={item.id} aria-selected={selectedEvent===item.id} onClick={()=>openEvent(item)}><th scope="row"><button type="button" className="cat-event-name" onClick={e=>{e.stopPropagation();openEvent(item);}}><Thumb src={item.imageUrl} icon={CalendarDays} name={item.name}/><span>{pick(item, 'name')}</span></button></th><td><span className="cat-event-description">{pick(item, 'description') || '—'}</span></td><td><span className={'cat-event-visibility'+(item.isActive?'':' is-hidden')}>{item.isActive?'Visible':'Hidden'}</span></td><td>{item.sortOrder}</td></tr>)}</tbody></table>{!events.length&&<p className="cat-empty">No events yet. Add the first one.</p>}</div>
      </div>
    </div> : null}

    {tab === 'services' ? <div className="cat-events-workspace">
      <div className="cat-pane cat-events-main">
        <div className="cat-events-table-wrap"><table className="cat-events-table cat-services-table" dir={ar ? 'rtl' : undefined}><thead><tr><th>Service</th><th>Description</th><th>Equipment</th><th>Price</th><th>Visibility</th></tr></thead><tbody>
          {serviceGroups.map((group) => { const entry = catalog.find((item) => item.id === group.id); const isDraft = group.id === '__new'; return <tr key={group.id || group.category} aria-selected={selectedEvent === group.id || isDraft} onClick={() => { if (!isDraft) eventManager.current?.open('service', entry); }}>
            <th scope="row"><button type="button" className="cat-event-name" onClick={(e) => { e.stopPropagation(); if (!isDraft) eventManager.current?.open('service', entry); }}><Thumb src={group.imageUrl} icon={serviceIcon(group)} name={group.name} /><span>{pick(group, 'name')}</span></button></th>
            <td><span className="cat-event-description">{pick(group, 'description') || '—'}</span></td>
            <td>{group.items.length}</td>
            <td className="cat-price-cell">{group.price ? <>{group.price.currency || 'CAD'} {money(group.price.amountCents)}{group.price.isActive === false ? ' (inactive)' : ''}</> : <span className="cat-muted">No price set up yet</span>}</td>
            <td><span className={'cat-event-visibility' + (group.isActive === false ? ' is-hidden' : '')}>{group.isActive === false ? 'Hidden' : 'Visible'}</span></td>
          </tr>; })}
        </tbody></table>{!serviceGroups.length && <p className="cat-empty">No services yet. Add the first one.</p>}</div>
      </div>
    </div> : null}

    {tab === 'equipment' && eqView === 'individual' ? <div className="cat-events-workspace">
      <div className="cat-pane cat-events-main">
        {eqSubtabs}
        <div className="cat-toolbar">
          <label className="cat-search"><Search size={15} aria-hidden="true" /><input type="search" placeholder="Search equipment" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search equipment" /></label>
          <select className="cat-service-select" aria-label="Filter by service" value={scope} onChange={(event) => setScope(event.target.value)}><option value="all">All services</option>{groups.map((group) => <option key={group.category} value={group.category}>{group.name}</option>)}</select>
        </div>
        <div className="cat-events-table-wrap cat-equipment-table-wrap"><table className="cat-events-table cat-equipment-table"><colgroup><col className="cat-equipment-col"/><col className="cat-service-col"/><col className="cat-unit-price-col"/><col className="cat-min-col"/><col className="cat-available-col"/><col className="cat-reserved-col"/><col className="cat-stock-col"/><col className="cat-room-col"/></colgroup><thead><tr><th>Equipment</th><th>Service</th><th>Price</th><th>Min qty</th><th>Available qty</th><th>Reserved qty</th><th>Stock</th><th>3D room</th></tr></thead><tbody>
          {eqRows.map((item) => <tr key={item.id} aria-selected={selectedEvent === item.id} onClick={() => item.id !== '__new' && selectEquipment(item.id)}>
            <th scope="row"><button type="button" className="cat-event-name" onClick={(e) => { e.stopPropagation(); if (item.id !== '__new') selectEquipment(item.id); }}><Thumb src={item.imageUrl} name={item.name} /><span>{item.name}{item.brandModel ? <small>{item.brandModel}</small> : null}</span></button></th>
            <td>{item.serviceName}</td>
            <td>{money(item.priceCents)}</td>
            <td>{item.minQuantity}</td>
            <td>{Number.isFinite(item.availableQuantity) ? item.availableQuantity : '—'}</td>
            <td>{item.reservedQuantity ?? 0}</td>
            <td>{(() => { const left = Number.isFinite(item.availableQuantity) ? item.availableQuantity - (item.reservedQuantity || 0) : null; const out = left !== null && (left <= 0 || left < (item.minQuantity || 1)); const label = !item.isActive ? 'Unavailable' : out ? 'Out of stock' : 'Available'; return <span className={'cat-event-visibility' + (label === 'Available' ? '' : ' is-hidden')}>{label}</span>; })()}</td>
            <td>{item.id !== '__new' && <button type="button" className={'cat-room-place' + (item.roomPlacement ? ' is-set' : '')} onClick={(e) => { e.stopPropagation(); setPlacing(item); }} title={item.roomPlacement ? 'Placed in the 3D room: click to move it' : 'Set where this stands in the clients\' 3D room'}><Box size={14} aria-hidden="true"/>{item.roomPlacement ? 'Placed' : 'Place'}</button>}</td>
          </tr>)}
        </tbody></table>{!eqRows.length && <p className="cat-empty">{equipment.length ? 'Nothing matches the filters.' : 'No equipment yet. Add the first item.'}</p>}</div>
      </div>
    </div> : null}

    {tab === 'equipment' && eqView === 'sets' ? <div className="cat-events-workspace">
      <div className="cat-pane cat-events-main">
        {eqSubtabs}
        <div className="cat-events-table-wrap"><table className="cat-events-table cat-sets-table"><thead><tr><th>Set</th><th>Pieces</th><th>Price</th><th>Available qty</th><th>Stock</th></tr></thead><tbody>
          {setRows.map((row, setIndex) => {
            const lines = row.pieces.length ? row.pieces : [`${row.modelParts?.length || 0} pieces`];
            const pick = () => { if (row.id !== '__new') setSelectedEvent(row.id); };
            const span = lines.length;
            return lines.map((piece, index) => <tr key={`${row.id}-${index}`} className={`${index === 0 ? 'cat-set-first' : 'cat-set-sub'}${index === span - 1 ? ' cat-set-last' : ''}${setIndex === setRows.length - 1 ? ' is-final' : ''}`} aria-selected={selectedEvent === row.id} onClick={pick}>
              {index === 0 ? <th scope="row" rowSpan={span}><button type="button" className="cat-event-name" onClick={(e) => { e.stopPropagation(); pick(); }}><Thumb src={row.imageUrl} icon={Boxes} name={row.name} /><span>{row.name}</span></button></th> : null}
              <td className="cat-set-piece">{piece}</td>
              {index === 0 ? <><td rowSpan={span}>CAD {money(row.priceCents)}</td>
              <td rowSpan={span}>{Number.isFinite(row.availableQuantity) ? row.availableQuantity : '—'}</td>
              <td rowSpan={span}>{(() => { const left = Number.isFinite(row.availableQuantity) ? row.availableQuantity - (row.reservedQuantity || 0) : null; const label = !row.isActive ? 'Unavailable' : left !== null && left <= 0 ? 'Out of stock' : 'Available'; return <span className={'cat-event-visibility' + (label === 'Available' ? '' : ' is-hidden')}>{label}</span>; })()}</td></> : null}
            </tr>);
          })}
        </tbody></table>{!setRows.length && <p className="cat-empty">No sets yet. Fill in the form on the left to make the first one.</p>}</div>
      </div>
    </div> : null}

    {placing && <EquipmentRoomPlacement item={placing} allItems={equipment} token={token} report={report} onClose={() => setPlacing(null)} onSaved={async () => { await load(); notifyCatalogChanged(); }} />}
    </div>
  </section>;
}
