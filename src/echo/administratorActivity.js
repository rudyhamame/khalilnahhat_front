// Follow actual tool activity by navigating the existing dashboard. No extra
// window, overlay, synthetic cursor, or element highlighting is involved.
const followed=new Set();
export function publishAdministratorActivity(task,{historical=false}={}){
 if(historical||!task)return;
 try{if(localStorage.getItem('echo-admin-follow-work')==='false')return;}catch{}
 const action=task.actions?.at(-1);if(!action?.id)return;
 const key=task._id+':'+action.id;if(followed.has(key))return;
 followed.add(key);if(followed.size>1000)followed.delete(followed.values().next().value);
 const destination=administratorDestination(action.name);if(!destination)return;
 if(window.location.pathname+window.location.search===destination.url)return;
 if(!/^\/admin(?:\/|$)/.test(window.location.pathname))return;
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
