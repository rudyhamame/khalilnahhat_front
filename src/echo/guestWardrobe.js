// Guests are rigged character models (public/echo/models/guests); the dress code picks which ones appear (see POOLS in setupSimulationEngine.js).
export const GUEST_DRESS_CODES=[
 {id:'formal',en:'Formal',ar:'رسمي'},
 {id:'smart-casual',en:'Smart casual',ar:'أنيق غير رسمي'},
 {id:'casual',en:'Casual',ar:'كاجوال'},
];
export const normalizeGuestDressCode=value=>GUEST_DRESS_CODES.some(option=>option.id===value)?value:'smart-casual';
