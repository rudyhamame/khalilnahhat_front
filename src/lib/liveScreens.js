// What the operator sets in "Live screens" (pause screen sound, countdown lengths) is kept in this browser, so the next live starts with it.
// The pictures and messages are kept by pausePhoto.js. Settings are small (localStorage); a sound file can be large, so it goes to IndexedDB.
const SETTINGS_KEY='echo-live-screens',DB='echo-live-screens',STORE='files',SOUND='pause-sound';
const DEFAULTS={pauseCountdown:3,pauseIntro:0,goCountdown:3},ALLOWED=[0,3,5,10,30,60];
export function loadScreenSettings(storage=globalThis.localStorage){
  try{const saved=JSON.parse(storage?.getItem(SETTINGS_KEY)||'{}'),pick=(key)=>ALLOWED.includes(saved[key])?saved[key]:DEFAULTS[key];return {pauseCountdown:pick('pauseCountdown'),pauseIntro:pick('pauseIntro'),goCountdown:pick('goCountdown')};}
  catch{return {...DEFAULTS};}
}
export function saveScreenSettings(settings,storage=globalThis.localStorage){try{storage?.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch{/* still applies this session */}}
const open=(indexedDB=globalThis.indexedDB)=>new Promise((done,fail)=>{if(!indexedDB){fail(new Error('IndexedDB unavailable'));return;}const request=indexedDB.open(DB,1);request.onupgradeneeded=()=>request.result.createObjectStore(STORE);request.onsuccess=()=>done(request.result);request.onerror=()=>fail(request.error);});
const run=async(mode,action)=>{const db=await open();try{return await new Promise((done,fail)=>{const request=action(db.transaction(STORE,mode).objectStore(STORE));request.onsuccess=()=>done(request.result);request.onerror=()=>fail(request.error);});}finally{db.close();}};
// null removes the saved sound. Never throws: a browser without IndexedDB just keeps the sound for the session.
export async function saveScreenSound(file){try{if(file)await run('readwrite',store=>store.put({blob:file,name:file.name||'sound',type:file.type||''},SOUND));else await run('readwrite',store=>store.delete(SOUND));}catch{/* kept for this session only */}}
export async function loadScreenSound(){try{const saved=await run('readonly',store=>store.get(SOUND));return saved?.blob?new File([saved.blob],saved.name,{type:saved.type||saved.blob.type}):null;}catch{return null;}}
