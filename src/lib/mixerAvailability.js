export const MIXER_PHONE_MEDIA='(max-width:760px), (pointer:coarse) and (max-width:1100px) and (max-height:600px)';
export const isMixerAvailable=()=>typeof window==='undefined'||!window.matchMedia(MIXER_PHONE_MEDIA).matches;
