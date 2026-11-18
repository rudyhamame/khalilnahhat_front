import {useEffect,useState} from 'react';
import {ArrowLeft} from 'lucide-react';
import {fetchOntologyRecording} from '../lib/musicOntology';
import {recordingMusicPath} from '../lib/recordingLink';
import {usePageMeta} from './meta';
import './musicArchive.css';

// Keep printed QR codes working: resolve the recording's current type, then open its normal Music box.
export default function RecordingPublicPage({lang,recordingId}){
 const ar=lang.lang==='ar',t=(en,arabic)=>ar?arabic:en;
 const [failed,setFailed]=useState(false);
 usePageMeta(`${t('Recording','تسجيل')} | DJ Khalil — Echo Event Entertainment`,'Listen to a DJ Khalil recording.');
 useEffect(()=>{
  let alive=true;setFailed(false);
  fetchOntologyRecording(recordingId).then(item=>{
   if(!alive)return;
   if(!item.workType||item.status!=='PUBLISHED'||!(item.storedAudioUrl||item.audioUrl)){setFailed(true);return;}
   window.location.replace(recordingMusicPath(item.id,item.workType));
  }).catch(()=>{if(alive)setFailed(true);});
  return()=>{alive=false;};
 },[recordingId]);
 return <section className="echo-section ma-public" dir={ar?'rtl':'ltr'}>
  <a className="ma-back" href="/music"><ArrowLeft size={15}/> {t('Music','الموسيقى')}</a>
  {failed?<p role="alert">{t('This recording is unavailable or unpublished.','هذا التسجيل غير متاح أو غير منشور.')}</p>:<p role="status">{t('Opening the recording in Music…','جارٍ فتح التسجيل في صفحة الموسيقى…')}</p>}
 </section>;
}
