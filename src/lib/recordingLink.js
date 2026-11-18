// Stable QR entry point; resolves the recording’s current work type before opening Music.
const SITE='https://djkhalilnahhat.ca';
export const recordingPublicUrl=id=>{
 const host=typeof window!=='undefined'&&!/^(localhost|127\.|192\.168\.|10\.)/.test(window.location.hostname)?window.location.origin:SITE;
 return `${host}/music-archive/recordings/${encodeURIComponent(id)}`;
};

export const recordingMusicPath=(id,workType)=>`/music?${new URLSearchParams({play:workType,recording:id,autoplay:'1'})}`;
