import {EventOrderProvider} from './EventOrderProvider';
import {useEventOrder} from './eventOrderContext';
import HomeSectionNav from './HomeSectionNav';
import HomeLiveConsole from './HomeLiveConsole';
import HomeAvailability from './HomeAvailability';
import BookHero from './BookHero';
import RentalsHero from './RentalsHero';
import RentalsSoFar from './RentalsSoFar';
import SpecialRequests from './SpecialRequests';
import HomeWorkArchive from './HomeWorkArchive';
import ServiceVinyl from './ServiceVinyl';
import HomeBookingAssistant from './HomeBookingAssistant';
import Room3D from './Room3D';
import HomeContact from './HomeContact';
import AboutPage from './AboutPage';
import SeasonalTree from './SeasonalTree';
import {useSeasonalTheme} from './seasonalTheme';
import './publicSectionPage.css';

function SectionContent({section,lang,user,token,liveStream,liveSessions,isSessionReady,auth}){
 const order=useEventOrder(),theme=useSeasonalTheme();
 const onPlan=initial=>{if(initial===null){order.closeEditor();return;}order.begin(order.order.source,initial);order.openEditor();};
 const content={
  live:()=> <HomeLiveConsole lang={lang} user={user} token={token} liveStream={liveStream} liveSessions={liveSessions} isSessionReady={isSessionReady}/>,
  availability:()=> <><BookHero ar={lang.lang==='ar'}/><HomeAvailability lang={lang}/></>,
  work:()=> <HomeWorkArchive lang={lang}/>,
  setup:()=> <><RentalsHero ar={lang.lang==='ar'}/><ServiceVinyl lang={lang} onPlan={onPlan}/><SpecialRequests ar={lang.lang==='ar'}/><RentalsSoFar ar={lang.lang==='ar'}/></>,
  assistant:()=> <HomeBookingAssistant overlay lang={lang} user={user} token={token} auth={auth}/>,
  room:()=> <Room3D lang={lang}/>,
  contact:()=> <HomeContact lang={lang}/>,
  about:()=> <AboutPage lang={lang}/>,
  tree:()=> <SeasonalTree standalone ar={lang.lang==='ar'} reviews={[]} media={[]} loading={false} lights={theme.lights} audio={theme.audio} photoIds={theme.photoIds}/>,
 };
 return <><HomeSectionNav ar={lang.lang==='ar'}/>{content[section]?.()}</>;
}
export default function PublicSectionPage(props){
 return <EventOrderProvider frameless user={props.user} token={props.token} lang={props.lang} auth={props.auth} isSessionReady={props.isSessionReady} onCreateServiceRequest={props.onCreateServiceRequest}><SectionContent {...props}/></EventOrderProvider>;
}
