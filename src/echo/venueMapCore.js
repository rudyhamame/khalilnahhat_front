export const GTA_CAMERA = {center:[-79.3832,43.72],zoom:9.5,bearing:0,pitch:0};
export const VENUE_TYPES = {restaurant:'Restaurant',banquet_hall:'Banquet hall',outdoor:'Outdoor venue',other:'Other venue'};
export function venueTypeLabel(key,ar=false){return ar?({restaurant:'مطعم',banquet_hall:'قاعة حفلات',outdoor:'مكان خارجي',other:'مكان آخر'})[key]:VENUE_TYPES[key];}
export function venueKey(v){return `${v.source}:${v.sourceId||[v.longitude,v.latitude].join(',')}`;}
export function venueFeatures(items){return {type:'FeatureCollection',features:items.map(v=>({type:'Feature',id:venueKey(v),geometry:{type:'Point',coordinates:[v.longitude,v.latitude]},properties:{id:venueKey(v),type:v.venueType,name:v.name}}))};}
export function configuredStyle(style,{key='',tileJSON='',glyphs='',provider=key?'maptiler':'openfreemap'}={}){
 const value=JSON.parse(JSON.stringify(style).replaceAll('{key}',encodeURIComponent(key)));
 if(provider==='maptiler'){value.sources.basemap={...value.sources.basemap,url:'https://api.maptiler.com/tiles/v3/tiles.json?key='+encodeURIComponent(key),attribution:'<a href="https://www.maptiler.com/copyright/">© MapTiler</a> <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>'};value.glyphs='https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key='+encodeURIComponent(key);}
 if(tileJSON)value.sources.basemap={...value.sources.basemap,url:tileJSON};
 if(glyphs)value.glyphs=glyphs;
 return value;
}
