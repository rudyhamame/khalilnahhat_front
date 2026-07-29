function ArchiveGrid({ items, activeFilter, onFilterChange, onSelectItem, filters }) {
  return (
    <div className="archive-block">
      <div className="filter-row" role="tablist" aria-label="Archive categories">
        {filters.map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={isActive ? 'is-active' : ''}
              onClick={() => onFilterChange(filter)}
            >
              {filter}
            </button>
          );
        })}
      </div>

      <div className="archive-grid">
        {items.map((item) => (
          <article key={item.id} className="archive-item">
            <button type="button" className="archive-button" onClick={() => onSelectItem(item)}>
              <img loading="lazy" src={item.image} alt={item.alt} />
              <span className="archive-overlay">
                <span className="detail-label">{item.category}</span>
                <strong>{item.title}</strong>
                <span>
                  {item.location} / {item.date}
                </span>
              </span>
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

export default ArchiveGrid;
