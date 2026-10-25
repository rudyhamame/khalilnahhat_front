import {ES18P_SPECS,ES18P_SPEC_SOURCE} from './equipmentSpecs';

const movingHeadSource='https://www.chauvetdj.com/products/intimidator-spot-260x/';
const movingHeadSpecs=[
 {key:'power',label:['LIGHT SOURCE','مصدر الإضاءة'],value:'75 W LED',detail:['Cool white · 50,000-hour rated life','أبيض بارد · عمر مصنّف 50,000 ساعة']},
 {key:'driver',label:['ZOOM / FOCUS','التقريب والتركيز'],value:'12°–17°',detail:['Manual zoom · motorized focus','تقريب يدوي · تركيز بمحرك']},
 {key:'response',label:['PAN / TILT','الحركة الأفقية والعمودية'],value:'540° / 234°',detail:['Selectable movement ranges · Totem mode','نطاقات حركة قابلة للاختيار · وضع Totem']},
 {key:'output',label:['ILLUMINANCE AT 2 M','شدة الإضاءة على بُعد مترين'],value:'17,458 lux',detail:['At 12° · 12,848 lux at 17°','عند 12° · 12,848 لوكس عند 17°']},
 {key:'dsp',label:['CONTROL','التحكم'],value:'8 / 14 DMX',detail:['3-pin XLR · built-in RF · optional RFC / RFC-XL','XLR بثلاثة أطراف · استقبال RF مدمج · RFC / RFC-XL اختياري']},
 {key:'cabinet',label:['COLOUR / EFFECTS','الألوان والمؤثرات'],value:'8 + white',arabicValue:'8 + أبيض',detail:['7 gobos + open · 3-facet prism · 0–20 Hz strobe','7 قوالب + مفتوح · منشور بثلاثة أوجه · وميض 0–20 هرتز']},
 {key:'dimensions',label:['DIMENSIONS · L × W × H','الأبعاد · طول × عرض × ارتفاع'],value:'232 × 163 × 351',detail:['Millimetres · ¼-turn hanging bracket','مليمتر · حامل تعليق بربع لفة']},
 {key:'weight',label:['WEIGHT / POWER INPUT','الوزن والتغذية الكهربائية'],value:'5.6 kg',detail:['100–240 V · 124 W at 120 V / 128 W at 230 V','100–240 فولت · 124 واط عند 120 فولت / 128 واط عند 230 فولت']},
];

export const EQUIPMENT_MODELS={
 es18p:{
  src:'/echo/models/es18p-subwoofer.glb?v=black-2',profile:'/echo/models/es18p-profile.jpg',
  brand:'YORKVILLE / ÉLITE',model:'ES18P',subtitle:['18″ powered subwoofer','ساب ووفر نشط 18 بوصة'],
  specs:ES18P_SPECS,source:ES18P_SPEC_SOURCE,sourceLabel:['Yorkville specifications','مواصفات Yorkville'],
  connections:['XLR input + mono blend + link out · ¼″ link in / out · power, activity & protection LEDs','مدخل XLR + دمج أحادي + مخرج ربط · مدخل ومخرج ¼ بوصة · مؤشرات التشغيل والنشاط والحماية'],
  disclosure:['Illustrative 3D model · manufacturer specifications','مجسم توضيحي · مواصفات الشركة المصنعة'],
 },
 movingheads:{
  src:'/echo/models/intimidator-moving-head.glb?v=2',profile:'/echo/models/intimidator-moving-head-profile.jpg',
  brand:'CHAUVET DJ / INTIMIDATOR',model:'SPOT 260X',subtitle:['Intelligent moving head spot','كشاف متحرك ذكي'],
  specs:movingHeadSpecs,source:movingHeadSource,sourceLabel:['Chauvet specifications','مواصفات Chauvet'],
  connections:['3-pin XLR DMX · powerCON-compatible power in / out · full-colour LCD · RF remote support','تحكم DMX عبر XLR بثلاثة أطراف · مدخل ومخرج طاقة متوافقان مع powerCON · شاشة LCD ملونة · دعم تحكم RF'],
  disclosure:['Photo matched to Spot 260X · illustrative 3D · manufacturer specifications','الصورة مطابقة لـ Spot 260X · مجسم توضيحي · مواصفات الشركة المصنعة'],
 },
};
