import {useState} from 'react';
import {ArrowLeft,Settings} from 'lucide-react';
import PricingPolicies from './PricingPolicies';
import PricingSettings from './PricingSettings';
import './pricingEngine.css';

// Pricing tab: the policies are the main part; the lists they draw on (fee categories, pricing factors, modes) live in Pricing settings,
// opened with the settings button at the right of the header. The policies view renders its toolbar into the header's `slot`.
export default function AdminPricingEngine({token}) {
  const [settings,setSettings]=useState(false),[slot,setSlot]=useState(null);
  return <div className="pe" aria-label="Pricing workspace">
    <header className="pe-header">
      <div ref={setSlot} className="pe-header-slot">{settings&&<div className="pp-head"><div><h2>Pricing settings</h2><p>The lists prices draw on: fee categories, pricing modes and pricing factors.</p></div></div>}</div>
      <button type="button" className="pe-settings-btn" aria-pressed={settings} aria-label={settings?'Back to prices':'Pricing settings'} title={settings?'Back to prices':'Pricing settings'} onClick={()=>setSettings(value=>!value)}>{settings?<ArrowLeft size={18} aria-hidden="true"/>:<Settings size={18} aria-hidden="true"/>}<span>{settings?'Back to prices':'Settings'}</span></button>
    </header>
    <div className="pe-panel">{settings?<PricingSettings token={token}/>:<PricingPolicies token={token} headSlot={slot}/>}</div>
  </div>;
}
