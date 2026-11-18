import {useContext} from 'react';
import {RecordingHintScope} from './RecordingHintScope';
import {createPortal} from 'react-dom';
import {LoaderCircle} from 'lucide-react';
import {useDomSlot} from './useDomSlot';
import './recordingLoadingHint.css';

// Progress belongs to the active editor's subheader. Standalone uses retain an inline status.
export default function RecordingLoadingHint({message}){
 const target=useContext(RecordingHintScope),slot=useDomSlot(target);
 if(!message)return null;
 const hint=<span className="recording-loading-hint" role="status" title={message}><LoaderCircle size={13} aria-hidden="true"/><span>{message}</span></span>;
 return slot?createPortal(hint,slot):hint;
}
