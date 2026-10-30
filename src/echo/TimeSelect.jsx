import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Moon } from 'lucide-react';
import './timeSelect.css';

// A dropdown of every 30 minutes, styled for the ECHO AI planner. Values are "HH:MM" like the booking form stores.
// The end time can be after midnight: it lists the hours after the start, with an "After midnight" section.
const pad = (n) => String(n).padStart(2, '0');
const hhmm = (minutes) => `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;
const toMinutes = (value) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(value || '') ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3)) : null);
const clock = (minutes, ar) => {
  const h = Math.floor(minutes / 60) % 24;
  const hour = h % 12 || 12;
  return `${hour}:${pad(minutes % 60)} ${h < 12 ? (ar ? 'ص' : 'AM') : (ar ? 'م' : 'PM')}`;
};

export default function TimeSelect({ id, value = '', onChange, startValue = '', variant = 'start', ar = false, required = false, label, onFocus }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [place, setPlace] = useState(null); // fixed position of the list, so no container can clip it
  const wrap = useRef(null);
  const list = useRef(null);
  const tr = (en, arabic) => (ar ? arabic : en);

  const options = useMemo(() => {
    const start = variant === 'end' ? toMinutes(startValue) : null;
    const out = [];
    if (start === null) { for (let i = 0; i < 48; i++) out.push({ minutes: i * 30, after: false }); return out; }
    // End times run from 30 minutes after the start for the next 24 hours (minus the start itself); past midnight they are "after midnight".
    for (let i = 1; i < 48; i++) { const total = start + i * 30; out.push({ minutes: total % 1440, after: total >= 1440 }); }
    return out;
  }, [variant, startValue]);
  const selectedIndex = options.findIndex((option) => hhmm(option.minutes) === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;
  const firstAfter = options.findIndex((option) => option.after);

  const close = useCallback(() => { setOpen(false); setActive(-1); }, []);
  const choose = (option) => { onChange(hhmm(option.minutes)); close(); wrap.current?.querySelector('button.time-select-trigger')?.focus(); };

  useEffect(() => {
    if (!open) return undefined;
    const away = (event) => { if (!wrap.current?.contains(event.target) && !list.current?.contains(event.target)) close(); };
    const reflow = () => place && measure();
    document.addEventListener('pointerdown', away);
    window.addEventListener('resize', reflow);
    return () => { document.removeEventListener('pointerdown', away); window.removeEventListener('resize', reflow); };
  }, [open, close]);

  // Place the list under the trigger (or above it when there is no room); start on the chosen time (or around 6 PM for a start time).
  const measure = () => {
    const box = wrap.current?.getBoundingClientRect();
    if (!box) return;
    const below = window.innerHeight - box.bottom - 16, above = box.top - 16, up = below < 260 && above > below;
    setPlace({ left: box.left, width: box.width, up, top: up ? undefined : box.bottom + 8, bottom: up ? window.innerHeight - box.top + 8 : undefined, maxHeight: Math.max(160, Math.min(300, up ? above : below)) });
  };
  useLayoutEffect(() => {
    if (!open) { setPlace(null); return; }
    measure();
    const target = selectedIndex >= 0 ? selectedIndex : variant === 'start' ? 36 : 0;
    setActive(selectedIndex >= 0 ? selectedIndex : -1);
    const row = list.current?.querySelector(`[data-index="${target}"]`);
    if (row && list.current) list.current.scrollTop = Math.max(0, row.offsetTop - 80);
  }, [open]);
  useEffect(() => {
    if (open && active >= 0) list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const onKeyDown = (event) => {
    if (!open) { if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) { event.preventDefault(); setOpen(true); } return; }
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    else if (event.key === 'ArrowDown') { event.preventDefault(); setActive((index) => Math.min(options.length - 1, index + 1)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((index) => Math.max(0, index < 0 ? 0 : index - 1)); }
    else if (event.key === 'Home') { event.preventDefault(); setActive(0); }
    else if (event.key === 'End') { event.preventDefault(); setActive(options.length - 1); }
    else if ((event.key === 'Enter' || event.key === ' ') && active >= 0) { event.preventDefault(); choose(options[active]); }
    else if (event.key === 'Tab') close();
  };

  const listId = `${id}-list`;
  return <div className={`time-select${open ? ' is-open' : ''}${selected ? ' has-value' : ''}`} ref={wrap} onFocus={onFocus}>
    <button type="button" id={id} className="time-select-trigger" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} aria-label={label ? `${label}: ${selected ? clock(selected.minutes, ar) : tr('not chosen', 'غير محدد')}` : undefined}
      aria-activedescendant={open && active >= 0 ? `${id}-opt-${active}` : undefined} onClick={() => setOpen((current) => !current)} onKeyDown={onKeyDown}>
      <span className="time-select-value">{selected ? <><b>{clock(selected.minutes, ar)}</b><small>{hhmm(selected.minutes)}{selected.after ? ` · ${tr('after midnight', 'بعد منتصف الليل')}` : ''}</small></> : <em>{tr('Select a time', 'اختر الوقت')}</em>}</span>
      <ChevronDown size={16} aria-hidden="true" />
    </button>
    {required ? <input className="time-select-native" tabIndex={-1} aria-hidden="true" required value={value || ''} onChange={() => {}} /> : null}
    {open && place ? createPortal(<div className={`time-select time-select-portal${place.up ? ' is-up' : ''}`} dir={ar ? 'rtl' : 'ltr'}><ul ref={list} id={listId} className="time-select-list" role="listbox" aria-label={label || tr('Time', 'الوقت')} style={{ left: place.left, width: place.width, top: place.top, bottom: place.bottom, maxHeight: place.maxHeight }}>
      {options.map((option, index) => {
        const chosen = index === selectedIndex;
        return <li key={`${option.minutes}-${option.after}`} role="presentation">
          {index === firstAfter && firstAfter > 0 ? <div className="time-select-divider" role="presentation"><Moon size={12} aria-hidden="true" />{tr('After midnight', 'بعد منتصف الليل')}</div> : null}
          <button type="button" tabIndex={-1} id={`${id}-opt-${index}`} data-index={index} role="option" aria-selected={chosen} className={`time-select-option${chosen ? ' is-selected' : ''}${index === active ? ' is-active' : ''}`}
            onMouseEnter={() => setActive(index)} onClick={() => choose(option)}>
            <span>{clock(option.minutes, ar)}</span><small>{hhmm(option.minutes)}</small>{chosen ? <Check size={14} aria-hidden="true" /> : null}
          </button>
        </li>;
      })}
    </ul></div>, wrap.current?.closest('dialog') || document.body) : null}
  </div>;
}
