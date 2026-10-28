import { useEffect, useMemo, useRef, useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { dialectRecord, searchDialects } from '../lib/dialects';
import './dialectPicker.css';

const MAX = 30;

// Searchable, hierarchical (family → country → region) multi-select shown in English and Arabic.
export default function DialectPicker({ id, label, value = [], onChange, ar }) {
  const [query, setQuery] = useState(''), [open, setOpen] = useState(false), [active, setActive] = useState(0);
  const box = useRef(null), list = useRef(null);
  const results = useMemo(() => searchDialects(query).filter(item => !['unknown', 'other'].includes(item.id)), [query]);
  const rows = useMemo(() => [dialectRecord('unknown'), dialectRecord('other'), ...results].filter(Boolean), [results]);
  const selected = new Set(value);

  useEffect(() => {
    const away = event => { if (!box.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, []);
  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => { list.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }); }, [active, open]);

  const toggle = item => {
    if (selected.has(item.id)) return onChange(value.filter(entry => entry !== item.id));
    if (item.id === 'unknown') return onChange(['unknown']);
    if (value.length >= MAX) return;
    onChange([...value.filter(entry => entry !== 'unknown'), item.id]);
  };
  const onKeyDown = event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive(index => Math.min(rows.length - 1, index + 1)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(index => Math.max(0, index - 1)); }
    else if (event.key === 'Enter' && open) { event.preventDefault(); if (rows[active]) toggle(rows[active]); }
    else if (event.key === 'Escape') setOpen(false);
    else if (event.key === 'Backspace' && !query && value.length) onChange(value.slice(0, -1));
  };

  // Group headings only where the family/country changes between consecutive rows.
  let lastFamily = null, lastCountry = null;
  return <div className="order-field-wide dialect-picker" ref={box}>
    <label htmlFor={id}>{label}</label>
    {value.length>0&&<ul className="dialect-tags" aria-label={ar?'اللهجات المختارة':'Selected dialects'}>
      {value.map(entry => { const item = dialectRecord(entry); return item&&<li key={entry}><span>{item.display_name}<small lang="ar" dir="rtl">{item.display_name_ar}</small></span>
        <button type="button" aria-label={(ar?'إزالة ':'Remove ')+item.display_name} onClick={() => onChange(value.filter(other => other !== entry))}><X size={13}/></button></li>; })}
    </ul>}
    <div className="dialect-control">
      <input id={id} type="text" role="combobox" aria-expanded={open} aria-controls={id+'-list'} aria-autocomplete="list" autoComplete="off" value={query}
        placeholder={ar?'اختر لهجة الأغنية...':'Select song dialect...'} onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setOpen(true); }} onKeyDown={onKeyDown}/>
      <button type="button" className="dialect-toggle" tabIndex={-1} aria-label={ar?'عرض الخيارات':'Show options'} onClick={() => setOpen(value => !value)}><ChevronDown size={16}/></button>
    </div>
    {open&&<ul className="dialect-list" id={id+'-list'} role="listbox" aria-multiselectable="true" ref={list}>
      {results.length===0&&<li className="dialect-empty" role="presentation">{ar?'لا توجد نتائج':'No matches'}</li>}
      {rows.map((item, index) => {
        const heads = [];
        if (item.dialect_family && item.dialect_family !== lastFamily) { lastFamily = item.dialect_family; lastCountry = null; heads.push(<li className="dialect-family" role="presentation" key={'f'+item.id}>{item.dialect_family}<span lang="ar" dir="rtl">{item.dialect_family_ar}</span></li>); }
        if (item.country && item.country !== lastCountry) { lastCountry = item.country; heads.push(<li className="dialect-country" role="presentation" key={'c'+item.id}>{item.country}<span lang="ar" dir="rtl">{item.country_ar}</span></li>); }
        const name = item.regional_dialect ? item.regional_dialect : item.display_name, nameAr = item.regional_dialect ? item.regional_dialect_ar : item.display_name_ar;
        return [...heads, <li key={item.id} role="option" aria-selected={selected.has(item.id)} data-active={index === active} className="dialect-option" onPointerDown={event => event.preventDefault()} onClick={() => toggle(item)}>
          <span>{name}</span><span lang="ar" dir="rtl">{nameAr}</span></li>];
      })}
    </ul>}
    <p className="order-field-help">{ar?'يمكنك اختيار أكثر من لهجة، أو اختيار البلد فقط (عام).':'Pick more than one if the songs are mixed, or just choose the country (General).'}</p>
  </div>;
}
