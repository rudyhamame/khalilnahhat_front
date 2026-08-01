function ServiceCategoryTabs({ categories, activeCategory, onSelect }) {
  return (
    <div className="service-category-tabs" role="tablist" aria-label="Service categories">
      {categories.map((category, index) => (
        <button
          key={category.id}
          type="button"
          role="tab"
          aria-selected={activeCategory === category.id}
          className={activeCategory === category.id ? 'is-active' : ''}
          onClick={() => onSelect(category.id)}
        >
          <span>{String(index + 1).padStart(2, '0')}</span>
          {category.label}
        </button>
      ))}
    </div>
  );
}

export default ServiceCategoryTabs;
