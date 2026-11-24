// Local browser playback uses Vite's same-origin proxy; signed paths and queries stay intact.
export function playbackMediaUrl(value,{development=import.meta.env?.DEV??false}={}){
 if(!development||typeof value!=='string')return value;
 try{const url=new URL(value);if(url.origin==='https://vps-ba7fb4cb.vps.ovh.ca'&&/^\/khalil-media\/(?:public|private)\/[a-f0-9]{64}\.[a-z0-9]{1,12}$/.test(url.pathname))return url.pathname+url.search;}
 catch{/* Other media sources keep their original URL. */}
 return value;
}
