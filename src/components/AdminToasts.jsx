import { useEffect, useState } from 'react';
import { CircleCheck, TriangleAlert, X } from 'lucide-react';
import './adminToasts.css';

export default function AdminToasts() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let next = 0;
    const timers = new Set();
    const onToast = (event) => {
      const id = ++next;
      setItems((list) => [...list.slice(-3), { id, ...event.detail }]);
      // Collapse on its own: fade/shrink out first, then remove.
      const leave = setTimeout(() => {
        timers.delete(leave); setItems((list) => list.map((item) => (item.id === id ? { ...item, leaving: true } : item)));
        const gone = setTimeout(() => { timers.delete(gone); setItems((list) => list.filter((item) => item.id !== id)); }, 260);
        timers.add(gone);
      }, event.detail.error ? 8000 : 3500);
      timers.add(leave);
    };
    window.addEventListener('admin:toast', onToast);
    return () => { window.removeEventListener('admin:toast', onToast); timers.forEach(clearTimeout); };
  }, []);
  if (!items.length) return null;
  return <div className="admin-toasts" aria-live="polite">
    {items.map((item) => <div key={item.id} className={`admin-toast${item.error ? ' is-error' : ''}${item.leaving ? ' is-leaving' : ''}`} role={item.error ? 'alert' : 'status'}>
      {item.error ? <TriangleAlert size={15} /> : <CircleCheck size={15} />}<span>{item.text}</span>
      <button type="button" aria-label="Dismiss" onClick={() => setItems((list) => list.filter((row) => row.id !== item.id))}><X size={13} /></button>
    </div>)}
  </div>;
}
