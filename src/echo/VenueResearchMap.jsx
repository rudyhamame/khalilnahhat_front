import {useEffect,useRef,useState} from 'react';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
export default function VenueResearchMap({record,configuration,api,onTrace}){
 const element=useRef(null),callbacks=useRef({api,onTrace}),[error,setError]=useState('');callbacks.current={api,onTrace};
 useEffect(()=>{
  let disposed=false,map=null;const urls=new Set(),controller=new AbortController();
  const point=record.report.venue.coordinates;if(!point)return undefined;
  import('leaflet').then(async module=>{
   const L=module.default||module;window.L=L;await import('@geoman-io/leaflet-geoman-free');if(disposed)return;map=L.map(element.current,{scrollWheelZoom:false}).setView([point.latitude,point.longitude],18);
   const satellite=configuration?.satellite?.configured;
   if(satellite){const Layer=L.GridLayer.extend({createTile(coords,done){const image=document.createElement('img');image.alt='';callbacks.current.api.tile(coords.z,coords.x,coords.y,controller.signal).then(blob=>{if(disposed||image.dataset.cancelled)return;const url=URL.createObjectURL(blob);urls.add(url);image.onload=()=>done(null,image);image.onerror=()=>{setError('A satellite tile could not be displayed.');done(new Error('Tile failed'),image);};image.src=url;}).catch(problem=>{if(!disposed){setError(problem.message);done(problem,image);}});return image;}});new Layer({attribution:configuration.satellite.attribution,minZoom:14,maxZoom:20}).on('tileunload',event=>{event.tile.dataset.cancelled='true';const url=event.tile.src;if(urls.delete(url))URL.revokeObjectURL(url);}).addTo(map);}
   else L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',maxZoom:19}).addTo(map);
   const geometry=record.manual?.geometryScope==='building_footprint'?record.manual.geometry:record.report.building?.geometry;
   if(geometry){const layer=L.geoJSON(geometry,{style:{color:'#ddb871',weight:2,fillOpacity:.12}}).addTo(map);map.fitBounds(layer.getBounds(),{maxZoom:19,padding:[20,20]});}
   map.pm.addControls({position:'topleft',drawMarker:false,drawCircleMarker:false,drawPolyline:false,drawRectangle:false,drawCircle:false,drawText:false,drawPolygon:true,editMode:false,dragMode:false,cutPolygon:false,removalMode:false,rotateMode:false});
   map.on('pm:create',event=>{const geometry=event.layer.toGeoJSON().geometry;if(geometry.type==='Polygon')callbacks.current.onTrace?.(geometry);});
  }).catch(problem=>{console.warn('Venue map unavailable:',problem.message);if(!disposed)setError('The interactive map could not load. Research measurements remain available.');});
  return()=>{disposed=true;controller.abort();map?.remove();urls.forEach(url=>URL.revokeObjectURL(url));};
 },[record,configuration]);
 if(!record.report.venue.coordinates)return <p>Independently licensed coordinates are unavailable. No building boundary was assigned.{record.report.venue.identitySource?.placeId&&<a href={'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(record.report.venue.name+' '+record.report.venue.address)+'&query_place_id='+encodeURIComponent(record.report.venue.identitySource.placeId)} target="_blank" rel="noreferrer">View this location on Google Maps</a>}</p>;
 return <div className="vi-map-wrap"><div ref={element} className="vi-map" aria-label="Venue building map and manual building polygon tracing tool"/>{!configuration?.satellite?.configured&&<small>Satellite imagery needs a licensed tile provider in server settings. This is an OpenStreetMap view.</small>}<small>Use the polygon tool to trace the exterior building only. A trace is an unverified building footprint and will never set indoor room size.</small>{error&&<p role="alert">{error}</p>}</div>;
}
