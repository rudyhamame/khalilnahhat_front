// Live picture quality chosen in Studio. It sets the camera capture size and the bitrate sent to the OVH relay, which records
// exactly those encoded frames on the server (no browser re-encode), so this is also the quality of the saved recording.
export const LIVE_QUALITY=Object.freeze({
 standard:{id:'standard',label:'Standard · 720p',detail:'1280×720 · 1.7 Mbps. Lowest bandwidth.',long:1280,short:720,videoBitrate:1700000},
 high:{id:'high',label:'High · 1080p',detail:'1920×1080 · 6 Mbps. Needs about 8 Mbps upload.',long:1920,short:1080,videoBitrate:6000000},
 recording:{id:'recording',label:'Recording-first · 1080p',detail:'1920×1080 · 8 Mbps. Best saved file, needs about 11 Mbps upload.',long:1920,short:1080,videoBitrate:8000000},
});
const KEY='echo-live-quality';
export function getLiveQuality(storage=globalThis.localStorage){try{return LIVE_QUALITY[storage?.getItem(KEY)]||LIVE_QUALITY.standard;}catch{return LIVE_QUALITY.standard;}}
export function setLiveQuality(id,storage=globalThis.localStorage){if(!LIVE_QUALITY[id])return LIVE_QUALITY.standard;try{storage?.setItem(KEY,id);}catch{/* applies for this session only */}return LIVE_QUALITY[id];}
