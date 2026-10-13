import { useEffect, useState } from 'react';
import { fetchEquipment } from '../lib/api';
import { setCartItem, useCart } from './cart';

export default function EquipmentPage({ lang }) {
  const { t } = lang;
  const cart = useCart();
  const [items, setItems] = useState([]);
  const [error, setError] = useState(false);
  const [cat, setCat] = useState('all');
  const [qty, setQty] = useState({});

  useEffect(() => {
    fetchEquipment().then((r) => setItems(r.items)).catch(() => setError(true));
  }, []);

  const cats = ['all', ...new Set(items.map((i) => i.category))];
  const shown = items.filter((i) => cat === 'all' || i.category === cat);
  const count = Object.keys(cart).length;

  return (
    <section className="echo-section">
      <h1 className="echo-h1">{t.eqTitle}</h1>
      <p>{t.eqIntro}</p>
      <div className="echo-tabs" role="tablist">
        {cats.map((c) => (
          <button key={c} type="button" role="tab" aria-selected={cat === c}
            className={cat === c ? 'is-on' : ''} onClick={() => setCat(c)}>{t.cats[c] || c}</button>
        ))}
      </div>
      {error && <p role="alert">{t.loadFail}</p>}
      <div className="echo-grid">
        {shown.map((item) => {
          const inCart = cart[item.id];
          const q = qty[item.id] ?? inCart?.quantity ?? item.minQuantity;
          return (
            <article className="echo-card" key={item.id}>
              <div className="echo-photo">
                {item.imageUrl ? <img src={item.imageUrl} alt={item.name} loading="lazy" /> : <span>{t.noPhoto}</span>}
              </div>
              <h3>{item.name}</h3>
              {item.brandModel && <p className="echo-muted">{item.brandModel}</p>}
              {item.description && <p>{item.description}</p>}
              {item.minQuantity > 1 && <p className="echo-muted">{t.minQty(item.minQuantity)}</p>}
              <label className="echo-qty">{t.qty}
                <input type="number" min={item.minQuantity} value={q}
                  onChange={(e) => setQty({ ...qty, [item.id]: Math.max(item.minQuantity, Number(e.target.value) || item.minQuantity) })} />
              </label>
              <button type="button" className="echo-btn" onClick={() => setCartItem(item, q)}>
                {inCart ? `${t.inQuote} (${inCart.quantity})` : t.addToQuote}
              </button>
              {inCart && <button type="button" className="echo-link" onClick={() => setCartItem(item, 0)}>{t.remove}</button>}
            </article>
          );
        })}
      </div>
      {count > 0 && (
        <div className="echo-quotebar">
          <span>{t.quoteBar(count)}</span>
          <a className="echo-btn" href="/quote">{t.quoteBarCta}</a>
        </div>
      )}
    </section>
  );
}
