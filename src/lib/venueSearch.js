import {apiRequest} from './api';
import {venueArea} from './addressSearch';

export const ONTARIO_VENUE_BOUNDS='-95.2,41.6,-74.3,56.9';
export const VENUE_SEARCH_BOUNDS={ontario:ONTARIO_VENUE_BOUNDS,outside:ONTARIO_VENUE_BOUNDS,gta:'-80.3,43.2,-78.3,44.6'};
const inOntario=venue=>/canada/i.test(venue.country||'')&&/(^|[\s,])(ON|Ontario)([\s,]|$)/.test(venue.address||'');
export async function findVenues(query,{token,signal,scope='ontario',type=''}={}){
 const result=await apiRequest('/venue-map/search?'+new URLSearchParams({q:query.trim(),bounds:VENUE_SEARCH_BOUNDS[scope]||ONTARIO_VENUE_BOUNDS,...(type?{type}:{})}),{token,signal});
 return (result.items||[]).filter(inOntario).filter(venue=>scope==='outside'?venueArea(venue)==='outside_gta':scope==='gta'?venueArea(venue)==='gta':true);
}
