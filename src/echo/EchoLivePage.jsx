import HomeLiveConsole from './HomeLiveConsole';
import {usePageMeta} from './meta';
export default function EchoLivePage(props) {
 const ar=props.lang.lang==='ar';
 usePageMeta(ar?'البث المباشر | دي جي خليل':'Live DJ Broadcast | Echo DJ Khalil',ar?'شاهد البث وشارك بعد تسجيل الدخول.':'Sign in to watch DJ Khalil live and join the audience.');
 return <div className="echo-live-page" dir={ar?'rtl':'ltr'}><div className="echo-live-heading"><span className="echo-eyebrow">ECHO / LIVE</span><h1>{ar?'مع خليل. على الهواء.':'LIVE WITH KHALIL.'}</h1><p>{ar?'سجّل الدخول للمشاهدة وطلب الأغاني والتعليق.':'Your seat at the live set. Sign in to watch, request songs and join the conversation.'}</p></div><HomeLiveConsole {...props}/></div>;
}
