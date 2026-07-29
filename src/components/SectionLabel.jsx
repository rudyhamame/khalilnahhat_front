function SectionLabel({ number, title, kicker }) {
  return (
    <div className="section-label">
      {kicker ? <p className="section-kicker">{kicker}</p> : null}
      <p className="section-number">
        <span className="section-number-mark">KN//</span>
        <span className="section-number-value">{number}</span>
      </p>
      <h2>{title}</h2>
    </div>
  );
}

export default SectionLabel;
