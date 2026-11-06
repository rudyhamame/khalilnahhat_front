const numberWords={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,واحد:1,واحدة:1,اثنين:2,اثنان:2,اثنتين:2,ثلاث:3,ثلاثة:3,اربع:4,اربعة:4,خمس:5,خمسة:5};
export function explicitEquipmentQuantities(text){
 let value=String(text||'').toLowerCase().replace(/[٠-٩]/g,digit=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/[\u064b-\u065f]/g,'');
 // Numbers identifying catalog entries, dates, times and guests are not counts.
 value=value.replace(/\b\d+\.\d+\b/gu,' ').replace(/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}:\d{2}\b/gu,' ').replace(/(?:service|equipment|item|tag|number|الخدمة|خدمة|المعدة|معدة|رقم)\s*#?\s*\d+/giu,' ').replace(/\d+\s*(?:guests?|people|ضيوف|ضيف|شخص)/giu,' ');
 value=value.replace(/[.!?,؟،;؛]/gu,' ');
 const counts=[];
 for(const match of value.matchAll(/(?:^|\s)(\d+)(?=\s|$)|(?:×|\bx)\s*(\d+)/gu))counts.push(Number(match[1]||match[2]));
 for(const word of value.split(/\s+/u))if(numberWords[word])counts.push(numberWords[word]);
 return [...new Set(counts.filter(count=>Number.isSafeInteger(count)&&count>0))];
}
