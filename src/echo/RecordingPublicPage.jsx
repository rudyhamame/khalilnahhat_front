import {useEffect,useState} from 'react';
import {ArrowLeft,Disc3} from 'lucide-react';
import {fetchOntologyRecording} from '../lib/musicOntology';
import {usePageMeta} from './meta';
import './musicArchive.css';

// Opened by a recording's QR code: one published recording with its own player.
export default function RecordingPublicPage({lang,recordingId}){
 const ar=lang.lang==='ar',t=(en,arabic)=>ar?arabic:en;
 const [state,setState]=useState({status:'loading',item:null});
 usePageMeta(`${state.item?.title||t('Recording','تسجيل')} | DJ Khalil — Echo Event Entertainment`,'Listen to a DJ Khalil recording.');
 useEffect(()=>{let alive=true;setState({status:'loading',item:null});fetchOntologyRecording(recordingId).then(item=>{if(alive)setState({status:'ready',item});}).catch(()=>{if(alive)setState({status:'error',item:null});});return()=>{alive=false;};},[recordingId]);
 const {status,item}=state,audio=item?.storedAudioUrl||item?.audioUrl;
 return <section className="echo-section ma-public" dir={ar?'rtl':'ltr'}>
  <a className="ma-back" href="/music-archive"><ArrowLeft size={15}/> {t('Music archive','أرشيف الموسيقى')}</a>
  {status==='loading'&&<p role="status">{t('Loading the recording…','جارٍ تحميل التسجيل…')}</p>}
  {status==='error'&&<p role="alert">{t('This recording is unavailable or unpublished.','هذا التسجيل غير متاح أو غير منشور.')}</p>}
  {item&&<div className="ma-album-intro"><div className="ma-artwork">{item.coverImage?<img src={item.coverImage} alt=""/>:<Disc3 size={64} strokeWidth={1}/>}</div><div><span className="ma-eyebrow">DJ KHALIL</span><h1>{item.title}</h1>{item.artist&&<p>{item.artist}</p>}{item.description&&<p>{item.description}</p>}{audio?<audio controls preload="metadata" src={audio} style={{width:'100%',marginTop:16}}/>:<p>{t('No audio is attached to this recording yet.','لا يوجد ملف صوتي لهذا التسجيل بعد.')}</p>}</div></div>}
 </section>;
}
