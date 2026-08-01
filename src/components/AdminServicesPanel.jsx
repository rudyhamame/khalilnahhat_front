import { Send } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const cadFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
});

function buildDraft(request, currentDraft) {
  return {
    adminNote: currentDraft?.adminNote ?? request.adminNote ?? '',
    prices: Object.fromEntries(
      request.items.map((item) => [
        item.serviceId,
        currentDraft?.prices?.[item.serviceId] ?? (item.unitPrice ?? ''),
      ]),
    ),
  };
}

function AdminServicesPanel({ requests, onPublishQuote }) {
  const [drafts, setDrafts] = useState({});
  const [publishingId, setPublishingId] = useState('');
  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    setDrafts((current) =>
      Object.fromEntries(requests.map((request) => [request.id, buildDraft(request, current[request.id])])),
    );
  }, [requests]);

  const requestCountLabel = useMemo(
    () => `${requests.length} REQUEST${requests.length === 1 ? '' : 'S'}`,
    [requests.length],
  );

  const updatePrice = (requestId, serviceId, value) => {
    setDrafts((current) => ({
      ...current,
      [requestId]: {
        ...current[requestId],
        prices: {
          ...current[requestId]?.prices,
          [serviceId]: value,
        },
      },
    }));
  };

  const updateNote = (requestId, value) => {
    setDrafts((current) => ({
      ...current,
      [requestId]: {
        ...current[requestId],
        adminNote: value,
      },
    }));
  };

  const publishQuote = async (request) => {
    const draft = drafts[request.id] || buildDraft(request);
    const hasMissingPrice = request.items.some((item) => {
      const value = draft.prices?.[item.serviceId];
      return value === '' || !Number.isFinite(Number(value)) || Number(value) < 0;
    });

    if (hasMissingPrice) {
      setStatuses((current) => ({
        ...current,
        [request.id]: 'Enter a valid amount for every service before publishing.',
      }));
      return;
    }

    setPublishingId(request.id);
    setStatuses((current) => ({ ...current, [request.id]: '' }));

    try {
      const result = await onPublishQuote(request.id, {
        items: request.items.map((item) => ({
          serviceId: item.serviceId,
          unitPrice: Number(draft.prices[item.serviceId]),
        })),
        adminNote: draft.adminNote || '',
      });
      setStatuses((current) => ({
        ...current,
        [request.id]: result.notificationSent
          ? 'Quote published to the customer dashboard and emailed to the customer.'
          : 'Quote published, but the customer email could not be sent. Check the Brevo configuration.',
      }));
    } catch (error) {
      setStatuses((current) => ({
        ...current,
        [request.id]: error.message || 'The quote could not be published.',
      }));
    } finally {
      setPublishingId('');
    }
  };

  return (
    <section id="admin-services" className="admin-panel admin-services-panel">
      <div className="section-label admin-panel-head">
        <div className="admin-panel-head-copy">
          <p className="section-number">
            <span className="section-number-mark">KN//</span>
            <span className="section-number-value">03</span>
          </p>
          <h2>SERVICES</h2>
        </div>
        <span className="admin-services-count">{requestCountLabel}</span>
      </div>

      <div className="admin-services-workspace">
        {requests.length ? (
          requests.map((request) => {
            const draft = drafts[request.id] || buildDraft(request);
            const total = request.items.reduce(
              (sum, item) => sum + Number(draft.prices?.[item.serviceId] || 0) * item.quantity,
              0,
            );

            return (
              <article key={request.id} className="admin-service-request-card">
                <div className="admin-service-request-head">
                  <div>
                    <span className={`admin-service-request-status is-${request.status}`}>
                      {request.status}
                    </span>
                    <h3>{request.customerName}</h3>
                    <p>{`${request.customerUsername} / ${request.customerEmail}`}</p>
                  </div>
                  <div className="admin-service-request-reference">
                    <span>Request</span>
                    <strong>{request.id}</strong>
                  </div>
                </div>

                <div className="admin-service-quote-table">
                  <div className="admin-service-quote-row admin-service-quote-row-head">
                    <span>Service</span>
                    <span>Quantity</span>
                    <span>Amount per unit (CAD)</span>
                    <span>Line total</span>
                  </div>
                  {request.items.map((item) => {
                    const value = draft.prices?.[item.serviceId] ?? '';
                    const lineTotal = Number(value || 0) * item.quantity;

                    return (
                      <div key={item.serviceId} className="admin-service-quote-row">
                        <strong>{item.name}</strong>
                        <span>{item.quantity}</span>
                        <label>
                          <span className="sr-only">Amount per unit for {item.name}</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={value}
                            onChange={(event) => updatePrice(request.id, item.serviceId, event.target.value)}
                          />
                        </label>
                        <span>{cadFormatter.format(lineTotal)}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="admin-service-quote-footer">
                  <label>
                    <span>Message to customer</span>
                    <textarea
                      rows="2"
                      value={draft.adminNote || ''}
                      onChange={(event) => updateNote(request.id, event.target.value)}
                      placeholder="Optional details about this quote"
                    />
                  </label>
                  <div className="admin-service-quote-total">
                    <span>Quote total</span>
                    <strong>{cadFormatter.format(total)}</strong>
                  </div>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => publishQuote(request)}
                    disabled={publishingId === request.id}
                  >
                    <Send size={15} />
                    {publishingId === request.id
                      ? 'Publishing...'
                      : request.status === 'quoted'
                        ? 'Update Published Quote'
                        : 'Publish to Customer'}
                  </button>
                </div>
                {statuses[request.id] ? (
                  <p className="admin-service-request-feedback" role="status">
                    {statuses[request.id]}
                  </p>
                ) : null}
              </article>
            );
          })
        ) : (
          <div className="admin-services-empty">
            <strong>No service requests yet</strong>
            <p>Signed-in customer requests from the Services page will appear here.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default AdminServicesPanel;
