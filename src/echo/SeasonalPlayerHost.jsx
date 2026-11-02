import {useArchivePlayerState} from '../hooks/useArchivePlayerState';
import {useCallback,useRef,useState} from 'react';
import SeasonalTreeInspector from './SeasonalTreeInspector';
import {readArchivePlayerState,archivePlayerCommand} from '../lib/archivePlayerBridge';
import {SeasonalPlayerContext} from './seasonalPlayerContext';
// Keep the media element mounted outside page routes, including while docked.
export default function SeasonalPlayerHost({children}){
 const [selection,setSelection]=useState(null),player=useArchivePlayerState({includePosition:Boolean(selection)});
 const currentSelection=useRef(null);
 const open=useCallback(config=>{currentSelection.current?.onClose?.();currentSelection.current=config;setSelection(config);},[]);
 const play=track=>{const current=readArchivePlayerState();if(current.track?.id===track.id&&current.enabled)archivePlayerCommand(current.playing||current.preparing?'pause':'toggle');else window.dispatchEvent(new CustomEvent('echo:archive-play',{detail:{id:track.id,ids:selection.ids,inline:true}}));};
 const close=()=>{selection?.onClose?.();currentSelection.current=null;setSelection(null);};
 const {key,...inspectorProps}=selection||{};
 return <SeasonalPlayerContext.Provider value={open}>{children}{selection&&<SeasonalTreeInspector key={key} {...inspectorProps} player={player} onPlay={play} onSeek={value=>archivePlayerCommand('seek',value)} onStop={()=>archivePlayerCommand('pause')} onClose={close}/>}</SeasonalPlayerContext.Provider>;
}
