import { ArrowRight } from 'lucide-react';
import './heroRingButton.css';

// The hero's "Skip to content" pill.
export default function HeroRingButton({ label, onClick }) {
  return (
    <div className="hero-ring-cta hero-ring-split">
      <button type="button" onClick={onClick}>
        <span>{label}</span>
        <ArrowRight className="hero-ring-arrow" size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
