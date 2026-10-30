import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapPin } from 'lucide-react';
import { isGta, searchAddresses } from '../lib/addressSearch';
import './dialectPicker.css';
import './addressAutocomplete.css';

// The results float outside scrolling sidebars while remaining anchored to the input.
export default function AddressAutocomplete({ id, label, required, value, onType, onPick, ar, readOnly, placeholder, seed = '' }) {
  const [options, setOptions] = useState([]), [open, setOpen] = useState(false), [active, setActive] = useState(0), [failed, setFailed] = useState(false);
  const [focused, setFocused] = useState(false), [placement, setPlacement] = useState(null), [manual, setManual] = useState(false);
  const box = useRef(null), input = useRef(null), list = useRef(null), selection = useRef(null);
  const visible = open && !readOnly; // opens after every search, so "Other" is always there when nothing matches

  useEffect(() => {
    const away = event => { if (!box.current?.contains(event.target) && !list.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, []);
  useEffect(() => {
    setOptions([]); setOpen(false);
    const typed = String(value || '').trim(), query = typed || String(seed || '').trim();
    if (!focused || readOnly || manual || query.length < (typed ? 4 : 3) || selection.current?.includes(query)) return undefined;
    selection.current = null;
    const controller = new AbortController();
    const timer = setTimeout(() => searchAddresses(query, controller.signal)
      .then(items => { if (!controller.signal.aborted) { setOptions(items); setFailed(false); setActive(0); setOpen(true); } })
      .catch(error => { if (!controller.signal.aborted && error.name !== 'AbortError') setFailed(true); }), 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [value, readOnly, focused, seed, manual]);
  useEffect(() => { setManual(false); }, [seed]);

  useLayoutEffect(() => {
    if (!visible) { setPlacement(null); return undefined; }
    const anchor = input.current;
    const position = () => {
      const rect = anchor.getBoundingClientRect(), margin = 12, gap = 6;
      const width = Math.min(Math.max(rect.width, 340), 480, window.innerWidth - margin * 2);
      const below = window.innerHeight - rect.bottom - margin - gap, above = rect.top - margin - gap;
      const upward = below < 180 && above > below;
      setPlacement({ position: 'fixed', width, left: Math.max(margin, Math.min(rect.left, window.innerWidth - margin - width)),
        ...(upward ? { bottom: window.innerHeight - rect.top + gap } : { top: rect.bottom + gap }), maxHeight: Math.max(0, Math.min(320, upward ? above : below)) });
    };
    position();
    const scroll = event => { if (!list.current?.contains(event.target)) position(); };
    window.addEventListener('resize', position);
    window.addEventListener('scroll', scroll, true);
    const resize = new ResizeObserver(position); resize.observe(anchor);
    const intersection = new IntersectionObserver(entries => { if (!entries[0].isIntersecting) setOpen(false); }); intersection.observe(anchor);
    return () => { window.removeEventListener('resize', position); window.removeEventListener('scroll', scroll, true); resize.disconnect(); intersection.disconnect(); };
  }, [visible]);
  useEffect(() => { if (visible) list.current?.children[active]?.scrollIntoView({ block: 'nearest' }); }, [active, visible]);

  const pick = item => {
    selection.current = [item.name, item.address].filter(Boolean).map(text => text.trim());
    setOpen(false); setOptions([]);
    onPick({ name: item.name, address: item.address, city: item.city, postalCode: item.postal, country: item.countryName, details: item.details, area: item.province && item.province !== 'Ontario' ? 'outside_gta' : isGta(item.city) ? 'gta' : 'outside_gta' });
  };
  const onKeyDown = event => {
    if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); return; }
    if (!options.length) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive(index => open ? Math.min(options.length - 1, index + 1) : 0); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); setActive(index => open ? Math.max(0, index - 1) : options.length - 1); }
    else if (event.key === 'Enter' && open) { event.preventDefault(); pick(options[active]); }
  };
  return <div className="dialect-picker address-autocomplete" ref={box}>
    <label htmlFor={id}>{label}{required ? ' *' : ''}</label>
    <div className="dialect-control">
      <input ref={input} id={id} type="text" role="combobox" aria-expanded={visible} aria-controls={id + '-list'} aria-activedescendant={visible ? `${id}-option-${active}` : undefined} aria-autocomplete="list" autoComplete="off" maxLength={240} required={required} readOnly={readOnly}
        value={value || ''} placeholder={placeholder || (ar ? 'ابدأ بكتابة العنوان...' : 'Start typing the address...')} onChange={event => { setOpen(false); onType(event.target.value); }} onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); setOpen(false); }} onKeyDown={onKeyDown}/>
      <span className="dialect-toggle" aria-hidden="true"><MapPin size={16}/></span>
    </div>
    {visible && placement && createPortal(<ul ref={list} className="address-suggestions" style={placement} dir={ar ? 'rtl' : 'ltr'} id={id + '-list'} role="listbox" aria-label={ar ? 'نتائج العناوين' : 'Address results'}>
      {!options.length && <li role="presentation" className="address-suggestion address-suggestion-empty"><span className="address-suggestion-locality">{ar ? 'لا توجد نتائج مطابقة.' : 'No matching place found.'}</span></li>}
      {options.map((item, index) => <li key={item.address + item.city + item.postal} id={`${id}-option-${index}`} role="option" aria-selected={index === active} className="address-suggestion" onPointerDown={event => event.preventDefault()} onPointerMove={() => setActive(index)} onClick={() => pick(item)}>
        {item.name && item.name.trim().toLowerCase() !== item.address.trim().toLowerCase() && <strong className="address-suggestion-name">{item.name}</strong>}
        <span className="address-suggestion-street">{item.address}</span>
        <span className="address-suggestion-locality">{[item.city, item.postal].filter(Boolean).join(' · ')}</span>
      </li>)}
      <li role="option" aria-selected="false" className="address-suggestion address-suggestion-other" onPointerDown={event => event.preventDefault()} onClick={() => { setManual(true); setOpen(false); setOptions([]); input.current?.focus(); }}>
        <span className="address-suggestion-street">{ar ? 'أخرى — سأدخل العنوان بنفسي' : 'Other — I will enter the address myself'}</span>
      </li>
    </ul>, box.current?.closest('dialog[open]') || document.body)}
    {failed && <p className="order-field-help">{ar ? 'تعذر البحث عن العناوين الآن، يمكنك كتابة العنوان يدوياً.' : 'Address suggestions are unavailable right now; you can type the address manually.'}</p>}
  </div>;
}
