import {useEffect} from 'react';
import {EventOrderProvider} from './EventOrderProvider';
import {useEventOrder} from './eventOrderContext';
import HomeLiveConsole from './HomeLiveConsole';
import HomeAvailability from './HomeAvailability';
import BookHero from './BookHero';
import BookingStep from './BookingStep';
import MusicPreferencesStep from './MusicPreferencesStep';
import {PhaseBar,PhaseHeading} from './BookingPhases';
import RentalsHero from './RentalsHero';
import ReferencesSection from './ReferencesSection';
import AdditionalNotesSection from './AdditionalNotesSection';
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
 const ar=lang.lang==='ar';
 // Event details and services are one continuous booking page (/booking and /rentals show the same page).
 const bookAndServices=()=> <><PhaseBar ar={ar}/><BookHero ar={ar}/><HomeAvailability lang={lang}/><PhaseHeading id="dj" ar={ar}/><div className="booking-services" dir={ar?'rtl':'ltr'}><RentalsHero ar={ar}/></div><MusicPreferencesStep ar={ar}/><PhaseHeading id="rental" ar={ar}/><div className="booking-services" dir={ar?'rtl':'ltr'}><BookingStep number={7} className="workbench-step" title={ar?'ماذا تحتاج فعاليتك؟':'What does your event need?'} cardTitle={ar?'الخدمات والمعدات':'Services & equipment'} copy={ar?'اختر خدمة لترى معداتها. اختر ما يعجبك لينضم إلى حجزك.':'Choose a service to see its equipment. Pick what you like and it joins your booking.'}><ServiceVinyl lang={lang} onPlan={onPlan}/></BookingStep></div><PhaseHeading id="additional" ar={ar}/><ReferencesSection ar={ar}/><AdditionalNotesSection ar={ar}/></>;
 useEffect(()=>{if(section!=='setup')return undefined;const go=()=>document.querySelector('.dj-service-step')?.scrollIntoView({block:'start'});const frame=requestAnimationFrame(go),later=setTimeout(go,900);return()=>{cancelAnimationFrame(frame);clearTimeout(later);};},[section]);// the page above keeps loading, so scroll again once it settles
 const content={
  live:()=> <HomeLiveConsole overlay lang={lang} user={user} token={token} liveStream={liveStream} liveSessions={liveSessions} isSessionReady={isSessionReady}/>,
  availability:()=>bookAndServices(),
  work:()=> <HomeWorkArchive lang={lang}/>,
  setup:()=>bookAndServices(),
  assistant:()=> <HomeBookingAssistant overlay lang={lang} user={user} token={token} auth={auth}/>,
  room:()=> <Room3D overlay lang={lang}/>,
  contact:()=> <HomeContact lang={lang}/>,
  about:()=> <AboutPage lang={lang}/>,
  tree:()=> <SeasonalTree standalone ar={lang.lang==='ar'} reviews={[]} media={[]} loading={false} lights={theme.lights} audio={theme.audio} photoIds={theme.photoIds}/>,
 };
 return content[section]?.()||null;
}
export default function PublicSectionPage(props){
 return <EventOrderProvider frameless user={props.user} token={props.token} lang={props.lang} auth={props.auth} isSessionReady={props.isSessionReady} onCreateServiceRequest={props.onCreateServiceRequest}><SectionContent {...props}/></EventOrderProvider>;
}
