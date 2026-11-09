// Stable homepage destinations. Model output can select a key, never a URL or CSS selector.
export const APP_VIEWPORT_TARGETS=Object.freeze({home:'.echo-artist-sequence',tree:'.seasonal-tree-viewport',work:'#khalil-work-archive',availability:'#availability',music:'#khalil-work-archive',setup:'#services',simulation:'#services',booking:'#event-order-panel',live:'#live',assistant:'#echo-ai',contact:'#contact',about:'#about-dj-khalil'});
export function bookingFieldSection(path){
 if(path?.startsWith('customer.')||path?.startsWith('references.')||path?.startsWith('planning.')||path?.startsWith('additional.'))return 'booking';
 if(['music.mcRequested','music.djMc','rental.requested'].includes(path))return 'setup';
 return ['event.type','event.guestCount','event.date','event.startTime','event.endTime'].includes(path)?'availability':path?.startsWith('music.')?'work':path==='services'||path?.startsWith('equipment')||path?.startsWith('venue.')||path?.startsWith('event.')||path?.startsWith('additional.')?'setup':null;
}
export function scrollToAppSection(section,{source='booking',face}={}){
 if(!Object.hasOwn(APP_VIEWPORT_TARGETS,section))return {shown:false,reason:'unknown_section'};
 const element=section==='tree'?(document.querySelector(APP_VIEWPORT_TARGETS.tree)||document.querySelector(APP_VIEWPORT_TARGETS.home)):document.querySelector(APP_VIEWPORT_TARGETS[section]);
 if(!element||!element.getClientRects().length)return {shown:false,section,reason:'section_unavailable'};
 if(document.querySelector('dialog[open],#echo-navigation.is-open,.event-order-layout.is-reviewing'))return {shown:false,section,reason:'another_view_open'};
 if(section==='availability'&&['calendar','venue'].includes(face))window.dispatchEvent(new CustomEvent('echo:availability-face',{detail:face}));
 // The work and archive share one chapter; this picks which face it shows.
 if(section==='work'||section==='music')window.dispatchEvent(new CustomEvent('echo:work-archive-face',{detail:section}));
 if(section==='setup'||section==='simulation')window.dispatchEvent(new CustomEvent('echo:rental-face',{detail:section==='simulation'?'simulation':'explorer'}));
 if(section==='booking'){element.scrollIntoView({block:'nearest',behavior:'smooth'});return {shown:true,section};}
 const header=Math.max(0,document.querySelector('.echo-header')?.getBoundingClientRect().bottom||0);
 if(section!=='tree'&&Math.abs(element.getBoundingClientRect().top-header)<12)return {shown:true,section,alreadyVisible:true};
 // The existing chapter controller owns easing and cancellation; ordinary pages retain a native fallback.
 const event=new CustomEvent('echo:viewport-navigate',{cancelable:true,detail:{section,source}});
 window.dispatchEvent(event);
 if(!event.defaultPrevented)window.scrollTo({top:section==='home'?0:section==='tree'?Math.max(0,window.scrollY+element.getBoundingClientRect().bottom-window.innerHeight):Math.max(0,window.scrollY+element.getBoundingClientRect().top-header),behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 return {shown:true,section};
}
// Booking answers share the event order; this only moves the page to their visual context.
export function scrollToBookingField(path,options={}){
 let section=bookingFieldSection(path);if(path?.startsWith('event.venue.')){section='availability';window.dispatchEvent(new CustomEvent('echo:availability-face',{detail:'venue'}));}else if(path?.startsWith('event.setup.'))section='simulation';else if(['event.type','event.guestCount','event.date','event.startTime','event.endTime'].includes(path))window.dispatchEvent(new CustomEvent('echo:availability-face',{detail:'calendar'}));
 if(path==='services'){let value=options.value;try{if(typeof value==='string')value=JSON.parse(value);}catch{}if(Array.isArray(value)&&value.length===1&&value[0]==='dj')section='work';}if(!section)return {shown:false,reason:'no_visual_field'};
 window.dispatchEvent(new CustomEvent('echo:booking-field-focus',{detail:{path}}));
 if(section==='booking'&&!options.keepAssistant)window.dispatchEvent(new CustomEvent('echo:booking-form-show'));
 if(section==='booking'&&!options.keepAssistant)requestAnimationFrame(()=>{const field=[...document.querySelectorAll('[data-field]')].find(node=>node.dataset.field===path);field?.scrollIntoView({block:'center',behavior:'smooth'});});
 return scrollToAppSection(section,options);
}
