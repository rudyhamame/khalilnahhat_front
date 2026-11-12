// Labels for song moments saved by older drafts as ids (for example "first-dance"); new moments come from the admin's Work Elements.
export const SONG_PHASES=[['intro','Intro','مقدمة'],['entrance','Entrance','الدخول'],['first-dance','First dance','الرقصة الأولى'],['dinner','Dinner','العشاء'],['cake-cutting','Cake cutting','قطع الكيكة'],['party','Party','الحفلة'],['slow-dance','Slow dance','رقصة هادئة'],['outro','Outro','الختام']];
export const optionLabel=(list,id,ar)=>{const row=list.find(item=>item[0]===id);return row?row[ar?2:1]:id;};
