import {contract,getPath,missingOrderFields} from './eventOrderCore.mjs';
const all=contract.sections.flatMap(section=>section.fields.map(field=>({...field,gate:section.gate})));
const definitions=[
 {id:'customer',title:'Personal Information',ar:'المعلومات الشخصية',description:'Check your contact details before submitting your quote request.',descriptionAr:'راجع معلومات التواصل قبل إرسال طلب عرض السعر.'},
 {id:'event',title:'Set up your event',ar:'جهّز فعاليتك',viewport:'availability',face:'calendar',chapter:'02',description:'Choose your date, time and event type. Times are in Toronto; an end after midnight is supported.',descriptionAr:'اختر الموعد والوقت ونوع الفعالية. التوقيت بتوقيت تورونتو ويمكن الانتهاء بعد منتصف الليل.'},
 {id:'venue',title:'Venue details',ar:'تفاصيل المكان',viewport:'availability',face:'venue',chapter:'02',description:'Use the same venue details as the map, including the address, GTA area and indoor or outdoor setting.',descriptionAr:'تفاصيل المكان نفسها المستخدمة على الخريطة، بما فيها العنوان والمنطقة وإعداد الداخل أو الخارج.'},
 {id:'music',title:'DJ Khalil service',ar:'خدمة دي جي خليل',viewport:'work',chapter:'03',description:'Choose DJ only or DJ + MC, then add any music preferences. Music preferences are optional.',descriptionAr:'اختر خدمة الدي جي فقط أو مع المذيع ثم أضف تفضيلات الموسيقى الاختيارية.'},
 {id:'equipment',title:'Rental services & equipment',ar:'الخدمات والمعدات للإيجار',viewport:'setup',chapter:'04',description:'Services, individual equipment and complete sets share your selection with the rental explorer. Stock remains subject to confirmation for your event date.',descriptionAr:'الخدمات والمعدات والمجموعات تشترك في اختياراتك مع مستكشف الإيجار. يُؤكد التوفر لتاريخ فعاليتك.'},
 {id:'references',title:'Extras & review',ar:'إضافات ومراجعة',description:'Add optional references, notes and a voucher. Submitting requests a quote; it does not reserve your date.',descriptionAr:'أضف المراجع والملاحظات والقسيمة الاختيارية. الإرسال يطلب عرض سعر ولا يحجز الموعد.'},
];
export function bookingStepForField(path){
 if(path==='services'||path==='equipment'||path?.startsWith('equipment.'))return 'equipment';
 if(path?.startsWith('event.venue.')||path?.startsWith('event.setup.'))return 'venue';
 if(path?.startsWith('event.'))return 'event';
 if(path?.startsWith('music.'))return 'music';
 if(path?.startsWith('customer.'))return 'customer';
 return 'references';
}
export function bookingSteps(order){
 return definitions.map(step=>({...step,fields:all.filter(field=>bookingStepForField(field.key)===step.id&&(!field.gate||getPath(order,field.gate)===true))}));
}
export function bookingIssueStep(order,issues){const keys=new Set(issues.map(issue=>typeof issue==='string'?issue:issue.key));return bookingSteps(order).find(step=>step.fields.some(field=>keys.has(field.key)))?.id||(keys.has('equipment')?'equipment':'references');}
export function firstIncompleteStep(order){return bookingIssueStep(order,missingOrderFields(order));}
export function missingViewportFields(order){return missingOrderFields(order).filter(field=>['event','venue'].includes(bookingStepForField(field.key)));}
export const MC_NOTE='MC service requested';
export const djServiceChoice=order=>!order.services?.includes('dj')?'none':String(order.music?.djMc||'').split('\n').includes(MC_NOTE)?'dj_mc':'dj';
export function djServiceChanges(order,choice){
 const services=(order.services||[]).filter(id=>id!=='dj'),notes=String(order.music?.djMc||'').split('\n').filter(line=>line&&line!==MC_NOTE);
 if(choice!=='none')services.push('dj');if(choice==='dj_mc')notes.push(MC_NOTE);
 return [{path:'services',value:services},{path:'music.djMc',value:notes.join('\n')}];
}

export function venueSelectionChanges(place,area){
 const fields={name:String(place.name||'').slice(0,160),address:String(place.address||'').slice(0,240),city:String(place.city||'').slice(0,80),postalCode:place.postalCode||'',country:place.country||'Canada',addressDetails:place.details||null,latitude:place.latitude??null,longitude:place.longitude??null,source:place.source||null,sourceId:place.sourceId||null,sourceAttribution:place.sourceAttribution||null,area};
 return Object.entries(fields).map(([key,value])=>({path:'event.venue.'+key,value}));
}
