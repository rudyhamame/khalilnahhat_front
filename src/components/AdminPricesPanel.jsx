import { useEffect, useState } from 'react';

function formatAmount(amountCents, currency) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: currency || 'CAD',
  }).format(Number(amountCents || 0) / 100);
}

function AdminPricesPanel({ prices, onUpdatePrice }) {
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        prices.map((price) => [price.id, {
          amount: String((Number(price.amountCents || 0) / 100).toFixed(2)),
          currency: price.currency || 'CAD',
          isActive: price.isActive !== false,
        }]),
      ),
    );
  }, [prices]);

  const updateDraft = (priceId, field, value) => {
    setDrafts((current) => ({
      ...current,
      [priceId]: { ...current[priceId], [field]: value },
    }));
  };

  const savePrice = async (price) => {
    const draft = drafts[price.id];
    const amount = Number(draft?.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      setStatus(`Enter a valid amount for ${price.name}.`);
      return;
    }

    setSavingId(price.id);
    setStatus('');
    try {
      await onUpdatePrice(price.id, {
        amountCents: Math.round(amount * 100),
        currency: draft.currency,
        isActive: draft.isActive,
      });
      setStatus(`${price.name} price saved.`);
    } catch (error) {
      setStatus(error.message || 'The price could not be saved.');
    } finally {
      setSavingId('');
    }
  };

  return (
    <section id="admin-prices" className="admin-panel admin-prices-panel">
      <div className="section-label admin-panel-head">
        <div className="admin-panel-head-copy">
          <p className="section-number">
            <span className="section-number-mark">KN//</span>
            <span className="section-number-value">04</span>
          </p>
          <h2>SERVICES AND PRICES</h2>
        </div>
        <span className="admin-prices-count">{`${prices.length} SERVICES`}</span>
      </div>

      <div className="admin-prices-shell">
        <div className="admin-prices-intro">
          <p className="detail-label">SERVICE PRICE CONTROL</p>
          <h3>Set the amount customers see in your service flow.</h3>
          <p>Song Request During Events is used by Stripe Checkout when an audience member pays to request a song.</p>
        </div>

        <div className="admin-prices-table-wrap">
          <table className="admin-prices-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Category</th>
                <th>Price</th>
                <th>Currency</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {prices.map((price) => {
                const draft = drafts[price.id] || {};
                return (
                  <tr key={price.id} className={price.id === 'song-request-live' ? 'is-featured' : ''}>
                    <th scope="row">
                      <strong>{price.name}</strong>
                      {price.id === 'song-request-live' ? <small>Used for live song requests</small> : null}
                    </th>
                    <td>{price.category}</td>
                    <td>
                      <label className="admin-price-input">
                        <span className="sr-only">Price for {price.name}</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.amount || ''}
                          onChange={(event) => updateDraft(price.id, 'amount', event.target.value)}
                        />
                      </label>
                    </td>
                    <td>
                      <select
                        value={draft.currency || price.currency || 'CAD'}
                        onChange={(event) => updateDraft(price.id, 'currency', event.target.value)}
                        aria-label={`Currency for ${price.name}`}
                      >
                        <option value="CAD">CAD</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </td>
                    <td>
                      <label className="admin-price-active">
                        <input
                          type="checkbox"
                          checked={draft.isActive !== false}
                          onChange={(event) => updateDraft(price.id, 'isActive', event.target.checked)}
                        />
                        <span>{draft.isActive !== false ? 'Active' : 'Off'}</span>
                      </label>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => savePrice(price)}
                        disabled={savingId === price.id}
                      >
                        {savingId === price.id ? 'SAVING...' : 'SAVE'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {status ? <p className="admin-prices-status" role="status">{status}</p> : null}
        {prices.length ? <p className="admin-prices-note">Current example: {formatAmount(prices.find((price) => price.id === 'song-request-live')?.amountCents, 'CAD')} for a live song request.</p> : null}
      </div>
    </section>
  );
}

export default AdminPricesPanel;
