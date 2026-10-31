// Follow actual tool activity by navigating the existing dashboard. No extra
// window, overlay, synthetic cursor, or element highlighting is involved.
const followed=new Set();
const navigationRoutes={
 recordings:'/admin/echo?tab=music-archive',collections:'/admin/echo?tab=music-archive','work-elements':'/admin/echo?tab=work-elements',
 'dj-work-type':'/admin/echo?tab=dj-work-type','dj-service-builder':'/admin/dj-service-builder','live-stream':'/admin/live-stream','live-archive':'/admin/echo?tab=live-archive',
 clients:'/admin/clients',bookings:'/admin/services',testimonials:'/admin/echo?tab=testimonials',meetings:'/admin/echo?tab=meetings',youtube:'/admin/youtube',gallery:'/admin/echo?tab=gallery',
 prices:'/admin/prices',transactions:'/admin/transactions',availability:'/admin/echo?tab=availability',vouchers:'/admin/echo?tab=vouchers',
 'ai-administrator':'/admin/echo?tab=ai-administrator','ai-configuration':'/admin/echo?tab=ai-configuration','ai-billing':'/admin/echo?tab=ai-billing','seasonal-theme':'/admin/echo?tab=seasonal-theme',
};
export function publishAdministratorActivity(task,{historical=false}={}){
 if(historical||!task||!/^\/admin(?:\/|$)/.test(window.location.pathname))return;
 const keyFor=action=>task._id+':'+action.id;
 // Explicit open-tab requests work even when automatic follow-work is disabled.
 // Only a verified, allowlisted navigation receipt can select a route.
 const navigation=(task.actions||[]).findLast(action=>action.name==='administrator_open_section'&&action.state==='VERIFIED'&&Object.hasOwn(navigationRoutes,action.result?.data?.navigation?.section)&&!followed.has(keyFor(action)));
 let action=navigation,destination;
 if(navigation)destination={url:navigationRoutes[navigation.result.data.navigation.section]};
 else{
  try{if(localStorage.getItem('echo-admin-follow-work')==='false')return;}catch{}
  action=task.actions?.at(-1);if(!action?.id||action.name==='administrator_open_section')return;
  destination=administratorDestination(action.name);
 }
 if(!action?.id||!destination)return;
 const key=keyFor(action);if(followed.has(key))return;
 followed.add(key);if(followed.size>1000)followed.delete(followed.values().next().value);
 if(window.location.pathname+window.location.search===destination.url)return;
 window.history.pushState({},'',destination.url);window.dispatchEvent(new PopStateEvent('popstate'));
}

const archive={url:'/admin/echo?tab=music-archive',label:'Recordings'};
const elements={url:'/admin/echo?tab=work-elements',label:'Work Elements'};
export function administratorDestination(name=''){
 if(name.startsWith('music_vocabulary'))return elements;
 if(name.startsWith('music_collection'))return {...archive,label:'Collections'};
 if(name.startsWith('music_')||name.startsWith('player_playlist'))return archive;
 const routes=[[/^(customers?|customer_)/,'/admin/clients','Registered clients'],[/^(bookings?|booking_|confirmed_bookings)/,'/admin/services','Booking requests'],[/^transactions_/,'/admin/transactions','Transactions'],[/^(prices?_|equipment_|catalog_)/,'/admin/prices','Events, Services & Equipment'],[/^testimonial/,'/admin/echo?tab=testimonials','Testimonials'],[/^media_/,'/admin/echo?tab=gallery','Gallery'],[/^meetings_/,'/admin/echo?tab=meetings','Meetings'],[/^theme_/,'/admin/echo?tab=seasonal-theme','Seasonal theme'],[/^ai_configuration_/,'/admin/echo?tab=ai-configuration','AI configuration'],[/^live_archive_/,'/admin/echo?tab=live-archive','Live archive'],[/^events_/,'/admin/live-stream','Live stream']];
 const found=routes.find(([pattern])=>pattern.test(name));
 return found?{url:found[1],label:found[2]}:null;
}
