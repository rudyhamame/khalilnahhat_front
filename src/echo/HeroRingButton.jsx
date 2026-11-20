import { ArrowRight } from 'lucide-react';
import './heroRingButton.css';

// A split pill: one half stops this greeting page from opening again, the other goes to the content.
export default function HeroRingButton({ label, hideLabel, onClick, onHide, hidden = false }) {
  return (
    <div className="hero-ring-cta hero-ring-split">
      {onHide&&<button type="button" onClick={onHide} aria-pressed={hidden}>{hideLabel}</button>}
      <button type="button" onClick={onClick}>
        <span>{label}</span>
        <ArrowRight className="hero-ring-arrow" size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
