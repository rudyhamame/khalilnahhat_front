export default function SyncedLyrics({timing,position,active,ar}){
 const lines=timing?.lines;
 if(!Array.isArray(lines)||!lines.length)return null;
 const current=active?lines.findLastIndex(line=>position>=line.start&&position<line.end):-1;
 const next=lines.findIndex(line=>line.start>position);
 const preview=current>=0?lines[current+1]:lines[active?next:0];
 return <section className="home-synced-lyrics" aria-label={ar?'كلمات متزامنة':'Synchronized lyrics'}>
  <small>{ar?'كلمات الأغنية':'LYRICS'}</small>
  <p className="home-synced-lyrics-current" dir="auto" aria-live="polite">{current>=0?lines[current].text:ar?'♪ موسيقى ♪':'♪ Instrumental ♪'}</p>
  <p className="home-synced-lyrics-next" dir="auto">{preview?.text||'\u00a0'}</p>
 </section>;
}
