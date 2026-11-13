import {EventOrderProvider} from './EventOrderProvider';
import {useEventOrder} from './eventOrderContext';
import {fitHomepageViewports} from './fitViewport';
import HomeSectionNav from './HomeSectionNav';
import HomeLiveConsole from './HomeLiveConsole';
import HomeAvailability from './HomeAvailability';
import HomeWorkArchive from './HomeWorkArchive';
import ServiceVinyl from './ServiceVinyl';
import HomeBookingAssistant from './HomeBookingAssistant';
import Room3D from './Room3D';
import HomeContact from './HomeContact';
import HomeAbout from './HomeAbout';
import SeasonalTree from './SeasonalTree';
import {useSeasonalTheme} from './seasonalTheme';
import './publicSectionPage.css';

function SectionContent({section,lang,user,token,liveStream,liveSessions,isSessionReady,auth}){
 const order=useEventOrder(),theme=useSeasonalTheme();
 const onPlan=initial=>{if(initial===null){order.closeEditor();return;}order.begin(order.order.source,initial);order.openEditor();};
 const content={
  live:()=> <HomeLiveConsole lang={lang} user={user} token={token} liveStream={liveStream} liveSessions={liveSessions} isSessionReady={isSessionReady}/>,
  availability:()=> <HomeAvailability lang={lang}/>,
  work:()=> <HomeWorkArchive lang={lang}/>,
  setup:()=> <ServiceVinyl lang={lang} onPlan={onPlan}/>,
  assistant:()=> <HomeBookingAssistant lang={lang} user={user} token={token} auth={auth}/>,
  room:()=> <Room3D lang={lang}/>,
  contact:()=> <HomeContact lang={lang}/>,
  about:()=> <HomeAbout lang={lang}/>,
  tree:()=> <SeasonalTree standalone ar={lang.lang==='ar'} reviews={[]} media={[]} loading={false} lights={theme.lights} audio={theme.audio} photoIds={theme.photoIds}/>,
 };
 return <div className="echo-public-page" data-section={section}><HomeSectionNav ar={lang.lang==='ar'}/>{fitHomepageViewports(<>{content[section]?.()}</>)}</div>;
}
export default function PublicSectionPage(props){
 return <EventOrderProvider user={props.user} token={props.token} lang={props.lang} auth={props.auth} isSessionReady={props.isSessionReady} onCreateServiceRequest={props.onCreateServiceRequest}><SectionContent {...props}/></EventOrderProvider>;
}
