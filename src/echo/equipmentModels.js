import {cloudAsset} from '../lib/cloudAsset';
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
 'co2-gun':{
  youtube:'https://www.youtube.com/watch?v=Lf7JjivCK78',
  src:cloudAsset('/echo/models/co2-gun.glb'),profile:cloudAsset('/echo/models/co2-gun-reference.webp'),
  brand:'MOKA SFX / EFFECTS',model:'CO₂ GUN WITH TANK',subtitle:['Handheld CO₂ effects set','طقم مؤثرات CO₂ محمول'],
  specs:[{"key": "power", "label": ["EQUIPMENT", "المعدات"], "value": "CO₂ effects gun", "arabicValue": "مسدس مؤثرات CO₂", "detail": ["Handheld barrel from supplied photo", "أنبوب محمول من الصورة المرفقة"]}, {"key": "driver", "label": ["BARREL", "الأنبوب"], "value": "Open cylindrical outlet", "arabicValue": "مخرج أسطواني مفتوح", "detail": ["Long black barrel with rear vents", "أنبوب أسود طويل بفتحات خلفية"]}, {"key": "response", "label": ["HANDLING", "الحمل"], "value": "Dual grips", "arabicValue": "مقبضان", "detail": ["Front grip and rear trigger handle", "مقبض أمامي ومقبض خلفي بالزناد"]}, {"key": "output", "label": ["MARKING", "الوسم"], "value": "MOKA SFX", "arabicValue": "MOKA SFX", "detail": ["Brand marking visible in photo", "العلامة الظاهرة في الصورة"]}, {"key": "dsp", "label": ["CONNECTION", "التوصيل"], "value": "Supply hose", "arabicValue": "خرطوم تغذية", "detail": ["Hose connects gun and tank", "خرطوم يصل المسدس بالخزان"]}, {"key": "cabinet", "label": ["TANK", "الخزان"], "value": "Generic cylinder", "arabicValue": "أسطوانة عامة", "detail": ["Illustrative tank; not shown in reference", "خزان توضيحي غير ظاهر في الصورة"]}, {"key": "dimensions", "label": ["DIMENSIONS", "الأبعاد"], "value": "Not supplied", "arabicValue": "غير متوفرة", "detail": ["Model proportions are illustrative", "أبعاد المجسم توضيحية"]}, {"key": "weight", "label": ["OPERATING RATINGS", "مواصفات التشغيل"], "value": "Not verified", "arabicValue": "غير مؤكدة", "detail": ["Tank capacity, pressure and output unverified", "لم يتم التحقق من سعة الخزان والضغط والإخراج"]}],
  source:cloudAsset('/echo/models/co2-gun-reference.webp'),sourceLabel:['View reference photo','عرض الصورة المرجعية'],
  disclosure:['Photo-guided gun with illustrative generic tank','مسدس مبني على الصورة مع خزان عام توضيحي'],
 },

 'smoke':{
  src:cloudAsset('/echo/models/smoke.glb'),profile:cloudAsset('/echo/models/smoke-reference.jpg'),
  cameraOrbit:'-25deg 60deg 95%',thumbnailOrbit:'-25deg 60deg 105%',
  brand:'ECHO / SPECIAL EFFECTS',model:'SMOKE MACHINE',subtitle:['Upright smoke effects unit','جهاز مؤثرات دخان عمودي'],
  specs:[{"key": "power", "label": ["FORMAT", "التصميم"], "value": "Upright output", "arabicValue": "إخراج عمودي", "detail": ["Top-mounted smoke outlet", "مخرج دخان علوي"]}, {"key": "driver", "label": ["ILLUMINATION", "الإضاءة"], "value": "Red LED ring", "arabicValue": "حلقة LED حمراء", "detail": ["Lenses around the outlet", "عدسات حول المخرج"]}, {"key": "response", "label": ["HOUSING", "الهيكل"], "value": "Black metal", "arabicValue": "معدن أسود", "detail": ["Low rectangular enclosure", "هيكل مستطيل منخفض"]}, {"key": "output", "label": ["COOLING", "التبريد"], "value": "Slotted grille", "arabicValue": "شبكة بفتحات", "detail": ["Front ventilation slots", "فتحات تهوية أمامية"]}, {"key": "dsp", "label": ["RESERVOIR", "الخزان"], "value": "Top fluid tank", "arabicValue": "خزان سائل علوي", "detail": ["Cap and feed hose visible", "غطاء وخرطوم تغذية ظاهران"]}, {"key": "cabinet", "label": ["HANDLING", "الحمل"], "value": "Side brackets", "arabicValue": "مقابض جانبية", "detail": ["Raised metal carry handles", "مقابض حمل معدنية مرتفعة"]}, {"key": "dimensions", "label": ["DIMENSIONS", "الأبعاد"], "value": "Not supplied", "arabicValue": "غير متوفرة", "detail": ["Model proportions are illustrative", "أبعاد المجسم توضيحية"]}, {"key": "weight", "label": ["OPERATING RATINGS", "مواصفات التشغيل"], "value": "Not verified", "arabicValue": "غير مؤكدة", "detail": ["Power, output and fluid type unverified", "لم يتم التحقق من القدرة والإخراج ونوع السائل"]}],
  source:cloudAsset('/echo/models/smoke-reference.jpg'),sourceLabel:['View reference photo','عرض الصورة المرجعية'],
  disclosure:['Illustrative model based on supplied photo','مجسم توضيحي مبني على الصورة المرفقة'],
 },

 'led-screen':{
  src:'/echo/models/led-wall-3x2.glb',profile:cloudAsset('/echo/models/led-screen-reference.webp'),
  brand:'ECHO / VISUALS',model:'LED SCREEN',subtitle:['Six-panel LED wall · 3 × 2','جدار LED من ست لوحات · 3 × 2'],
  specs:[{"key": "power", "label": ["FORMAT", "التصميم"], "value": "6 panels · 3 × 2", "arabicValue": "6 لوحات · 3 × 2", "detail": ["Three columns, two rows, one image", "ثلاثة أعمدة وصفان وصورة واحدة"]}, {"key": "driver", "label": ["DISPLAY FACE", "واجهة العرض"], "value": "One shared image", "arabicValue": "صورة واحدة مشتركة", "detail": ["The logo spans all six panels", "الشعار يمتد عبر اللوحات الست"]}, {"key": "response", "label": ["REAR FINISH", "تشطيب الخلفية"], "value": "Dark charcoal", "arabicValue": "فحمي داكن", "detail": ["Raised diagonal cabinet ribs", "أضلاع خلفية قطرية بارزة"]}, {"key": "output", "label": ["FRAME", "الإطار"], "value": "Silver edge rails", "arabicValue": "حواف فضية", "detail": ["Slim metal cabinet edges", "حواف معدنية رفيعة"]}, {"key": "dsp", "label": ["HANDLING", "الحمل"], "value": "Recessed handle", "arabicValue": "مقبض غائر", "detail": ["Carry grip on rear panel", "مقبض حمل خلفي"]}, {"key": "cabinet", "label": ["HARDWARE", "المكونات"], "value": "Rear ribs", "arabicValue": "أضلاع خلفية", "detail": ["Three ribs and a handle per panel", "ثلاثة أضلاع ومقبض لكل لوحة"]}, {"key": "dimensions", "label": ["DIMENSIONS", "الأبعاد"], "value": "Not supplied", "arabicValue": "غير متوفرة", "detail": ["Model proportions are illustrative", "أبعاد المجسم توضيحية"]}, {"key": "weight", "label": ["DISPLAY RATINGS", "مواصفات العرض"], "value": "Not verified", "arabicValue": "غير مؤكدة", "detail": ["Pixel pitch, brightness and power unverified", "لم يتم التحقق من تباعد البكسل والسطوع والقدرة"]}],
  source:cloudAsset('/echo/models/led-screen-reference.webp'),sourceLabel:['View reference photo','عرض الصورة المرجعية'],
  disclosure:['Illustrative six-panel wall; panel size and pixel pitch are not verified','جدار توضيحي من ست لوحات؛ حجم اللوحة ودقة البكسل غير مؤكدين'],
 },

 'projector':{
  src:cloudAsset('/echo/models/projector.glb'),profile:cloudAsset('/echo/models/projector-preview.png'),
  brand:'ECHO / VIDEO',model:'PROJECTOR',subtitle:['Event video projector','جهاز عرض فيديو للفعاليات'],
  specs:[
   {key:'power',label:['FORMAT','التصميم'],value:'Compact projector',arabicValue:'جهاز عرض مدمج',detail:['Generic event equipment model','مجسم عام لمعدات الفعاليات']},
   {key:'driver',label:['OPTICS','العدسة'],value:'Front projection lens',arabicValue:'عدسة عرض أمامية',detail:['Layered lens barrel with coated glass','مجموعة عدسات بطبقات وزجاج مطلي']},
   {key:'response',label:['CONTROLS','أزرار التحكم'],value:'Top-mounted keys',arabicValue:'أزرار علوية',detail:['Tactile controls and status indicator','أزرار ملموسة ومؤشر حالة']},
   {key:'output',label:['COOLING','التبريد'],value:'Side ventilation grilles',arabicValue:'شبكات تهوية جانبية',detail:['Slotted intake and exhaust panels','ألواح جانبية مشقوقة لسحب وطرد الهواء']},
   {key:'dsp',label:['CONNECTIONS','التوصيلات'],value:'Rear I/O panel',arabicValue:'لوحة توصيل خلفية',detail:['Ports are illustrative, not a verified layout','المنافذ توضيحية وليست مخططاً مؤكداً']},
   {key:'cabinet',label:['FINISH','التشطيب'],value:'Charcoal housing',arabicValue:'هيكل فحمي',detail:['Rounded molded enclosure with rubber feet','هيكل مصبوب بحواف مستديرة وأقدام مطاطية']},
   {key:'dimensions',label:['DIMENSIONS','الأبعاد'],value:'Not supplied',arabicValue:'غير متوفرة',detail:['Model proportions are illustrative','أبعاد المجسم توضيحية']},
   {key:'weight',label:['TECHNICAL RATINGS','المواصفات التقنية'],value:'Not verified',arabicValue:'غير مؤكدة',detail:['Brightness, resolution and power are unspecified','السطوع والدقة والقدرة غير محددة']},
  ],
  disclosure:['Generic illustrative 3D projector model; manufacturer and specifications are not verified','مجسم توضيحي عام لجهاز عرض ثلاثي الأبعاد؛ لم يتم التحقق من الشركة المصنعة والمواصفات'],
 },

 'soundcraft':{
  youtube:'https://www.youtube.com/watch?v=9YtEA_UZb8k',
  src:cloudAsset('/echo/models/soundcraft.glb'),profile:cloudAsset('/echo/models/soundcraft-reference.jpg'),
  cameraOrbit:'-18deg 42deg 95%',thumbnailOrbit:'-18deg 42deg 105%',
  brand:'SOUNDCRAFT',model:'SOUNDCRAFT SOUNDBOARD',subtitle:['Analogue mixing console','لوحة مزج صوت تناظرية'],
  specs:[{"key": "power", "label": ["TYPE", "النوع"], "value": "Mixing console", "arabicValue": "لوحة مزج", "detail": ["Photo-guided Soundcraft console", "لوحة Soundcraft مبنية على الصورة"]}, {"key": "driver", "label": ["INPUT SECTION", "قسم المداخل"], "value": "12 mono strips", "arabicValue": "12 قناة أحادية", "detail": ["Microphone sockets and gain controls", "مقابس ميكروفون وتحكم بالكسب"]}, {"key": "response", "label": ["CHANNEL CONTROLS", "تحكم القنوات"], "value": "Coloured knobs", "arabicValue": "مقابض ملونة", "detail": ["Rows of rotary controls", "صفوف من أدوات التحكم الدوارة"]}, {"key": "output", "label": ["FADERS", "المزالق"], "value": "Channel + master", "arabicValue": "قنوات ورئيسي", "detail": ["Ivory, blue, purple and yellow caps", "مقابض عاجية وزرقاء وبنفسجية وصفراء"]}, {"key": "dsp", "label": ["EFFECTS SECTION", "قسم المؤثرات"], "value": "Lexicon markings", "arabicValue": "وسم Lexicon", "detail": ["Right-hand effects control area", "قسم التحكم بالمؤثرات على اليمين"]}, {"key": "cabinet", "label": ["FINISH", "التشطيب"], "value": "Blue-grey panel", "arabicValue": "لوحة رمادية زرقاء", "detail": ["Black wedge-shaped housing", "هيكل أسود بشكل إسفيني"]}, {"key": "dimensions", "label": ["DIMENSIONS", "الأبعاد"], "value": "Not supplied", "arabicValue": "غير متوفرة", "detail": ["Model proportions are illustrative", "أبعاد المجسم توضيحية"]}, {"key": "weight", "label": ["TECHNICAL RATINGS", "المواصفات التقنية"], "value": "Not verified", "arabicValue": "غير مؤكدة", "detail": ["Exact variant and electrical ratings unverified", "لم يتم التحقق من الطراز الدقيق والمواصفات الكهربائية"]}],
  source:cloudAsset('/echo/models/soundcraft-reference.jpg'),sourceLabel:['View reference photo','عرض الصورة المرجعية'],
  disclosure:['Illustrative model based on supplied photo','مجسم توضيحي مبني على الصورة المرفقة'],
 },

 'trussing':{
  src:cloudAsset('/echo/models/trussing.glb'),profile:cloudAsset('/echo/models/trussing-preview.png'),
  brand:'ECHO / STAGING',model:'BASE PLATES / TRUSSING',subtitle:['Box-truss portal','بوابة تراس مربعة'],
  specs:[{"key": "power", "label": ["STRUCTURE", "الهيكل"], "value": "Box-truss portal", "arabicValue": "بوابة تراس مربعة", "detail": ["Two towers and overhead span", "برجان وعارضة علوية"]}, {"key": "driver", "label": ["UPRIGHTS", "الأعمدة"], "value": "2 towers", "arabicValue": "برجان", "detail": ["Square lattice columns", "أعمدة شبكية مربعة"]}, {"key": "response", "label": ["FINISH", "التشطيب"], "value": "Silver", "arabicValue": "فضي", "detail": ["Metallic tube finish", "أنابيب بتشطيب معدني"]}, {"key": "output", "label": ["BRACING", "التدعيم"], "value": "Diagonal braces", "arabicValue": "دعامات قطرية", "detail": ["Lattice on all four faces", "شبكة على الأوجه الأربعة"]}, {"key": "dsp", "label": ["BASE PLATES", "صفائح القاعدة"], "value": "2 black plates", "arabicValue": "صفيحتان سوداوان", "detail": ["Wide square tower bases", "قواعد مربعة عريضة للأبراج"]}, {"key": "cabinet", "label": ["CONNECTIONS", "الوصلات"], "value": "Corner joints", "arabicValue": "وصلات زوايا", "detail": ["Visible collars and fixing bolts", "أطواق ومسامير تثبيت ظاهرة"]}, {"key": "dimensions", "label": ["DIMENSIONS", "الأبعاد"], "value": "Not supplied", "arabicValue": "غير متوفرة", "detail": ["Model proportions are illustrative", "أبعاد المجسم توضيحية"]}, {"key": "weight", "label": ["LOAD RATING", "قدرة التحميل"], "value": "Not verified", "arabicValue": "غير مؤكدة", "detail": ["No structural capacity supplied", "لم يتم توفير قدرة التحمل الإنشائي"]}],
  source:cloudAsset('/echo/models/trussing-preview.png'),sourceLabel:['View model preview','عرض معاينة المجسم'],
  disclosure:['Illustrative model based on supplied photo','مجسم توضيحي مبني على الصورة المرفقة'],
 },

 'qsc-k122':{
  youtube:'https://www.youtube.com/watch?v=PwAz258o-5w',
  src:cloudAsset('/echo/models/qsc-k122.glb'),profile:cloudAsset('/echo/models/qsc-k122-reference.jpg'),
  brand:'QSC',model:'K12.2',subtitle:['Loudspeaker cabinet','هيكل سماعة'],
  specs:[{"key": "power", "label": ["MODEL", "الطراز"], "value": "K12.2", "arabicValue": "K12.2", "detail": ["Model identified by owner", "الطراز المحدد من المالك"]}, {"key": "driver", "label": ["GRILLE", "الشبكة"], "value": "Perforated steel", "arabicValue": "فولاذ مثقّب", "detail": ["Curved protective front grille", "شبكة حماية أمامية منحنية"]}, {"key": "response", "label": ["FINISH", "التشطيب"], "value": "Black", "arabicValue": "أسود", "detail": ["Dark moulded cabinet", "هيكل مصبوب داكن"]}, {"key": "output", "label": ["DRIVER LAYOUT", "ترتيب الوحدات"], "value": "Woofer + horn", "arabicValue": "وحدة جهير وبوق", "detail": ["Illustrative recessed driver shapes", "أشكال توضيحية لوحدات غائرة"]}, {"key": "dsp", "label": ["HANDLING", "الحمل"], "value": "Side handles", "arabicValue": "مقابض جانبية", "detail": ["Recessed carry grips", "مقابض حمل غائرة"]}, {"key": "cabinet", "label": ["BADGE", "الشعار"], "value": "QSC", "arabicValue": "QSC", "detail": ["Lower front manufacturer badge", "شعار الشركة أسفل الواجهة"]}, {"key": "dimensions", "label": ["DIMENSIONS", "الأبعاد"], "value": "Not supplied", "arabicValue": "غير متوفرة", "detail": ["Model proportions are illustrative", "أبعاد المجسم توضيحية"]}, {"key": "weight", "label": ["TECHNICAL RATINGS", "المواصفات التقنية"], "value": "Not verified", "arabicValue": "غير مؤكدة", "detail": ["Power, weight and rear connections unverified", "لم يتم التحقق من القدرة والوزن والتوصيلات الخلفية"]}],
  source:cloudAsset('/echo/models/qsc-k122-reference.jpg'),sourceLabel:['View reference photo','عرض الصورة المرجعية'],
  connections:['Rear connections and electrical ratings have not been verified.','لم يتم التحقق من التوصيلات الخلفية والمواصفات الكهربائية.'],
  disclosure:['Illustrative 3D model based on supplied product photo','مجسم توضيحي مبني على صورة المنتج المرفقة'],
 },

 "sparklers":{
  src:cloudAsset('/echo/models/sparklers.glb'),profile:cloudAsset('/echo/models/sparklers-reference.png'),
  brand:"ECHO / SPECIAL EFFECTS",model:"COLD SPARK MACHINE",subtitle:["Spark effects equipment", "جهاز مؤثرات الشرر"],
  specs:[{"key": "power", "label": ["HOUSING", "الهيكل"], "value": "Black enclosure", "arabicValue": "هيكل أسود", "detail": ["Box-shaped cabinet from reference", "هيكل صندوقي من الصورة المرجعية"]}, {"key": "driver", "label": ["TOP APERTURE", "الفتحة العلوية"], "value": "Round outlet", "arabicValue": "مخرج دائري", "detail": ["Top-mounted discharge opening", "فتحة إخراج في الأعلى"]}, {"key": "response", "label": ["CARRY HANDLE", "مقبض الحمل"], "value": "Side handle", "arabicValue": "مقبض جانبي", "detail": ["Folding metal carry handle", "مقبض حمل معدني قابل للطي"]}, {"key": "output", "label": ["COOLING", "التبريد"], "value": "Side fan grille", "arabicValue": "شبكة مروحة جانبية", "detail": ["Circular guard on side panel", "حماية دائرية على الجانب"]}, {"key": "dsp", "label": ["FRONT FINISH", "تشطيب الواجهة"], "value": "White stripe", "arabicValue": "شريط أبيض", "detail": ["Horizontal stripe visible in photo", "شريط أفقي ظاهر في الصورة"]}, {"key": "cabinet", "label": ["BASE", "القاعدة"], "value": "Protective feet", "arabicValue": "أقدام حماية", "detail": ["Compact standing cabinet", "هيكل رأسي مدمج"]}, {"key": "dimensions", "label": ["DIMENSIONS", "الأبعاد"], "value": "Not supplied", "arabicValue": "غير متوفرة", "detail": ["Proportions are illustrative", "أبعاد المجسم توضيحية"]}, {"key": "weight", "label": ["RATINGS", "المواصفات"], "value": "Not verified", "arabicValue": "غير مؤكدة", "detail": ["Output, consumables and power unverified", "لم يتم التحقق من الإخراج والمواد والقدرة"]}],
  source:cloudAsset('/echo/models/sparklers-reference.png'),sourceLabel:['View reference photo','عرض الصورة المرجعية'],
  connections:['Exact connections and operating specifications have not been verified.','لم يتم التحقق من التوصيلات ومواصفات التشغيل الدقيقة.'],
  disclosure:['Illustrative 3D model based on supplied product photo','مجسم توضيحي مبني على صورة المنتج المرفقة'],
 },
 "dry-ice":{
  src:cloudAsset('/echo/models/dry-ice.glb'),profile:cloudAsset('/echo/models/dry-ice-reference.jpg'),
  brand:"ECHO / SPECIAL EFFECTS",model:"DRY ICE MACHINE",subtitle:["Low fog equipment with accessories", "جهاز ضباب منخفض مع ملحقاته"],
  specs:[{"key": "power", "label": ["VESSEL", "الحاوية"], "value": "Insulated housing", "arabicValue": "هيكل معزول", "detail": ["Rounded black container", "حاوية سوداء مستديرة الزوايا"]}, {"key": "driver", "label": ["LID", "الغطاء"], "value": "Removable lid", "arabicValue": "غطاء قابل للإزالة", "detail": ["Top locking handle", "مقبض قفل علوي"]}, {"key": "response", "label": ["HANDLING", "الحمل"], "value": "Two carry handles", "arabicValue": "مقبضا حمل", "detail": ["Raised handles at lid sides", "مقابض مرتفعة على جانبي الغطاء"]}, {"key": "output", "label": ["CONTROLS", "التحكم"], "value": "Raised control box", "arabicValue": "صندوق تحكم علوي", "detail": ["Red and green indicators shown", "مؤشرات حمراء وخضراء ظاهرة"]}, {"key": "dsp", "label": ["OUTLET", "المخرج"], "value": "Round fog outlet", "arabicValue": "مخرج ضباب دائري", "detail": ["Front-mounted discharge tube", "أنبوب إخراج أمامي"]}, {"key": "cabinet", "label": ["ACCESSORIES", "الملحقات"], "value": "Hose + nozzle", "arabicValue": "خرطوم وفوهة", "detail": ["Corrugated hose and wide nozzle", "خرطوم مموج وفوهة عريضة"]}, {"key": "dimensions", "label": ["DIMENSIONS", "الأبعاد"], "value": "Not supplied", "arabicValue": "غير متوفرة", "detail": ["Proportions are illustrative", "أبعاد المجسم توضيحية"]}, {"key": "weight", "label": ["RATINGS", "المواصفات"], "value": "Not verified", "arabicValue": "غير مؤكدة", "detail": ["Capacity, power and output unverified", "لم يتم التحقق من السعة والقدرة والإخراج"]}],
  source:cloudAsset('/echo/models/dry-ice-reference.jpg'),sourceLabel:['View reference photo','عرض الصورة المرجعية'],
  connections:['Exact connections and operating specifications have not been verified.','لم يتم التحقق من التوصيلات ومواصفات التشغيل الدقيقة.'],
  disclosure:['Illustrative 3D model based on supplied product photo','مجسم توضيحي مبني على صورة المنتج المرفقة'],
 },
 "jbl-system":{
  src:'/echo/models/jbl-top-stand-a.glb',parts:[['jbl-wedge-left','Floor wedge L','مراقب أرضي يسار',-1.0,2.9,Math.PI],['jbl-top-stand-a','Top on stand (low)','سماعة على حامل (منخفض)',-2.9,1.3,0],['jbl-compact-sub','Compact sub','سب صغير',-2.2,1.6,0],['jbl-top-stand-b','Top on stand (high)','سماعة على حامل (مرتفع)',2.9,1.3,0],['jbl-large-sub','Large sub','سب كبير',2.2,1.6,0],['jbl-tower-tall','Tall tower','برج عالٍ',-3.7,1.6,0],['jbl-tower','Tower','برج',3.7,1.6,0],['jbl-wedge-right','Floor wedge R','مراقب أرضي يمين',1.0,2.9,Math.PI]].map(([key,en,ar,x,z,rot])=>({key,label:[en,ar],at:[x,z,rot],src:`/echo/models/${key}.glb`})),
  profile:cloudAsset('/echo/models/jbl-system-reference.jpg'),
  brand:"JBL",model:"JBL SYSTEM",subtitle:["Set of eight speaker pieces", "مجموعة من ثماني قطع"],
  specs:[{"key": "power", "label": ["ARRANGEMENT", "التشكيلة"], "value": "8 pieces", "arabicValue": "8 قطع", "detail": ["Arrangement follows supplied photo", "التشكيلة حسب الصورة المرفقة"]}, {"key": "driver", "label": ["ELEVATED TOPS", "السماعات المرتفعة"], "value": "2 pole mounts", "arabicValue": "حاملان عموديان", "detail": ["Two elevated speaker cabinets", "سماعتان مرتفعتان على حاملين"]}, {"key": "response", "label": ["TOWERS", "الأبراج"], "value": "Tall cabinets", "arabicValue": "هياكل رأسية", "detail": ["Floor-standing speaker towers", "أبراج سماعات أرضية"]}, {"key": "output", "label": ["LOW CABINETS", "الهياكل المنخفضة"], "value": "Floor cabinets", "arabicValue": "هياكل أرضية", "detail": ["Low speaker boxes below tops", "صناديق سماعات تحت السماعات المرتفعة"]}, {"key": "dsp", "label": ["MONITORS", "المراقبة"], "value": "2 floor wedges", "arabicValue": "مراقبان أرضيان", "detail": ["Angled cabinets at each end", "هياكل مائلة عند الطرفين"]}, {"key": "cabinet", "label": ["FINISH", "التشطيب"], "value": "Black grilles", "arabicValue": "شبكات سوداء", "detail": ["Dark housings and JBL badges", "هياكل داكنة وشعارات JBL"]}, {"key": "dimensions", "label": ["MODELS", "الطرازات"], "value": "Not verified", "arabicValue": "غير مؤكدة", "detail": ["Photo does not establish exact models", "الصورة لا تثبت الطرازات الدقيقة"]}, {"key": "weight", "label": ["RATINGS", "المواصفات"], "value": "Not supplied", "arabicValue": "غير متوفرة", "detail": ["Power, dimensions and inventory unverified", "لم يتم التحقق من القدرة والأبعاد والمخزون"]}],
  source:cloudAsset('/echo/models/jbl-system-reference.jpg'),sourceLabel:['View reference photo','عرض الصورة المرجعية'],
  connections:['Exact connections and operating specifications have not been verified.','لم يتم التحقق من التوصيلات ومواصفات التشغيل الدقيقة.'],
  disclosure:['Illustrative 3D model based on supplied product photo','مجسم توضيحي مبني على صورة المنتج المرفقة'],
 },

 'elite-15':{
  src:cloudAsset('/echo/models/elite-15.glb'),profile:cloudAsset('/echo/models/elite-15-reference.jpg'),
  brand:'YORKVILLE / ÉLITE',model:'ELITE 15″',subtitle:['15-inch speaker cabinet','سماعة بقياس 15 بوصة'],
  specs:[
   {key:'power',label:['SPEAKER SIZE','مقاس السماعة'],value:'15 inches',arabicValue:'15 بوصة',detail:['Size identified by owner','المقاس المحدد من المالك']},
   {key:'driver',label:['FRONT GRILLE','الشبكة الأمامية'],value:'Perforated steel',arabicValue:'فولاذ مثقّب',detail:['Full-height protective grille','شبكة حماية بطول الواجهة']},
   {key:'response',label:['FINISH','التشطيب'],value:'Black',arabicValue:'أسود',detail:['Dark cabinet and frame','هيكل وإطار باللون الأسود']},
   {key:'output',label:['DRIVER LAYOUT','ترتيب الوحدات'],value:'Recessed drivers',arabicValue:'وحدات غائرة',detail:['Circular drivers and upper horn visible in reference','وحدات دائرية وبوق علوي ظاهرة في الصورة']},
   {key:'dsp',label:['HANDLING','الحمل'],value:'Side handle',arabicValue:'مقبض جانبي',detail:['Inset handle on cabinet side','مقبض غائر في جانب الهيكل']},
   {key:'cabinet',label:['CABINET','الهيكل'],value:'Tall enclosure',arabicValue:'هيكل رأسي',detail:['Tapered sides and blue Elite badge','جوانب مدببة وشعار Elite أزرق']},
   {key:'dimensions',label:['DIMENSIONS','الأبعاد'],value:'Not supplied',arabicValue:'غير متوفرة',detail:['Model proportions are illustrative','أبعاد المجسم توضيحية']},
   {key:'weight',label:['POWER / WEIGHT','القدرة والوزن'],value:'Not supplied',arabicValue:'غير متوفرة',detail:['Exact model and ratings unverified','لم يتم التحقق من الطراز والمواصفات الدقيقة']},
  ],
  source:cloudAsset('/echo/models/elite-15-reference.jpg'),sourceLabel:['View reference photo','عرض الصورة المرجعية'],
  connections:['Rear connections and electrical specifications have not been verified.','لم يتم التحقق من التوصيلات الخلفية والمواصفات الكهربائية.'],
  disclosure:['Illustrative 3D model based on supplied product photo','مجسم توضيحي مبني على صورة المنتج المرفقة'],
 },

 'shure-mics':{
  youtube:'https://www.youtube.com/watch?v=k5OM4GUJNvQ',
  src:cloudAsset('/echo/models/shure-microphones.glb'),profile:cloudAsset('/echo/models/shure-microphones-reference.png'),
  brand:'SHURE',model:'BLX88 SET',subtitle:['Two handheld microphones and receiver','ميكروفونان محمولان مع جهاز استقبال'],
  specs:[
   {key:'power',label:['HANDHELDS','الميكروفونات'],value:'2 microphones',arabicValue:'ميكروفونان',detail:['Paired handheld arrangement','ترتيب بميكروفونين محمولين']},
   {key:'driver',label:['RECEIVER','جهاز الاستقبال'],value:'Dual channel',arabicValue:'قناتان',detail:['A1 / A2 displays shown in reference','شاشتا A1 / A2 ظاهرتان في الصورة']},
   {key:'response',label:['GRILLES','الشبكات'],value:'Silver mesh',arabicValue:'شبكة فضية',detail:['Rounded woven metal grilles','شبكات معدنية منسوجة مستديرة']},
   {key:'output',label:['IDENTIFICATION RINGS','حلقات التعريف'],value:'Blue',arabicValue:'زرقاء',detail:['Blue bands around microphone heads','حلقات زرقاء حول رأسي الميكروفونين']},
   {key:'dsp',label:['INDICATORS','المؤشرات'],value:'Green status LEDs',arabicValue:'مؤشرات خضراء',detail:['Status lights visible in supplied photo','أضواء حالة ظاهرة في الصورة المرفقة']},
   {key:'cabinet',label:['FINISH','التشطيب'],value:'Black',arabicValue:'أسود',detail:['Dark handhelds and low-profile receiver','ميكروفونان أسودان وجهاز استقبال منخفض الارتفاع']},
   {key:'dimensions',label:['RECEIVER MARKING','وسم جهاز الاستقبال'],value:'BLX88',detail:['Label visible in reference photo','الوسم الظاهر في الصورة المرجعية']},
   {key:'weight',label:['TECHNICAL RATINGS','المواصفات التقنية'],value:'Not supplied',arabicValue:'غير متوفرة',detail:['Frequency, capsule and dimensions unverified','لم يتم التحقق من التردد والكبسولة والأبعاد']},
  ],
  source:cloudAsset('/echo/models/shure-microphones-reference.png'),sourceLabel:['View reference photo','عرض الصورة المرجعية'],
  connections:['Exact rear connections and operating frequency have not been verified.','لم يتم التحقق من التوصيلات الخلفية وتردد التشغيل.'],
  disclosure:['Illustrative 3D model based on supplied product photo','مجسم توضيحي مبني على صورة المنتج المرفقة'],
 },

 uplights:{
  src:"https://res.cloudinary.com/nqiooluk/raw/upload/v1793064494/khalil/site-assets/5f7776b39e8e/echo/models/uplight.glb",profile:"https://res.cloudinary.com/nqiooluk/image/upload/v1793064227/khalil/site-assets/1d8b0fc48029/echo/models/uplight-reference.jpg",
  brand:'ECHO / LIGHTING',model:'UPLIGHT',subtitle:['Compact event uplight','وحدة إضاءة للفعاليات'],
  specs:[
   {key:'power',label:['LIGHT ARRAY','عدسات الإضاءة'],value:'9 lenses',arabicValue:'9 عدسات',detail:['Nine circular optics visible in reference','تسع عدسات دائرية ظاهرة في الصورة المرجعية']},
   {key:'driver',label:['LENS COLOUR','لون العدسات'],value:'Violet',arabicValue:'بنفسجي',detail:['Colour shown in supplied photo','اللون الظاهر في الصورة المرفقة']},
   {key:'response',label:['FINISH','التشطيب'],value:'Black',arabicValue:'أسود',detail:['Dark satin housing','هيكل أسود بتشطيب ساتان']},
   {key:'output',label:['HOUSING','الهيكل'],value:'Ribbed panel',arabicValue:'لوحة مضلعة',detail:['Vertical cooling fins','زعانف تبريد عمودية']},
   {key:'dsp',label:['BRACKET','الحامل'],value:'Raised handle',arabicValue:'مقبض مرتفع',detail:['Sloped side supports','دعامات جانبية مائلة']},
   {key:'cabinet',label:['BASE','القاعدة'],value:'Four feet',arabicValue:'أربع أقدام',detail:['Rounded protective corners','زوايا حماية مستديرة']},
   {key:'dimensions',label:['DIMENSIONS','الأبعاد'],value:'Not supplied',arabicValue:'غير متوفرة',detail:['Exact measurements unverified','لم يتم التحقق من القياسات الدقيقة']},
   {key:'weight',label:['MODEL / RATINGS','الطراز والمواصفات'],value:'Not identified',arabicValue:'غير محدد',detail:['Brand, power and controls unverified','لم يتم التحقق من العلامة والقدرة والتحكم']},
  ],
  source:"https://res.cloudinary.com/nqiooluk/image/upload/v1793064227/khalil/site-assets/1d8b0fc48029/echo/models/uplight-reference.jpg",sourceLabel:['View reference photo','عرض الصورة المرجعية'],
  connections:['Exact connections and electrical ratings have not been supplied.','لم يتم توفير تفاصيل التوصيلات والمواصفات الكهربائية الدقيقة.'],
  disclosure:['Illustrative 3D model based on supplied product photo','مجسم توضيحي مبني على صورة المنتج المرفقة'],
 },

 es18p:{
  youtube:'https://www.youtube.com/watch?v=h9z1V82w5yY',
  src:'https://res.cloudinary.com/nqiooluk/raw/upload/v1793064132/khalil/site-assets/7f685d12a92f/echo/models/es18p-subwoofer.glb',profile:'https://res.cloudinary.com/nqiooluk/image/upload/v1793064131/khalil/site-assets/1874a9519ba5/echo/models/es18p-profile.jpg',
  brand:'YORKVILLE / ÉLITE',model:'ES18P',subtitle:['18″ powered subwoofer','ساب ووفر نشط 18 بوصة'],
  specs:ES18P_SPECS,source:ES18P_SPEC_SOURCE,sourceLabel:['Yorkville specifications','مواصفات Yorkville'],
  connections:['XLR input + mono blend + link out · ¼″ link in / out · power, activity & protection LEDs','مدخل XLR + دمج أحادي + مخرج ربط · مدخل ومخرج ¼ بوصة · مؤشرات التشغيل والنشاط والحماية'],
  disclosure:['Illustrative 3D model · manufacturer specifications','مجسم توضيحي · مواصفات الشركة المصنعة'],
 },
 movingheads:{
  youtube:'https://www.youtube.com/watch?v=PW1Yz53xUyk',
  src:'https://res.cloudinary.com/nqiooluk/raw/upload/v1793064133/khalil/site-assets/cc69f53ad3b2/echo/models/intimidator-moving-head.glb',profile:'https://res.cloudinary.com/nqiooluk/image/upload/v1793064132/khalil/site-assets/55dcd5c83fe3/echo/models/intimidator-moving-head-profile.jpg',
  brand:'CHAUVET DJ / INTIMIDATOR',model:'SPOT 260X',subtitle:['Intelligent moving head spot','كشاف متحرك ذكي'],
  specs:movingHeadSpecs,source:movingHeadSource,sourceLabel:['Chauvet specifications','مواصفات Chauvet'],
  connections:['3-pin XLR DMX · powerCON-compatible power in / out · full-colour LCD · RF remote support','تحكم DMX عبر XLR بثلاثة أطراف · مدخل ومخرج طاقة متوافقان مع powerCON · شاشة LCD ملونة · دعم تحكم RF'],
  disclosure:['Photo matched to Spot 260X · illustrative 3D · manufacturer specifications','الصورة مطابقة لـ Spot 260X · مجسم توضيحي · مواصفات الشركة المصنعة'],
 },
};
