import { Check, Minus, Plus, X } from 'lucide-react';

function ServiceCard({ service, isSelected, selectedQuantity, onAdd, onRemove, onQuantityChange }) {
  const minimumQuantity = service.minimumQuantity || 1;

  return (
    <article className={`service-card${isSelected ? ' is-selected' : ''}`}>
      <div className="service-card-status" aria-hidden="true">
        {isSelected ? <Check size={15} /> : <Plus size={15} />}
      </div>
      <div className="service-card-copy">
        <p className="detail-label">{service.category.replace('-', ' ')}</p>
        <h3>{service.name}</h3>
        <p>{service.description}</p>
        {service.minimumQuantity ? (
          <span className="service-card-requirement">Configured in groups of {service.minimumQuantity} or more</span>
        ) : null}
      </div>

      {isSelected ? (
        <div className="service-card-controls">
          <div className="service-quantity-control" aria-label={`${service.name} quantity`}>
            <button
              type="button"
              onClick={() => onQuantityChange(service, selectedQuantity - 1)}
              disabled={selectedQuantity <= minimumQuantity}
              aria-label={`Decrease ${service.name} quantity`}
            >
              <Minus size={15} />
            </button>
            <output aria-live="polite">{selectedQuantity}</output>
            <button
              type="button"
              onClick={() => onQuantityChange(service, selectedQuantity + 1)}
              aria-label={`Increase ${service.name} quantity`}
            >
              <Plus size={15} />
            </button>
          </div>
          <button type="button" className="service-remove-button" onClick={() => onRemove(service.id)}>
            <X size={14} />
            Remove
          </button>
        </div>
      ) : (
        <button type="button" className="service-add-button" onClick={() => onAdd(service)}>
          <Plus size={16} />
          Add to event
        </button>
      )}
    </article>
  );
}

export default ServiceCard;
