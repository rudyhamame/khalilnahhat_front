const KEY='echo-recent-event-addresses';
export function recentEventAddresses(){
  try{
    const entries=JSON.parse(localStorage.getItem(KEY)||'[]');
    return Array.isArray(entries)?entries.filter(item=>item&&typeof item.venueAddress==='string'&&typeof item.city==='string'&&typeof item.postalCode==='string').slice(0,5):[];
  }catch{return [];}
}
export function rememberEventAddress(address){
  if(!address.venueAddress.trim())return;
  const entry=Object.fromEntries(['venueAddress','city','postalCode'].map(key=>[key,address[key].trim()]));
  try{localStorage.setItem(KEY,JSON.stringify([entry,...recentEventAddresses().filter(item=>item.venueAddress.toLowerCase()!==entry.venueAddress.toLowerCase())].slice(0,5)));}catch{/* Booking still works without browser storage. */}
}
export function formatCanadianPostalCode(value){
  const compact=value.toUpperCase().replace(/\s/g,'');
  return /^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(compact)?`${compact.slice(0,3)} ${compact.slice(3)}`:value;
}
