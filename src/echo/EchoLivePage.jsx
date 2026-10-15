import { useEffect, useState } from 'react';
import { Radio, RefreshCw } from 'lucide-react';
import { apiRequest } from '../lib/api';
import WebrtcViewer from '../components/WebrtcViewer';
import './live.css';
import LiveStreamPlayer from '../components/LiveStreamPlayer';
import { usePageMeta } from './meta';

export default function EchoLivePage({ lang }) {
  const ar = lang.lang === 'ar';
  usePageMeta(ar ? 'البث المباشر | دي جي خليل' : 'Live DJ Broadcast | Echo DJ Khalil', ar ? 'شاهد البث المباشر لدي جي خليل.' : 'Watch DJ Khalil live from Echo events.');
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let timer;
    const refresh = async () => {
      try {
        const data = await apiRequest('/live-stream');
        if (!cancelled) { setStream(data.item); setError(false); }
      } catch { if (!cancelled) setError(true); }
      finally { if (!cancelled) timer = setTimeout(refresh, 8000); }
    };
    refresh();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [retry]);
  const live = Boolean(stream?.isLive);
  const webRtc = stream?.broadcastMode === 'webrtc';
  return <div className="echo-live-page" dir={ar ? 'rtl' : 'ltr'}>
    <div className="echo-live-heading"><span className="echo-eyebrow">ECHO / LIVE</span>
      <h1>{ar ? 'الموسيقى. الآن.' : 'THE ROOM. LIVE.'}</h1>
      <p>{ar ? 'دي جي خليل، مباشرة من قلب الحدث.' : 'DJ Khalil. Straight from the heart of the event.'}</p></div>
    <section className="echo-live-stage" aria-label={ar ? 'البث المباشر' : 'Live broadcast'}>
      {live && webRtc ? <WebrtcViewer key={`${stream.webrtcRoomName || stream.updatedAt || 'live'}:${retry}`} lang={lang.lang} /> : live && stream?.streamUrl ? <LiveStreamPlayer liveStream={stream} /> :
        <div className="echo-live-offline"><Radio size={44} aria-hidden="true" />
          <h2>{error ? (ar ? 'تعذر الوصول إلى البث' : 'Unable to check the broadcast') : stream ? (ar ? 'نلتقي في البث القادم' : 'THE NEXT SET IS COMING.') : (ar ? 'جارٍ التحقق…' : 'Checking the stage…')}</h2>
          <p>{ar ? 'ستظهر الصورة هنا عند بدء البث. تتحدث هذه الصفحة تلقائياً.' : 'The picture appears here when we go live. This page checks automatically.'}</p>
        </div>}
    </section>
    <div className="echo-live-meta"><span>{live ? (ar ? '● بث مباشر' : '● LIVE BROADCAST') : 'ECHO DJ'}</span>
      <button type="button" onClick={() => setRetry(value => value + 1)}><RefreshCw size={16} />{ar ? 'إعادة الاتصال' : 'Reconnect'}</button></div>
    {error && live && <p role="status">{ar ? 'تعذر تحديث حالة البث. قد يستمر الفيديو.' : 'Broadcast status could not refresh. Video may continue.'}</p>}
  </div>;
}
