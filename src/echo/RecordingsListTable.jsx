import {recordingTypeLabel,recordingComponents} from '../lib/musicOntology';
const metadata=(value,state)=>value??({MISSING:'Not specified',UNKNOWN:'Unknown',NOT_APPLICABLE:'Not applicable'}[state]||'Not specified');

export default function RecordingsListTable({recordings,selectedId,onSelect,loading}){
 return <div className="ontology-table-wrap ontology-recordings-table" tabIndex={0} role="region" aria-label="Recording details, scroll horizontally for all fields"><table aria-label="Recordings"><thead><tr><th scope="col">Recording</th><th scope="col">Artist</th><th scope="col">Duration</th><th scope="col">Release date</th><th scope="col">Recording type</th><th scope="col">Genre</th><th scope="col">Publication</th><th scope="col">Archive</th><th scope="col">Recording BPM</th><th scope="col">Recording key</th><th scope="col">Description</th></tr></thead><tbody>
  {recordings.map(recording=>{const genres=[...new Set(recordingComponents(recording).flatMap(work=>(work.melody?.genres||[]).map(genre=>genre.name)).filter(Boolean))];return <tr key={recording.id} className={selectedId===recording.id?'is-selected':''}>
   <td data-label="Recording"><button type="button" className="ontology-recording-title" aria-pressed={selectedId===recording.id} onClick={()=>onSelect(recording.id)}>{recording.coverImage&&<img src={recording.coverImage} alt="" loading="lazy"/>}<strong>{recording.title}</strong></button></td>
   <td data-label="Artist">{recording.artist||'Not specified'}</td>
   <td data-label="Duration">{recording.duration||'Unknown'}</td>
   <td data-label="Release date">{recording.releaseDate||'Not specified'}</td>
   <td data-label="Recording type">{recordingTypeLabel(recording.recordingType)}</td>
   <td data-label="Genre">{genres.join(', ')||'Not specified'}</td>
   <td data-label="Publication">{recording.publicationStatus==='PUBLISHED'?'Published':recording.publicationStatus==='DRAFT'?'Draft':recording.publicationStatus||'Not specified'}</td>
   <td data-label="Archive">{recording.archivalStatus==='ARCHIVED'?'Archived':recording.archivalStatus==='ACTIVE'?'Active':recording.archivalStatus||'Not specified'}</td>
   <td data-label="Recording BPM">{metadata(recording.recordingMetadata?.bpm,recording.recordingMetadata?.states?.bpm)}</td>
   <td data-label="Recording key">{metadata(recording.recordingMetadata?.key,recording.recordingMetadata?.states?.key)}</td>
   <td data-label="Description">{recording.description||'Not specified'}</td>
  </tr>;})}
  {!recordings.length&&<tr><td colSpan={11}>{loading?'Loading recordings…':'No recordings match this collection and the current filters.'}</td></tr>}
 </tbody></table></div>;
}
