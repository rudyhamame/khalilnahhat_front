import {useEffect,useRef} from 'react';
export default function RecordingFallbackDialog({onChoose}){
 const dialog=useRef(null);
 useEffect(()=>{const element=dialog.current;element.showModal();return()=>element.close();},[]);
 return <dialog ref={dialog} className="recording-fallback-dialog" aria-labelledby="recording-fallback-title" onCancel={event=>{event.preventDefault();onChoose(false);}}>
  <h3 id="recording-fallback-title">Record on this device only?</h3>
  <p>OVH cannot accept this recording right now. You can still go live and save the recording in your selected folder.</p>
  <p>This recording will stay on this device. It will not upload to OVH or Cloudinary, including after you reopen Studio.</p>
  <div><button type="button" onClick={()=>onChoose(false)}>Cancel</button><button type="button" className="is-primary" autoFocus onClick={()=>onChoose(true)}>Record on this device only</button></div>
 </dialog>;
}
