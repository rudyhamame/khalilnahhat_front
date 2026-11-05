import {flatEqualizer} from './audioEqualizer';
export const ARCHIVE_PLAYER_STATE='echo:archive-player-state';
export const ARCHIVE_PLAYER_COMMAND='echo:archive-player-command';
let snapshot={track:null,tracks:[],playing:false,preparing:false,buffering:false,position:0,duration:0,volume:.75,playbackRate:1,equalizer:flatEqualizer(),error:''};
let controls=snapshot;
export const readArchivePlayerState=()=>snapshot;
export const readArchivePlayerControls=()=>controls;
export const readArchivePlaybackPosition=trackId=>trackId&&snapshot.track?.id===trackId?snapshot.position:0;
export const subscribeArchivePlayerState=listener=>{window.addEventListener(ARCHIVE_PLAYER_STATE,listener);return()=>window.removeEventListener(ARCHIVE_PLAYER_STATE,listener);};
export function publishArchivePlayerState(value){
  // Preserve controls identity on a clock tick. useSyncExternalStore can then
  // skip the archive/tree render while clock-only subscribers still advance.
  const keys=new Set([...Object.keys(controls),...Object.keys(value)]);
  if([...keys].some(key=>key!=='position'&&!Object.is(controls[key],value[key])))controls=value;
  snapshot=value;
  window.dispatchEvent(new CustomEvent(ARCHIVE_PLAYER_STATE,{detail:value}));
}
export function archivePlayerCommand(type,value){window.dispatchEvent(new CustomEvent(ARCHIVE_PLAYER_COMMAND,{detail:{type,value}}));}

export const ARCHIVE_MIXER_STATE='echo:archive-mixer-state';
let mixerOpen=false;
export const readArchiveMixerState=()=>mixerOpen;
export function publishArchiveMixerState(open){mixerOpen=Boolean(open);window.dispatchEvent(new CustomEvent(ARCHIVE_MIXER_STATE,{detail:mixerOpen}));}
