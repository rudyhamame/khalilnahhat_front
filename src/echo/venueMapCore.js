export const GTA_CAMERA = {center:[-79.3832,43.72],zoom:9.5,bearing:0,pitch:0};
export const VENUE_TYPES = {restaurant:'Restaurant',banquet_hall:'Banquet hall',outdoor:'Outdoor venue',other:'Other venue'};
export function venueTypeLabel(key,ar=false){return ar?({restaurant:'مطعم',banquet_hall:'قاعة حفلات',outdoor:'مكان خارجي',other:'مكان آخر'})[key]:VENUE_TYPES[key];}
export function unknown(value,unit=''){return value === null || value === undefined || value === '' ? 'Unknown' : `${value}${unit}`;}
export function venueKey(v){return v.saved?v.id:`external:${v.sourceId}`;}
export function venueFeatures(items){return {type:'FeatureCollection',features:items.map(v=>({type:'Feature',id:venueKey(v),geometry:{type:'Point',coordinates:[v.longitude,v.latitude]},properties:{id:venueKey(v),type:v.venueType,saved:!!v.saved,name:v.name}}))};}
export function editableVenue(v){return {name:v.name||'',address:v.address||'',city:v.city||'',postalCode:v.postalCode||'',country:v.country||'Canada',latitude:v.latitude,longitude:v.longitude,venueType:v.venueType||'other',source:v.source||'manual',sourceId:v.sourceId||'',sourceAttribution:v.sourceAttribution||'',verificationStatus:v.verificationStatus||'unverified',lastVerifiedAt:v.lastVerifiedAt||null,rooms:(v.rooms||[]).map(r=>({...r})),eventLinks:(v.eventLinks||[]).map(l=>({kind:l.kind,id:l.id})),...(v.version?{version:v.version}:{})};}
export function configuredStyle(style,{key='',tileJSON='',glyphs=''}={}){
 const value=JSON.parse(JSON.stringify(style).replaceAll('{key}',encodeURIComponent(key)));
 if(tileJSON)value.sources.basemap={...value.sources.basemap,url:tileJSON};
 if(glyphs)value.glyphs=glyphs;
 return value;
}
export function filterExternal(items,type,capacity){return capacity==='known'?[]:items.filter(v=>!type||v.venueType===type);}
export function emptyRoom(){return {name:'',seatedCapacity:null,standingCapacity:null,layoutNotes:'',capacitySource:'',areaSqM:null,areaMethod:'',areaSource:''};}
