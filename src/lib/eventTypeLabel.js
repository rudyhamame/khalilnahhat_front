// The draft stores the event type as an id ("wedding"); people should see its name ("Wedding").
const LABELS={wedding:['Wedding','عرس'],engagement:['Engagement','خطوبة'],birthday:['Birthday','عيد ميلاد'],corporate:['Corporate Event','فعالية شركة'],party:['Private Party','حفلة خاصة'],graduation:['Graduation','تخرج'],other:['Other','أخرى']};
export const eventTypeLabel=(type,ar=false)=>type?(LABELS[type]?.[ar?1:0]||String(type).charAt(0).toLocaleUpperCase()+String(type).slice(1)):'';
