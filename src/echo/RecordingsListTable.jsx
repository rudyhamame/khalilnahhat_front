import {recordingTypeLabel} from '../lib/musicOntology';

export default function RecordingsListTable({recordings,selectedId,onSelect,onEdit,loading}){
 return <div className="ontology-table-wrap ontology-recordings-table"><table aria-label="Recordings"><thead><tr><th scope="col">Recording</th><th scope="col">Artist</th><th scope="col">Type</th><th scope="col">Duration</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead><tbody>
  {recordings.map(recording=><tr key={recording.id} className={selectedId===recording.id?'is-selected':''}>
   <td data-label="Recording"><button type="button" className="ontology-recording-title" aria-pressed={selectedId===recording.id} onClick={()=>onSelect(recording.id)}>{recording.coverImage&&<img src={recording.coverImage} alt="" loading="lazy"/>}<strong>{recording.title}</strong></button></td>
   <td data-label="Artist">{recording.artist||'No credited artists'}</td>
   <td data-label="Type">{recordingTypeLabel(recording.recordingType)}</td>
   <td data-label="Duration">{recording.duration||'Unknown'}</td>
   <td data-label="Status">{recording.archivalStatus==='ARCHIVED'?'Archived':recording.publicationStatus==='PUBLISHED'?'Published':'Draft'}</td>
   <td data-label="Actions"><button type="button" aria-label={`Edit ${recording.title}`} onClick={()=>onEdit(recording)}>Edit</button></td>
  </tr>)}
  {!recordings.length&&<tr><td colSpan={6}>{loading?'Loading recordings…':'No recordings match this collection and the current filters.'}</td></tr>}
 </tbody></table></div>;
}
