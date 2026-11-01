import WebrtcViewer from './WebrtcViewer';
import {liveSessionIdentity} from '../hooks/useLiveStatus';
import LiveSignInPrompt from '../echo/LiveSignInPrompt';
export default function LiveStreamPlayer({liveStream,token,lang='en'}) {
 if(!token)return <LiveSignInPrompt ar={lang==='ar'} kind="watch"/>;
 if(!liveStream?.isLive)return <div className="live-stream-idle">{lang==='ar'?'نلتقي في البث القادم.':'The next live set is coming.'}</div>;
 if(!['webrtc','whep'].includes(liveStream.broadcastMode))return <div className="live-stream-idle">{lang==='ar'?'البث للأعضاء غير متاح حالياً.':'Members-only playback is unavailable for this source.'}</div>;
 return <WebrtcViewer token={token} sessionIdentity={liveSessionIdentity(liveStream)} lang={lang}/>;
}
