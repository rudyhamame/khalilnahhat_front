// Funnel analytics. No third-party SDK: every event is announced as a window "echo:analytics" CustomEvent and, when they exist,
// pushed to window.dataLayer / window.gtag (so Google Tag Manager or gtag.js, if you add one later, receives them). In development
// the events are also logged to the console. A *Once event fires one time per page load.
const sent=new Set();
export function track(name,props={}){
  const detail={name,props,at:Date.now()};
  try{window.dispatchEvent(new CustomEvent('echo:analytics',{detail}));}catch{/* analytics must never break the page */}
  try{if(Array.isArray(window.dataLayer))window.dataLayer.push({event:name,...props});if(typeof window.gtag==='function')window.gtag('event',name,props);}catch{/* same */}
  try{if(import.meta.env?.DEV)console.debug('[analytics]',name,props);}catch{/* same */}
  return detail;
}
export function trackOnce(name,props={}){if(sent.has(name))return null;sent.add(name);return track(name,props);}
export const resetAnalyticsForTests=()=>sent.clear();
// The funnel step a visitor reached, so a leave without a quote reports where they stopped.
let lastStep='';
export const setFunnelStep=step=>{lastStep=step||lastStep;};
export function installDropOffTracking(target=globalThis.window){
  if(!target?.addEventListener)return()=>{};
  const leave=()=>{if(sent.has('booking_started')&&!sent.has('quote_submitted'))trackOnce('booking_dropoff',{step:lastStep||'booking_started'});};
  target.addEventListener('pagehide',leave);return()=>target.removeEventListener('pagehide',leave);
}
