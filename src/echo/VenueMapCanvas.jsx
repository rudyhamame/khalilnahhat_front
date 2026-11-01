import {LocateFixed,LoaderCircle} from 'lucide-react';
import {useEffect,useRef,useState} from 'react';
import {GTA_CAMERA,venueFeatures,venueKey,configuredStyle} from './venueMapCore';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
const EMPTY={type:'FeatureCollection',features:[]};
const cameraKey='echo-venue-map-camera-v1';
const provider=import.meta.env.VITE_VENUE_TILE_PROVIDER||(import.meta.env.VITE_VENUE_TILE_KEY?'maptiler':'openfreemap');
const config={provider,key:import.meta.env.VITE_VENUE_TILE_KEY||'',style:import.meta.env.VITE_VENUE_STYLE_URL||'/maps/echo-dark.json',tileJSON:import.meta.env.VITE_VENUE_TILEJSON_URL||'',glyphs:import.meta.env.VITE_VENUE_GLYPHS_URL||''};
export default function VenueMapCanvas({items,searchResults,selected,draft,picking,onPick,onBounds,onSelect,onCenter}){
 const el=useRef(null),mapRef=useRef(null),marker=useRef(null),callbacks=useRef({}),[ready,setReady]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0),[locating,setLocating]=useState(false);
 callbacks.current={onPick,onBounds,onSelect,onCenter,items,picking};
 const configured=provider==='openfreemap'||!!(config.key||config.tileJSON||import.meta.env.VITE_VENUE_STYLE_URL);
 useEffect(()=>{
  if(!configured)return;
  let disposed=false,map,resize;const abort=new AbortController();setError('');setReady(false);
  (async()=>{
   const ml=await import('maplibre-gl');ml.setWorkerUrl(workerUrl);const response=await fetch(config.style,{signal:abort.signal});if(!response.ok)throw new Error('The map style could not be loaded. Check provider setup.');const style=configuredStyle(await response.json(),config);
   if(disposed)return;let camera=GTA_CAMERA;try{const saved=JSON.parse(sessionStorage.getItem(cameraKey));if(saved&&saved.center?.length===2&&[...saved.center,saved.zoom,saved.bearing,saved.pitch].every(Number.isFinite))camera=saved;}catch{/* Session storage is optional. */}
   map=new ml.Map({container:el.current,style,...camera,attributionControl:false,maxPitch:60,renderWorldCopies:false});mapRef.current=map;
   map.addControl(new ml.NavigationControl({visualizePitch:true}),'top-left');
   const publish=()=>{const b=map.getBounds();callbacks.current.onBounds([Math.max(-180,b.getWest()),Math.max(-85,b.getSouth()),Math.min(180,b.getEast()),Math.min(85,b.getNorth())].map(n=>n.toFixed(5)).join(','));const c=map.getCenter();callbacks.current.onCenter([c.lng,c.lat]);try{sessionStorage.setItem(cameraKey,JSON.stringify({center:c.toArray(),zoom:map.getZoom(),bearing:map.getBearing(),pitch:map.getPitch()}));}catch{/* Optional. */}};
   map.on('moveend',publish);
   map.on('load',()=>{
    if(disposed)return;
    map.addSource('venues',{type:'geojson',data:venueFeatures(callbacks.current.items),cluster:true,clusterMaxZoom:15,clusterRadius:48});
    map.addLayer({id:'venue-clusters',type:'circle',source:'venues',filter:['has','point_count'],paint:{'circle-color':'#e3e7e9','circle-radius':['step',['get','point_count'],19,25,24,100,30],'circle-stroke-color':'#454a4d','circle-stroke-width':3}});
    map.addLayer({id:'venue-cluster-count',type:'symbol',source:'venues',filter:['has','point_count'],layout:{'text-field':['get','point_count_abbreviated'],'text-font':['Noto Sans Regular'],'text-size':12},paint:{'text-color':'#111315'}});
    // Original monochrome pins, drawn locally; no third-party sprite dependency.
    for(const [type,glyph]of Object.entries({restaurant:'R',banquet_hall:'B',outdoor:'O',other:'V'})){
     const canvas=document.createElement('canvas');canvas.width=80;canvas.height=96;const ctx=canvas.getContext('2d');ctx.fillStyle='#15181a';ctx.strokeStyle='#e6eaed';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(40,91);ctx.bezierCurveTo(29,70,10,61,10,35);ctx.arc(40,35,30,Math.PI,0);ctx.bezierCurveTo(70,61,51,70,40,91);ctx.fill();ctx.stroke();ctx.fillStyle='#edf0f2';ctx.font='bold 27px sans-serif';ctx.textAlign='center';ctx.fillText(glyph,40,45);map.addImage('echo-pin-'+type,ctx.getImageData(0,0,80,96),{pixelRatio:2});
    }
    map.addLayer({id:'venue-pins',type:'symbol',source:'venues',filter:['!',['has','point_count']],layout:{'icon-image':['concat','echo-pin-',['get','type']],'icon-anchor':'bottom','icon-size':1,'icon-allow-overlap':true},paint:{'icon-opacity':['case',['get','saved'],1,0.65]}});
    map.addSource('selected',{type:'geojson',data:EMPTY});map.addLayer({id:'venue-selected',type:'circle',source:'selected',paint:{'circle-radius':24,'circle-color':'#a7ead2','circle-opacity':0.15,'circle-stroke-width':3,'circle-stroke-color':'#a7ead2'}},'venue-pins');
    map.addSource('my-location',{type:'geojson',data:EMPTY});map.addLayer({id:'my-location-dot',type:'circle',source:'my-location',paint:{'circle-radius':7,'circle-color':'#e7f7ff','circle-stroke-width':3,'circle-stroke-color':'#5c96b6'}});
    map.on('click',async e=>{if(callbacks.current.picking){callbacks.current.onPick([e.lngLat.lng,e.lngLat.lat]);return;}const hit=map.queryRenderedFeatures(e.point,{layers:['venue-pins','venue-clusters']})[0];if(!hit)return;if(hit.properties.cluster){try{const zoom=await map.getSource('venues').getClusterExpansionZoom(hit.properties.cluster_id);if(!disposed)map.easeTo({center:hit.geometry.coordinates,zoom});}catch{setError('This cluster changed. Try again.');}}else{const v=callbacks.current.items.find(v=>venueKey(v)===hit.properties.id);if(v)callbacks.current.onSelect(v);}});
    setReady(true);publish();
   });
   map.on('error',()=>{if(!disposed)setError('Map data unavailable. Check your connection and provider configuration, then retry.');});
   resize=new ResizeObserver(()=>map.resize());resize.observe(el.current);
  })().catch(e=>{if(!disposed&&e.name!=='AbortError')setError(e.message||'Map could not start. WebGL may be unavailable.');});
  return()=>{disposed=true;abort.abort();resize?.disconnect();marker.current?.remove();marker.current=null;mapRef.current=null;map?.remove();};
 },[configured,retry]);
 useEffect(()=>{if(ready)mapRef.current?.getSource('venues')?.setData(venueFeatures(items));},[items,ready]);
 useEffect(()=>{if(!ready||!searchResults?.length)return;const map=mapRef.current;const xs=searchResults.map(v=>v.longitude),ys=searchResults.map(v=>v.latitude);const panel=el.current?.closest('.venue-map'),controls=panel?.querySelector('.vm-controls'),padding={top:55,bottom:55,left:55,right:55};if(panel&&controls){if(controls.offsetWidth<panel.clientWidth-10)padding[panel.dir==='rtl'?'right':'left']=controls.offsetWidth+35;else padding.top=controls.offsetHeight+35;}map?.fitBounds([[Math.min(...xs),Math.min(...ys)],[Math.max(...xs),Math.max(...ys)]],{padding,maxZoom:14,duration:450});},[searchResults,ready]);
 useEffect(()=>{if(!ready)return;const map=mapRef.current;map?.getSource('selected')?.setData(selected?venueFeatures([selected]):EMPTY);if(selected)map?.easeTo({center:[selected.longitude,selected.latitude],duration:450});},[selected,ready]);
 useEffect(()=>{let disposed=false;if(!draft){marker.current?.remove();marker.current=null;return;}import('maplibre-gl').then(ml=>{if(disposed||!ready||!mapRef.current)return;if(!marker.current){const node=document.createElement('button');node.type='button';node.className='vm-edit-pin';node.title='Drag venue pin';node.setAttribute('aria-label','Drag venue pin, or edit coordinates in the form');node.textContent='+';marker.current=new ml.Marker({element:node,draggable:true}).setLngLat([draft.longitude,draft.latitude]).addTo(mapRef.current);marker.current.on('dragend',()=>{const c=marker.current.getLngLat();callbacks.current.onPick([c.lng,c.lat]);});}else marker.current.setLngLat([draft.longitude,draft.latitude]);});return()=>{disposed=true;};},[draft,ready]);
 const locate=()=>{if(!navigator.geolocation){setError('Location is unavailable in this browser. You can still explore the map.');return;}setLocating(true);navigator.geolocation.getCurrentPosition(p=>{setLocating(false);const map=mapRef.current;if(!map?.getSource('my-location'))return;map.getSource('my-location').setData({type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'Point',coordinates:[p.coords.longitude,p.coords.latitude]}}]});map.easeTo({center:[p.coords.longitude,p.coords.latitude],zoom:14});},()=>{setLocating(false);setError('Location was denied or unavailable. You can still pan, zoom and search.');},{enableHighAccuracy:false,timeout:10000,maximumAge:60000});};
 return <div className={`vm-map${picking?' vm-picking':''}`}><div ref={el} className="vm-canvas" aria-label="Venue map, Greater Toronto Area"/>{!configured?<div className="vm-setup"><span className="vm-eyebrow">MAP SETUP</span><h2>Your venues, in place.</h2><p>Connect a licensed vector tile provider to explore the live map. Saved venue records remain available in the list.</p><p>Set <code>VITE_VENUE_TILE_KEY</code> for MapTiler, or configure a licensed style and tile source. See <code>docs/VENUE-MAP.md</code>.</p></div>:!ready&&!error?<p className="vm-map-status is-loading" role="status"><i aria-hidden="true"/>Loading map…</p>:null}{error&&<div className="vm-map-status" role="alert">{error} <button type="button" onClick={()=>setRetry(n=>n+1)}>Retry map</button></div>}{ready&&<button type="button" className="vm-locate" onClick={locate} disabled={locating} aria-label={locating?'Locating…':'My location'} title={locating?'Locating…':'My location'} aria-busy={locating||undefined}>{locating?<LoaderCircle size={19} className="vm-location-spinner" aria-hidden="true"/>:<LocateFixed size={19} aria-hidden="true"/>}</button>}{ready&&provider==='maptiler'&&config.key&&<a className="vm-provider-logo" href="https://www.maptiler.com/" aria-label="MapTiler"><img src="/maps/maptiler-logo.svg" alt="MapTiler"/></a>}{picking&&<p className="vm-pick-hint">Click the map to place the venue pin</p>}</div>;
}
