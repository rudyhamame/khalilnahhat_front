import { ArrowRight } from 'lucide-react';
import './heroRingButton.css';

export default function HeroRingButton({ label, onClick }) {
  return (
    <button type="button" className="hero-ring-cta" onClick={onClick}>
      <span>{label}</span>
      <ArrowRight className="hero-ring-arrow" size={18} aria-hidden="true" />
    </button>
  );
}
