import {formatPostal} from './addressSearch';

// Address search for a place picker, the same free OpenStreetMap-based search the Booking page uses (Photon, tuned to Toronto and Ontario,
// house numbers included), but keeping each place's map point. Typed text is sent to photon.komoot.io; no key, no cost.
const ENDPOINT='https://photon.komoot.io/api/';
const ONTARIO_BBOX='-95.2,41.6,-74.3,56.9';
export async function searchPlaces(query,signal){
  const response=await fetch(`${ENDPOINT}?q=${encodeURIComponent(query)}&limit=8&lang=en&lat=43.65&lon=-79.38&bbox=${ONTARIO_BBOX}`,{signal});
  if(!response.ok)throw new Error('The map search is unavailable right now.');
  const seen=new Set();
  return ((await response.json()).features||[]).map(({properties:p,geometry})=>{
    const [longitude,latitude]=geometry?.coordinates||[];
    const street=[p.housenumber,p.street].filter(Boolean).join(' ')||p.name||'';
    const label=[street,p.city||p.town||p.village||p.county,p.state,formatPostal(p.postcode),p.country||'Canada'].filter(Boolean).filter((part,index,all)=>all.indexOf(part)===index).join(', ');
    return {label,latitude,longitude,country:p.countrycode};
  }).filter(place=>place.country==='CA'&&place.label&&Number.isFinite(place.latitude)&&Number.isFinite(place.longitude)&&!seen.has(place.label)&&seen.add(place.label)).slice(0,6);
}
