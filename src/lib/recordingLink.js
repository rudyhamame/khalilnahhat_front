// Public link for a recording (used by the QR code).
const SITE='https://djkhalilnahhat.ca';
export const recordingPublicUrl=id=>{
 const host=typeof window!=='undefined'&&!/^(localhost|127\.|192\.168\.|10\.)/.test(window.location.hostname)?window.location.origin:SITE;
 // The Music page itself resolves the recording's work type, opens its player and starts it (older printed codes with /music-archive/recordings/<id> keep working).
 return `${host}/music?recording=${encodeURIComponent(id)}&autoplay=1`;
};

export const recordingMusicPath=(id,workType)=>`/music?${new URLSearchParams({play:workType,recording:id,autoplay:'1'})}`;
