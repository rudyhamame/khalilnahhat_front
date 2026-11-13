import './musicContentLoader.css';

export default function MusicContentLoader({ar=false}){
  return <div className="music-content-loader" role="status" aria-live="polite" dir={ar?'rtl':'ltr'}>
    <span className="music-content-spinner" aria-hidden="true"/>
    <p>{ar?'جارٍ تحميل الموسيقى…':'Loading music…'}</p>
  </div>;
}
