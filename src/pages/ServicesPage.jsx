import { ArrowDown, ArrowRight, Layers3, Menu, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import EventPlanPanel from '../components/EventPlanPanel';
import ServiceCard from '../components/ServiceCard';
import ServiceCategoryTabs from '../components/ServiceCategoryTabs';
import { navigationItems, siteData } from '../data/siteData';
import { serviceCategories, services } from '../data/services';
import { useEventSelection } from '../hooks/useEventSelection';

const servicesNavigationItems = navigationItems.map((item) => ({
  ...item,
  href: item.id === 'services' ? '/services' : `/#${item.id}`,
}));

const AUTH_RETURN_STORAGE_KEY = 'khalil-auth-return';

function ServicesPage({ user, isSessionReady, onCreateServiceRequest }) {
  const [activeCategory, setActiveCategory] = useState(serviceCategories[0].id);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');
  const isSignedIn = Boolean(user);
  const {
    selectedItems,
    totalSelectedUnits,
    addItem,
    removeItem,
    updateQuantity,
    clearSelection,
    isSelected,
  } = useEventSelection();

  const visibleServices = useMemo(
    () => services.filter((service) => service.category === activeCategory),
    [activeCategory],
  );

  useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector('meta[name="description"]');
    const previousDescription = description?.getAttribute('content') || '';

    document.documentElement.classList.add('services-route');
    document.title = 'DJ, Sound, Lighting & Event Services | Khalil Nahhat';
    description?.setAttribute(
      'content',
      'Explore professional DJ, sound system, lighting, video, and special-effects services for events in Toronto and surrounding areas.',
    );

    return () => {
      document.documentElement.classList.remove('services-route');
      document.title = previousTitle;
      description?.setAttribute('content', previousDescription);
    };
  }, []);

  const scrollToConfigurator = () => {
    document.getElementById('services-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToPlan = () => {
    document.getElementById('event-plan')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmitRequest = async () => {
    if (!selectedItems.length || !isSessionReady) {
      return;
    }

    if (!user) {
      window.localStorage.setItem(AUTH_RETURN_STORAGE_KEY, '/services');
      window.location.href = '/#login';
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('');

    try {
      await onCreateServiceRequest({
        items: selectedItems.map((item) => ({
          serviceId: item.id,
          name: item.name,
          category: item.category,
          quantity: item.quantity,
        })),
      });
      clearSelection();
      setSubmitStatus('Request submitted. It is now pending in your Requested Services dashboard.');
    } catch (error) {
      if (error.status === 401) {
        window.localStorage.setItem(AUTH_RETURN_STORAGE_KEY, '/services');
        window.location.href = '/#login';
        return;
      }
      setSubmitStatus(error.message || 'The service request could not be submitted.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="services-page">
      <header className="services-header">
        <a className="brand-lockup" href="/#signal">
          <span className="brand-mark" aria-label="KN slash slash">KN //</span>
          <span className="brand-name" aria-label="Khalil Nahhat">
            <span className="brand-name-first">KHALIL</span>
            <span className="brand-name-last">NAHHAT</span>
          </span>
        </a>
        <nav className="desktop-nav" aria-label="Primary">
          {servicesNavigationItems.map((item) => (
            <a key={item.id} className={item.id === 'services' ? 'is-active' : ''} href={item.href}>
              {`KN//${item.sectionNumber} ${item.label.toUpperCase()}`}
            </a>
          ))}
          <a href={isSignedIn ? '/#dashboard' : '/#login'}>
            {isSignedIn ? 'KN//DASHBOARD' : 'KN//LOGIN'}
          </a>
        </nav>
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={isMenuOpen}
          aria-controls="services-mobile-menu"
          aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <div id="services-mobile-menu" className={`services-mobile-menu${isMenuOpen ? ' is-open' : ''}`}>
          {servicesNavigationItems.map((item) => (
            <a key={item.id} href={item.href} onClick={() => setIsMenuOpen(false)}>
              <span>{`KN//${item.sectionNumber}`}</span>
              {item.label}
            </a>
          ))}
          <a href={isSignedIn ? '/#dashboard' : '/#login'} onClick={() => setIsMenuOpen(false)}>
            <span>KN//AUTH</span>
            {isSignedIn ? 'Dashboard' : 'Login'}
          </a>
        </div>
      </header>

      <section className="services-hero">
        <div className="services-hero-signal" aria-hidden="true">
          {Array.from({ length: 28 }, (_, index) => <span key={index} />)}
        </div>
        <div className="services-hero-copy">
          <p className="section-kicker">
            <span className="section-number-mark">KN//</span>
            <span className="section-number-value">04</span>
            {' - SERVICES'}
          </p>
          <h1>Everything your event needs in one professional setup.</h1>
          <p>
            From professional DJ entertainment and powerful sound systems to intelligent lighting,
            video displays, and immersive special effects, Khalil Nahhat provides customizable
            event-production services for Toronto and surrounding areas.
          </p>
          <div className="services-hero-actions">
            <button type="button" className="primary-button" onClick={scrollToConfigurator}>
              Build your event
              <ArrowDown size={17} />
            </button>
            <button type="button" className="secondary-button" onClick={scrollToPlan}>
              Request a quote
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
        <div className="services-hero-index" aria-hidden="true">
          <Layers3 size={24} />
          <span>DJ / SOUND / LIGHT / VIDEO / FX</span>
        </div>
      </section>

      <section id="services-grid" className="services-configurator" aria-labelledby="services-heading">
        <div className="services-configurator-head">
          <div>
            <p className="section-kicker">BUILD YOUR EVENT</p>
            <h2 id="services-heading">Choose the right configuration.</h2>
          </div>
          <p>Select individual services and adjust quantities to match your room, audience, and event format.</p>
        </div>

        <ServiceCategoryTabs
          categories={serviceCategories}
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
        />

        <div className="services-workspace">
          <div className="services-catalog" role="tabpanel" aria-label={`${activeCategory} services`}>
            {visibleServices.map((service, index) => {
              const selectedItem = selectedItems.find((item) => item.id === service.id);

              return (
                <ServiceCard
                  key={service.id}
                  service={service}
                  index={index}
                  isSelected={isSelected(service.id)}
                  selectedQuantity={selectedItem?.quantity || service.defaultQuantity || 1}
                  onAdd={addItem}
                  onRemove={removeItem}
                  onQuantityChange={updateQuantity}
                />
              );
            })}
          </div>

          <EventPlanPanel
            selectedItems={selectedItems}
            totalSelectedUnits={totalSelectedUnits}
            onRemove={removeItem}
            onQuantityChange={updateQuantity}
            onClear={clearSelection}
            onSubmit={handleSubmitRequest}
            isSignedIn={isSignedIn}
            isSubmitting={isSubmitting || !isSessionReady}
            submitStatus={submitStatus}
          />
        </div>
      </section>

      <button type="button" className="services-mobile-summary" onClick={scrollToPlan}>
        <span>
          <small>Event plan</small>
          {`${selectedItems.length} service${selectedItems.length === 1 ? '' : 's'} / ${totalSelectedUnits} units`}
        </span>
        <ArrowRight size={18} />
      </button>

      <footer className="services-footer">
        <span className="brand-mark">KN //</span>
        <p>Professional event production / Toronto and surrounding areas</p>
        <a href={`mailto:${siteData.footerBookingEmail}`}>{siteData.footerBookingEmail}</a>
      </footer>
    </main>
  );
}

export default ServicesPage;
