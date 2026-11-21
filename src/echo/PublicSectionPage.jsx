import {lazy,Suspense,useEffect} from 'react';
import {EventOrderProvider} from './EventOrderProvider';
import {useEventOrder} from './eventOrderContext';
import {useSeasonalTheme} from './seasonalTheme';
import './publicSectionPage.css';

const HomeLiveConsole=lazy(()=>import('./HomeLiveConsole'));
const HomeAvailability=lazy(()=>import('./HomeAvailability'));
const BookHero=lazy(()=>import('./BookHero'));
const BookingStep=lazy(()=>import('./BookingStep'));
const MusicPreferencesStep=lazy(()=>import('./MusicPreferencesStep'));
const PhaseBar=lazy(()=>import('./BookingPhases').then(module=>({default:module.PhaseBar})));
const PhaseHeading=lazy(()=>import('./BookingPhases').then(module=>({default:module.PhaseHeading})));
const RentalsHero=lazy(()=>import('./RentalsHero'));
const ReferencesSection=lazy(()=>import('./ReferencesSection'));
const AdditionalNotesSection=lazy(()=>import('./AdditionalNotesSection'));
const HomeWorkArchive=lazy(()=>import('./HomeWorkArchive'));
const ServiceVinyl=lazy(()=>import('./ServiceVinyl'));
const HomeBookingAssistant=lazy(()=>import('./HomeBookingAssistant'));
const Room3D=lazy(()=>import('./Room3D'));
const HomeContact=lazy(()=>import('./HomeContact'));
const AboutPage=lazy(()=>import('./AboutPage'));
const SeasonalTree=lazy(()=>import('./SeasonalTree'));

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
 return <Suspense fallback={<div className="echo-section-loading" role="status">Loading…</div>}>{content[section]?.()||null}</Suspense>;
}
export default function PublicSectionPage(props){
 return <EventOrderProvider frameless user={props.user} token={props.token} lang={props.lang} auth={props.auth} isSessionReady={props.isSessionReady} onCreateServiceRequest={props.onCreateServiceRequest}><SectionContent {...props}/></EventOrderProvider>;
}
