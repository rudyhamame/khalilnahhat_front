import {contract,getPath,missingOrderFields} from './eventOrderCore.mjs';
const all=contract.sections.flatMap(section=>section.fields.map(field=>({...field,gate:field.gate??section.gate})));
const definitions=[
 {id:'customer',title:'Personal info',ar:'المعلومات الشخصية',description:'Tell us who we are planning with and how to reach you, so your quote request goes to the right person.',descriptionAr:'أخبرنا مع من نخطط وكيف نصل إليك، ليصل طلب عرض السعر إلى الشخص المناسب.'},
 {id:'event',title:'Event info',ar:'معلومات الفعالية',viewport:'availability',face:'calendar',chapter:'02',description:'Your occasion, date, guests and venue shape everything that follows: the sound, the lighting and the timing of the night.',descriptionAr:'مناسبتك وموعدك وضيوفك ومكانك تحدد كل ما يلي: الصوت والإضاءة وتوقيت السهرة.'},
 {id:'music',title:'DJ Khalil Service',ar:'خدمة دي جي خليل',viewport:'work',chapter:'03',description:'Add DJ Khalil to your event, then share the music you love: languages, genres, special moments and favourite songs.',descriptionAr:'أضف دي جي خليل إلى فعاليتك، ثم شاركنا الموسيقى التي تحبها: اللغات والأنواع واللحظات الخاصة وأغانيك المفضلة.'},
 {id:'equipment',title:'Rental equipments',ar:'معدات التأجير',viewport:'setup',chapter:'04',description:'We rent you the equipment: speakers, lighting and more.',descriptionAr:'نؤجر لك المعدات: مكبرات الصوت والإضاءة وغيرها.'},
 {id:'additional',title:'Additional info',ar:'معلومات إضافية',description:'Inspiration, documents, a voucher and any last notes. Submitting requests a quote; it does not reserve your date.',descriptionAr:'أفكار ومستندات وقسيمة وأي ملاحظات أخيرة. الإرسال يطلب عرض سعر ولا يحجز موعدك.'}
];
// The sections are defined once, here. Goals, the Booking summary and the assistant read their titles and order from this list.
export const bookingStepDefinition=id=>definitions.find(step=>step.id===id)||null;
export const stepLabel=id=>{const step=bookingStepDefinition(id);return [step.title,step.ar];};
export function bookingStepForField(path){
 // MC hosting (and its note) belong to step 3, DJ Khalil Service, with the DJ question.
 if(path==='music.mcRequested'||path==='music.djMc')return 'music';
 if(path==='services')return 'music';
 if(path==='rental.requested')return 'equipment';
 if(path==='equipment'||path?.startsWith('equipment.'))return 'equipment';
 if(path?.startsWith('event.setup.'))return 'equipment';
 if(path?.startsWith('event.'))return 'event';
 if(path?.startsWith('music.'))return 'music';
 if(path?.startsWith('customer.'))return 'customer';
 return 'additional'; // references, notes and the voucher are one step, like the Booking page
}
export function bookingSteps(order){
 // Five sections, exactly the Booking page's steps and names: Personal info, Event info, DJ Khalil Service, Rental equipments, Additional info.
 return definitions.map(step=>({...step,fields:all.filter(field=>bookingStepForField(field.key)===step.id&&(!field.gate||getPath(order,field.gate)===true))}));
}
export function bookingIssueStep(order,issues){const keys=new Set(issues.map(issue=>typeof issue==='string'?issue:issue.key));return bookingSteps(order).find(step=>step.fields.some(field=>keys.has(field.key)))?.id||(keys.has('equipment')?'equipment':'additional');}
export function firstIncompleteStep(order){return bookingIssueStep(order,missingOrderFields(order));}
export function missingViewportFields(order){return missingOrderFields(order).filter(field=>['customer','event'].includes(bookingStepForField(field.key)));}
export const MC_NOTE='MC service requested';
export const djServiceChoice=order=>!order.services?.includes('dj')?'none':String(order.music?.djMc||'').split('\n').includes(MC_NOTE)?'dj_mc':'dj';
export function djServiceChanges(order,choice){
 return [{path:'music.djRequested',value:choice!=='none'}];
}

export function venueSelectionChanges(place){
 const fields={name:String(place.name||'').slice(0,160),address:String(place.address||'').slice(0,240),city:String(place.city||'').slice(0,80),postalCode:place.postalCode||'',country:place.country||'Canada',addressDetails:place.details||null,latitude:place.latitude??null,longitude:place.longitude??null,source:place.source||null,sourceId:place.sourceId||null,sourceAttribution:place.sourceAttribution||null};
 return Object.entries(fields).map(([key,value])=>({path:'event.venue.'+key,value}));
}
