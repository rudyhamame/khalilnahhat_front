import {Trash2} from 'lucide-react';
import './recordingEditorBar.css';

// The destructive actions of the recording editor, kept apart from the everyday toolbar.
export default function RecordingDangerZone({locked,busy,hasAudio,onDeleteAudio,onDeleteRecording}){
 return <section className="recording-danger-zone" aria-label="Danger zone">
  <h3>Danger zone</h3>
  <div>
   {hasAudio&&<button type="button" disabled={locked} aria-label="Delete selected audio" title="Delete selected audio" onClick={onDeleteAudio}><Trash2 size={16} aria-hidden="true"/><span>Delete audio</span></button>}
   <button type="button" disabled={locked||busy} title="Delete this recording" onClick={onDeleteRecording}><Trash2 size={16} aria-hidden="true"/><span>Delete Recording</span></button>
  </div>
 </section>;
}
