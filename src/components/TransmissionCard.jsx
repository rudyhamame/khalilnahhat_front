function TransmissionCard({ transmission, isSelected, onSelect }) {
  return (
    <article className={`transmission-card ${isSelected ? 'is-selected' : ''}`}>
      <button type="button" className="transmission-card-button" onClick={() => onSelect(transmission)}>
        <img loading="lazy" src={transmission.image} alt={`${transmission.venue} transmission placeholder`} />
        <div className="transmission-card-content">
          <p className="detail-label">{transmission.id}</p>
          <h3>{transmission.venue}</h3>
          <p>
            {transmission.city}, {transmission.country}
          </p>
          <p>
            {transmission.date} / {transmission.eventType}
          </p>
        </div>
      </button>
    </article>
  );
}

export default TransmissionCard;
