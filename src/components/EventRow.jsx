function EventRow({ event }) {
  return (
    <article className="event-row">
      <p className="event-date">{event.date}</p>
      <div className="event-details">
        <h3>{event.venue}</h3>
        <p>{event.location}</p>
      </div>
      <p className="event-type">{event.type}</p>
      <div className="event-action">
        <span className={`status-pill status-${event.status.toLowerCase().replace(/\s+/g, '-')}`}>
          {event.status}
        </span>
        <a href={event.actionHref}>{event.actionLabel}</a>
      </div>
    </article>
  );
}

export default EventRow;
