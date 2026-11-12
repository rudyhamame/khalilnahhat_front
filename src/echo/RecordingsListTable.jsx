import {recordingTypeLabel,recordingComponents} from '../lib/musicOntology';
const metadata=(value,state)=>(Array.isArray(value)?value.join(', ')||null:value)??({MISSING:'Not specified',UNKNOWN:'Unknown',NOT_APPLICABLE:'Not applicable'}[state]||'Not specified');

const nameOf=(vocabulary,id)=>vocabulary.find(row=>row.id===id)?.name||'';
// What the add / edit form saves: musical {bpms,keys,rhythmIds,genreIds}, languages {languageIds,dialectIds}, recordingCredits {vocalists,musicians}.
const names=(vocabulary,ids)=>[...new Set((ids||[]).map(id=>nameOf(vocabulary,id)).filter(Boolean))];
const duration=recording=>{if(recording.duration)return recording.duration;const seconds=recording.durationSeconds??recording.audio?.durationSeconds;return Number.isFinite(seconds)?`${Math.floor(seconds/60)}:${String(Math.round(seconds%60)).padStart(2,'0')}`.replace(/^(\d+):60$/,(_,m)=>`${+m+1}:00`):'';};
const firstFilled=(...lists)=>lists.find(list=>Array.isArray(list)&&list.length)||[];
export default function RecordingsListTable({recordings,selectedId,onSelect,loading,vocabulary=[]}){
 return <div className="ontology-table-wrap ontology-recordings-table" tabIndex={0} role="region" aria-label="Recording details, scroll horizontally for all fields"><table aria-label="Recordings"><thead><tr><th scope="col">Recording</th><th scope="col">Vocalist</th><th scope="col">Duration</th><th scope="col">Release date</th><th scope="col">Recording type</th><th scope="col">Recording genre</th>
<th scope="col">Language</th><th scope="col">Publication</th><th scope="col">Archive</th><th scope="col">Recording BPM</th><th scope="col">Recording key</th><th scope="col">Description</th></tr></thead><tbody>
  {recordings.map(recording=>{const genres=recording.recordingMetadata?.genres?.map(g=>g.name)||[...new Set(recordingComponents(recording).flatMap(work=>(work.melody?.genres||[]).map(genre=>genre.name)).filter(Boolean))];const musical=recording.musical||{},vocalists=names(vocabulary,(recording.recordingCredits?.vocalists||[]).map(credit=>credit.artistId)),formGenres=names(vocabulary,musical.genreIds),languageNames=names(vocabulary,recording.languages?.languageIds),dialectNames=names(vocabulary,recording.languages?.dialectIds);return <tr key={recording.id} className={selectedId===recording.id?'is-selected':''} onClick={()=>onSelect(recording.id)}>
   <td data-label="Recording"><button type="button" className="ontology-recording-title" aria-pressed={selectedId===recording.id} onClick={e=>{e.stopPropagation();onSelect(recording.id);}}>{recording.coverImage?<img src={recording.coverImage} alt="" loading="lazy"/>:<span className="rec-cover-empty" aria-hidden="true"/>}<strong>{recording.title}</strong></button></td>
   <td data-label="Artist">{vocalists.join(', ')||recording.artist||'Not specified'}</td>
   <td data-label="Duration">{duration(recording)||'Unknown'}</td>
   <td data-label="Release date">{recording.releaseDate||'Not specified'}</td>
   <td data-label="Recording type">{recording.recordingTypeDefinition?.name||recordingTypeLabel(recording.recordingType)}</td>
   <td data-label="Recording genre">{(formGenres.length?formGenres:genres).join(', ')||'Not specified'}</td>
   <td data-label="Language">{[...languageNames,...dialectNames].join(', ')||'Not specified'}</td>
   <td data-label="Publication"><span className={`rec-pill rec-pill--${recording.publicationStatus==='PUBLISHED'?'on':'off'}`}>{recording.publicationStatus==='PUBLISHED'?'Published':recording.publicationStatus==='DRAFT'?'Draft':recording.publicationStatus||'Not specified'}</span></td>
   <td data-label="Archive"><span className={`rec-pill rec-pill--${recording.archivalStatus==='ACTIVE'?'on':'off'}`}>{recording.archivalStatus==='ARCHIVED'?'Archived':recording.archivalStatus==='ACTIVE'?'Active':recording.archivalStatus||'Not specified'}</span></td>
   <td data-label="Recording BPM">{metadata(firstFilled(musical.bpms,recording.recordingMetadata?.bpms)||null,recording.recordingMetadata?.states?.bpm)}</td>
   <td data-label="Recording key">{metadata(firstFilled(musical.keys,recording.recordingMetadata?.keys)||null,recording.recordingMetadata?.states?.key)}</td>
   <td data-label="Description">{recording.description||'Not specified'}</td>
  </tr>;})}
  {!recordings.length&&<tr><td colSpan={12}>{loading?'Loading recordings…':'No recordings match this collection and the current filters.'}</td></tr>}
 </tbody></table></div>;
}
