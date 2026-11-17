const provinces={alberta:'AB','british columbia':'BC',manitoba:'MB','new brunswick':'NB','newfoundland and labrador':'NL','northwest territories':'NT','nova scotia':'NS',nunavut:'NU',ontario:'ON','prince edward island':'PE',quebec:'QC','québec':'QC',saskatchewan:'SK',yukon:'YT'};
export const cleanAddressText=value=>String(value||'').replace(/[\u00a0\u202f\t]+/gu,' ').replace(/ {2,}/gu,' ').replace(/\s*,\s*/gu,', ').replace(/\b([ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z])\s*([0-9][ABCEGHJ-NPRSTV-Z][0-9])\b/giu,(_,first,last)=>`${first.toUpperCase()} ${last.toUpperCase()}`).trim();
const key=value=>cleanAddressText(value).toLocaleLowerCase().replace(/[’‘]/gu,"'");
const postal=/\b[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z] \d[ABCEGHJ-NPRSTV-Z]\d\b/iu;
const region=value=>{const clean=cleanAddressText(value);return provinces[key(clean)]||(/^(?:AB|BC|MB|NB|NL|NT|NS|NU|ON|PE|QC|SK|YT)$/iu.test(clean)?clean.toUpperCase():'');};

// Display only supplied components. Never geocode, translate a street name or invent a postal code.
export function formatVenueAddress(place={}){
 const parts=cleanAddressText(place.address).split(/,\s*|\n+/u).map(part=>part.trim()).filter(Boolean);
 if(parts.length&&key(parts[0])===key(place.name))parts.shift();
 let city=cleanAddressText(place.city),province=region(place.province||place.state),code=cleanAddressText(place.postalCode||place.postal),country=cleanAddressText(place.countryName||place.country);
 if(/^(?:ca|canada)$/iu.test(country))country='Canada';
 if(parts.length&&(/^(?:canada|ca)$/iu.test(parts.at(-1))||country&&key(parts.at(-1))===key(country)))country=parts.pop()==='CA'?'Canada':cleanAddressText(country||'Canada');
 const tail=parts.at(-1)||'',foundPostal=tail.match(postal)?.[0]||'';
 const foundRegion=region(tail.replace(postal,'').trim());
 if(foundRegion){province=province||foundRegion;code=code||foundPostal;parts.pop();}
 else if(foundPostal&&key(tail)===key(foundPostal)){code=code||foundPostal;parts.pop();}
 if(city){const index=parts.findIndex(part=>key(part)===key(city));if(index>=0)parts.splice(index,1);}
 else if(province&&parts.length>1)city=parts.pop();
 const locality=[city,province,code].filter(Boolean).join(' ');
 return [parts.join(', '),locality,country].filter(Boolean).join('\n');
}
