import { ArrowUpRight, Minus, Plus, Trash2 } from 'lucide-react';

function EventPlanPanel({
  selectedItems,
  totalSelectedUnits,
  onRemove,
  onQuantityChange,
  onClear,
  onSubmit,
  isSignedIn,
  isSubmitting,
  submitStatus,
}) {
  return (
    <aside id="event-plan" className="event-plan-panel" aria-labelledby="event-plan-title">
      <div className="event-plan-head">
        <div>
          <p className="detail-label">EVENT CONFIGURATION</p>
          <h2 id="event-plan-title">Your Event Plan</h2>
        </div>
        {selectedItems.length ? (
          <button type="button" className="event-plan-clear" onClick={onClear}>
            Clear all
          </button>
        ) : null}
      </div>

      {selectedItems.length ? (
        <div className="event-plan-list">
          {selectedItems.map((item) => {
            const minimumQuantity = item.minimumQuantity || 1;

            return (
              <div key={item.id} className="event-plan-item">
                <div className="event-plan-item-copy">
                  <strong>{item.name}</strong>
                  <span>{`Quantity ${item.quantity}`}</span>
                </div>
                <div className="event-plan-item-actions">
                  <button
                    type="button"
                    disabled={item.quantity <= minimumQuantity}
                    onClick={() => onQuantityChange(item, item.quantity - 1)}
                    aria-label={`Decrease ${item.name} quantity`}
                  >
                    <Minus size={14} />
                  </button>
                  <output aria-label={`${item.name} quantity`}>{item.quantity}</output>
                  <button
                    type="button"
                    onClick={() => onQuantityChange(item, item.quantity + 1)}
                    aria-label={`Increase ${item.name} quantity`}
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    type="button"
                    className="event-plan-remove"
                    onClick={() => onRemove(item.id)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="event-plan-empty">
          <span>00</span>
          <h3>Your event setup is empty</h3>
          <p>Add DJ, sound, lighting, video, or special-effects services to create your event package.</p>
        </div>
      )}

      <div className="event-plan-footer" aria-live="polite">
        <div>
          <span>Selected services</span>
          <strong>{selectedItems.length}</strong>
        </div>
        <div>
          <span>Total units</span>
          <strong>{totalSelectedUnits}</strong>
        </div>
      </div>

      <button
        type="button"
        className={`primary-button event-plan-submit${selectedItems.length ? '' : ' is-disabled'}`}
        disabled={!selectedItems.length || isSubmitting}
        onClick={onSubmit}
      >
        {isSubmitting ? 'Submitting request...' : isSignedIn ? 'Request a quote' : 'Sign in to request'}
        <ArrowUpRight size={17} />
      </button>
      {submitStatus ? <p className="event-plan-submit-status" role="status">{submitStatus}</p> : null}
      <p className="event-plan-disclaimer">No booking is confirmed until the request is reviewed and approved.</p>
    </aside>
  );
}

export default EventPlanPanel;
