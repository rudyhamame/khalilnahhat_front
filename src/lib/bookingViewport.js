// Stable homepage destinations. Model output can select a key, never a URL or CSS selector.
export const APP_VIEWPORT_TARGETS=Object.freeze({home:'.echo-artist-sequence',work:'#khalil-work',availability:'#availability',music:'#home-music-archive',setup:'#services',live:'#live',about:'#about-dj-khalil'});
export function bookingFieldSection(path){
 return ['event.date','event.startTime','event.endTime'].includes(path)?'availability':path?.startsWith('music.')?'music':path==='services'||path?.startsWith('equipment')||path?.startsWith('venue.')||path?.startsWith('event.')||path?.startsWith('additional.')?'setup':null;
}
export function scrollToAppSection(section,{source='booking'}={}){
 if(!Object.hasOwn(APP_VIEWPORT_TARGETS,section))return {shown:false,reason:'unknown_section'};
 const element=document.querySelector(APP_VIEWPORT_TARGETS[section]);
 if(!element||!element.getClientRects().length)return {shown:false,section,reason:'section_unavailable'};
 if(document.querySelector('dialog[open],#echo-navigation.is-open,.event-order-layout.is-reviewing'))return {shown:false,section,reason:'another_view_open'};
 const header=Math.max(0,document.querySelector('.echo-header')?.getBoundingClientRect().bottom||0);
 if(Math.abs(element.getBoundingClientRect().top-header)<12)return {shown:true,section,alreadyVisible:true};
 // The existing chapter controller owns easing and cancellation; ordinary pages retain a native fallback.
 const event=new CustomEvent('echo:viewport-navigate',{cancelable:true,detail:{section,source}});
 window.dispatchEvent(event);
 if(!event.defaultPrevented)window.scrollTo({top:section==='home'?0:Math.max(0,window.scrollY+element.getBoundingClientRect().top-header),behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 return {shown:true,section};
}
// Booking answers share the event order; this only moves the page to their visual context.
export function scrollToBookingField(path,options={}){
 const section=bookingFieldSection(path);if(!section)return {shown:false,reason:'no_visual_field'};
 window.dispatchEvent(new CustomEvent('echo:booking-field-focus',{detail:{path}}));
 return scrollToAppSection(section,options);
}
