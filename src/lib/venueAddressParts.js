// Splits a place result ("CN Tower, 301 Front St W, Toronto, ON M5V 2T6, Canada") into the parts the Event form needs.
export function venueAddressParts(item={}){
 const name=String(item.name||'').trim(),raw=String(item.address||'');let city=String(item.city||'').trim();
 const country=String(item.country||'').trim()||(/(^|,)\s*Canada\s*$/i.test(raw)?'Canada':'');
 const postal=String(item.postalCode||'').trim()||(raw.match(/[A-Z]\d[A-Z]\s?\d[A-Z]\d/i)||[''])[0];
 let parts=raw.split(',').map(part=>part.trim()).filter(Boolean).filter(part=>!country||part.toLowerCase()!==country.toLowerCase());
 if(parts[0]&&parts[0].toLowerCase()===name.toLowerCase())parts.shift();
 parts=parts.map(part=>postal?part.replace(postal,'').trim():part).filter(Boolean);
 const provinceHit=parts.find(part=>/^(ON|Ontario)$/i.test(part)),province=provinceHit?'ON':'';
 if(!city&&provinceHit){const at=parts.indexOf(provinceHit);if(at>0)city=parts[at-1];}
 const street=parts.filter(part=>part!==provinceHit&&part.toLowerCase()!==city.toLowerCase()).join(', ');
 return {name,street,city,province,postalCode:postal,country,cityProvince:[city,province].filter(Boolean).join(', '),postalCountry:[postal,country].filter(Boolean).join(', ')};
}
