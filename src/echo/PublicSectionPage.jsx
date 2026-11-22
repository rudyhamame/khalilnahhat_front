import {lazy,Suspense,useEffect} from 'react';
import {useTreeSteps} from '../lib/tree';
import {EventOrderProvider} from './EventOrderProvider';
import {useEventOrder} from './eventOrderContext';
import {useSeasonalTheme} from './seasonalTheme';
import './publicSectionPage.css';

const HomeLiveConsole=lazy(()=>import('./HomeLiveConsole'));
const HomeAvailability=lazy(()=>import('./HomeAvailability'));
const BookHero=lazy(()=>import('./BookHero'));
const MusicPreferencesStep=lazy(()=>import('./MusicPreferencesStep'));
const PhaseBar=lazy(()=>import('./BookingPhases').then(module=>({default:module.PhaseBar})));
const PhaseHeading=lazy(()=>import('./BookingPhases').then(module=>({default:module.PhaseHeading})));
const RentalsHero=lazy(()=>import('./RentalsHero'));
const ReferencesSection=lazy(()=>import('./ReferencesSection'));
const AdditionalNotesSection=lazy(()=>import('./AdditionalNotesSection'));
const RentalQuestion=lazy(()=>import('./RentalQuestion'));
const BookingFooter=lazy(()=>import('./BookingFooter'));
const HomeWorkArchive=lazy(()=>import('./HomeWorkArchive'));
const ServiceVinyl=lazy(()=>import('./ServiceVinyl'));
const HomeBookingAssistant=lazy(()=>import('./HomeBookingAssistant'));
const Room3D=lazy(()=>import('./Room3D'));
const HomeContact=lazy(()=>import('./HomeContact'));
const AboutPage=lazy(()=>import('./AboutPage'));
const SeasonalTree=lazy(()=>import('./SeasonalTree'));

function SectionContent({section,lang,user,token,liveStream,liveSessions,isSessionReady,auth}){
 const order=useEventOrder(),theme=useSeasonalTheme(),steps=useTreeSteps();
 const onPlan=initial=>{if(initial===null){order.closeEditor();return;}order.begin(order.order.source,initial);order.openEditor();};
 const ar=lang.lang==='ar';
 // The equipment explorer opens when the client answers yes to the rental question (or already chose equipment, or arrives from a link to a rental field).
 const rentalOpen=order.order?.rental?.requested===true||order.order?.equipment?.length>0||order.order?.services?.some(id=>!['dj','mc'].includes(id))||/^[?&]field=(equipment|services|rental)/.test(window.location.search.replace('?','&').replace(/^&/,'?'));
 // Event details and services are one continuous booking page (/booking and /rentals show the same page).
 const bookAndServices=()=> <><PhaseBar ar={ar}/><BookHero ar={ar}/><HomeAvailability lang={lang}/>{steps.dj&&<><PhaseHeading id="dj" ar={ar}/><div className="booking-services" dir={ar?'rtl':'ltr'}><RentalsHero ar={ar}/></div><MusicPreferencesStep ar={ar}/></>}{steps.rental&&<><PhaseHeading id="rental" ar={ar}/><RentalQuestion ar={ar}/>{rentalOpen&&<div className="booking-services rental-services-stack" dir={ar?'rtl':'ltr'}><Suspense fallback={null}><ServiceVinyl lang={lang} onPlan={onPlan}/></Suspense></div>}</>}<PhaseHeading id="additional" ar={ar}/><ReferencesSection ar={ar}/><AdditionalNotesSection ar={ar}/></>;
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
 // The booking footer belongs to the Booking page (/booking) only, not /rentals or /echo-ai.
 return <Suspense fallback={null}>{content[section]?.()||null}{section==='availability'&&<BookingFooter ar={lang.lang==='ar'}/>}</Suspense>;
}
export default function PublicSectionPage(props){
 return <EventOrderProvider frameless user={props.user} token={props.token} lang={props.lang} auth={props.auth} isSessionReady={props.isSessionReady} onCreateServiceRequest={props.onCreateServiceRequest}><SectionContent {...props}/></EventOrderProvider>;
}
