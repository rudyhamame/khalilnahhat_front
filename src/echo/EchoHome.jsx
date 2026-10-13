import { useEffect, useState } from 'react';

export default function EchoHome({ lang }) {
  const { t } = lang;
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const id = setInterval(() => setI((n) => (n + 1) % t.heroLines.length), 3500);
    return () => clearInterval(id);
  }, [t.heroLines.length]);

  return (
    <>
      <section className="echo-hero">
        <p className="echo-kicker">{t.tagline}</p>
        <h1 key={i} aria-live="polite">{t.heroLines[i]}</h1>
        <div className="echo-ctas">
          <a className="echo-btn" href="/quote">{t.cta.book}</a>
          <a className="echo-btn echo-btn-alt" href="/quote">{t.cta.quote}</a>
          <a className="echo-btn echo-btn-ghost" href="#services">{t.cta.services}</a>
        </div>
      </section>
      <section className="echo-section echo-intro">
        <h2>{t.introTitle}</h2>
        <p>{t.intro}</p>
        <a className="echo-btn" href="/quote">{t.cta.requestDj}</a>
      </section>
      <section className="echo-section" id="services">
        <h2>{t.servicesTitle}</h2>
        <div className="echo-grid">
          {t.services.map(([title, text]) => (
            <article className="echo-card" key={title}><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>
      <section className="echo-section echo-final">
        <h2>{t.finalTitle}</h2>
        <p>{t.finalText}</p>
        <a className="echo-btn" href="/quote">{t.cta.quote}</a>
      </section>
    </>
  );
}
