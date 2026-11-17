// Live picture quality chosen in Studio: 720p or 1080p. It sets the camera capture size and the bitrate sent to the live relay; the browser recording (saved on this computer) follows the capture height.
export const LIVE_QUALITY=Object.freeze({
 standard:{id:'standard',label:'720p',detail:'1280×720 · 1.7 Mbps live, 3.5 Mbps recording. Lowest bandwidth.',long:1280,short:720,videoBitrate:1700000},
 high:{id:'high',label:'1080p',detail:'1920×1080 · 6 Mbps live and recording. Needs about 8 Mbps upload.',long:1920,short:1080,videoBitrate:6000000},
});
const KEY='echo-live-quality';
export function getLiveQuality(storage=globalThis.localStorage){try{return LIVE_QUALITY[storage?.getItem(KEY)]||LIVE_QUALITY.standard;}catch{return LIVE_QUALITY.standard;}}
export function setLiveQuality(id,storage=globalThis.localStorage){if(!LIVE_QUALITY[id])return LIVE_QUALITY.standard;try{storage?.setItem(KEY,id);}catch{/* applies for this session only */}return LIVE_QUALITY[id];}
export function liveQualityResolution(id,portrait=false){const item=LIVE_QUALITY[id]||LIVE_QUALITY.standard;return portrait?`${item.short}×${item.long}`:`${item.long}×${item.short}`;}
