// Public listening page for one recording; the QR code in the admin editor encodes this URL.
const SITE='https://djkhalilnahhat.ca';
export const recordingPublicUrl=id=>{
 const host=typeof window!=='undefined'&&!/^(localhost|127\.|192\.168\.|10\.)/.test(window.location.hostname)?window.location.origin:SITE;
 return `${host}/music-archive/recordings/${encodeURIComponent(id)}`;
};
