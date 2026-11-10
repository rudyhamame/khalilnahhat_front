// Level meters are read in decibels, not raw amplitude: -60 dB (silent) to 0 dB (full scale) mapped to 0..1.
export const toDb=linear=>linear>0?20*Math.log10(linear):-Infinity;
export const meterPosition=(linear,floor=-60)=>{const db=toDb(linear);return db===-Infinity?0:Math.max(0,Math.min(1,(db-floor)/-floor));};
export const formatDb=linear=>{const db=toDb(linear);return db===-Infinity||db<-60?'-∞':`${db>0?'+':''}${db.toFixed(1)}`;};
// Segment colours: green up to -12 dB, amber to -3 dB, red above.
export const segmentTone=(position,floor=-60)=>{const db=floor+position*-floor;return db>=-3?'hot':db>=-12?'warm':'ok';};
