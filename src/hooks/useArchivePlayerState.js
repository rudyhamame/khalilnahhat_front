import {useSyncExternalStore} from 'react';
import {subscribeArchivePlayerState,readArchivePlayerState,readArchivePlayerControls,readArchivePlaybackPosition} from '../lib/archivePlayerBridge';

// Most views need track/playback controls, not every position tick.
export function useArchivePlayerState({includePosition=false}={}){
  return useSyncExternalStore(subscribeArchivePlayerState,includePosition?readArchivePlayerState:readArchivePlayerControls,readArchivePlayerControls);
}
export function useArchivePlaybackPosition(trackId){
  const read=()=>readArchivePlaybackPosition(trackId);
  return useSyncExternalStore(subscribeArchivePlayerState,read,()=>0);
}
