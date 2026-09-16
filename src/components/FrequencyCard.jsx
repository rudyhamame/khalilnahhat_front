function FrequencyCard({ frequency }) {
  return (
    <article className="frequency-card">
      <div className="frequency-card-header">
        <span>{frequency.number}</span>
        <p>{frequency.actionLabel}</p>
      </div>
      <h3>{frequency.name}</h3>
      <p>{frequency.description}</p>
      <dl>
        <div>
          <dt>Energy</dt>
          <dd>{frequency.energy}</dd>
        </div>
        <div>
          <dt>Set span</dt>
          <dd>{frequency.duration}</dd>
        </div>
        <div>
          <dt>Count</dt>
          <dd>{frequency.mixCount}</dd>
        </div>
      </dl>
    </article>
  );
}

export default FrequencyCard;
