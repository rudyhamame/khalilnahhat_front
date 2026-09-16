function SignalIndicator({ label = 'SIGNAL STATUS' }) {
  return (
    <div className="signal-indicator" aria-label={label}>
      <span className="signal-dot" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export default SignalIndicator;
