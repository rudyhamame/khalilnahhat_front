// Development only: the OVH media server answers 403 to a browser fetch whose Origin is localhost, so the 3D models (fetched by model-viewer and the GLTF loaders)
// never load on the dev server. Route those fetches through Vite's same-origin /khalil-media proxy (scripts/media-dev-proxy.mjs), which drops the Origin header.
// Production is untouched: the site's own origin is allowed by the server.
const HOST='https://vps-ba7fb4cb.vps.ovh.ca',PREFIX='/khalil-media/';
if(import.meta.env.DEV&&typeof window!=='undefined'&&!window.__echoDevMediaProxy){
 window.__echoDevMediaProxy=true;
 const native=window.fetch.bind(window);
 window.fetch=(input,init)=>{
  const url=typeof input==='string'?input:input instanceof URL?input.href:input?.url;
  if(typeof url==='string'&&url.startsWith(HOST+PREFIX)){
   const path=url.slice(HOST.length);
   return native(input instanceof Request?new Request(path,input):path,init);
  }
  return native(input,init);
 };
}
