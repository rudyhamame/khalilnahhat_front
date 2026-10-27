import {flatEqualizer} from './audioEqualizer';
export const ARCHIVE_PLAYER_STATE='echo:archive-player-state';
export const ARCHIVE_PLAYER_COMMAND='echo:archive-player-command';
let snapshot={track:null,tracks:[],playing:false,preparing:false,buffering:false,position:0,duration:0,volume:.75,equalizer:flatEqualizer(),error:''};
export const readArchivePlayerState=()=>snapshot;
export function publishArchivePlayerState(value){snapshot=value;window.dispatchEvent(new CustomEvent(ARCHIVE_PLAYER_STATE,{detail:value}));}
export function archivePlayerCommand(type,value){window.dispatchEvent(new CustomEvent(ARCHIVE_PLAYER_COMMAND,{detail:{type,value}}));}
