// A Google Maps link for a place: exact coordinates when the booking has them, otherwise the written address.
export const mapsLink=(...parts)=>{
 const query=parts.flat().filter(Boolean).join(', ').trim();
 return query?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`:'';
};
