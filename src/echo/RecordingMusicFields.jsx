export default function RecordingMusicFields({value,credits}){
 // One chip per content entry, since a recording can hold several BPMs, keys, genres and credits.
 const chips=entries=>entries.length?<ul className="recording-inferred-chips">{entries.map((entry,i)=><li key={`${entry}-${i}`}>{entry}</li>)}</ul>:'Not specified in content';
 return <section className="recording-inferred-fields" aria-label="Details from content"><header><div><h4>From content</h4><p>These details update automatically from your selected content.</p></div></header><dl><dt>Recording BPM</dt><dd>{chips(value.bpms.map(String))}</dd><dt>Recording key</dt><dd>{chips(value.keys.map(String))}</dd><dt>Recording genre</dt><dd>{chips(value.genres.map(g=>g.name))}</dd><dt>Production credits</dt><dd>{chips(credits.map(credit=>`${credit.artist?.name||credit.artistId} · ${credit.role.replaceAll('_',' ').toLowerCase()}${credit.detail?` (${credit.detail})`:''}`))}</dd></dl></section>;
}
