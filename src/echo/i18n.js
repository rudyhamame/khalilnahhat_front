import { useEffect, useState } from 'react';

const KEY = 'echo-lang';

const T = {
  en: {
    brand: 'Echo Event Entertainment',
    tagline: 'ENTERTAINMENT WITH IMPACT. PRODUCTION WITH PRECISION.',
    nav: { home: 'Home', about: 'About', equipment: 'Equipment', mixes: 'Mixes', gallery: 'Gallery', reviews: 'Reviews', live: 'Live', meeting: 'Book a Meeting', contact: 'Contact', quote: 'Request a Quote', login: 'Login', dashboard: 'Dashboard' },
    heroLines: ['TURN THE ROOM ON.', 'YOUR EVENT. OUR PRODUCTION.', 'ONE TEAM. ONE SHOW. TOTAL IMPACT.', 'DJ • SOUND • LIGHTING • LED • FX'],
    cta: { book: 'BOOK YOUR EVENT', quote: 'REQUEST A QUOTE', services: 'EXPLORE OUR SERVICES', requestDj: 'REQUEST DJ KHALIL' },
    introTitle: 'DJ Khalil × Echo Event Entertainment',
    intro: 'Over 10 years of DJ experience at Arabic, Middle Eastern and multicultural weddings, private celebrations and corporate events — backed by a full production team in Toronto.',
    servicesTitle: 'Complete event production',
    services: [
      ['DJ Services', 'Live DJ sets, custom wedding entrance mixes, MC announcements.'],
      ['Sound Systems', 'From QSC powered speakers to a concert-level JBL system.'],
      ['Lighting', 'Moving heads, trussing and wireless uplights.'],
      ['LED Walls', 'Six-panel LED screens, customised to your event.'],
      ['Special Effects', 'Smoke, cold sparks, dry ice and CO₂.'],
      ['Corporate Events', 'Audio, projection, MC and full production as one integrated show.'],
    ],
    finalTitle: 'Ready to turn the room on?',
    finalText: 'Tell us about your event and receive a custom quotation. Submitting a request does not reserve your date.',
    eqTitle: 'Equipment catalog',
    eqIntro: 'Choose the gear you need and add it to your quote. Pricing is customised for every event.',
    cats: { all: 'All', lighting: 'Lighting', sound: 'Sound', effects: 'Special Effects', video: 'Video' },
    addToQuote: 'ADD TO QUOTE',
    inQuote: 'In quote',
    remove: 'Remove',
    qty: 'Qty',
    minQty: (n) => `Minimum ${n}`,
    noPhoto: 'Photo coming soon',
    loadFail: 'Could not load the catalog. Please try again.',
    quoteBar: (n) => `${n} item${n === 1 ? '' : 's'} in your quote`,
    quoteBarCta: 'Continue',
    q: {
      title: 'Request a quote',
      intro: 'Tell us about your event. We will review it and send a customised quotation. This does not reserve your date.',
      signIn: 'Please sign in or create an account to submit a quote request.',
      signInCta: 'Sign in / Register',
      customer: 'Your details', eventInfo: 'Event information', svc: 'Requested services',
      equip: 'Selected equipment', music: 'Music & entertainment', extra: 'Anything else?',
      phone: 'Phone number', contact: 'Preferred contact method', company: 'Company (corporate clients)',
      email: 'Email', phoneOpt: 'Phone', eventType: 'Event type', date: 'Event date', start: 'Start time', end: 'End time',
      venue: 'Venue name', address: 'Venue address', city: 'City', postal: 'Postal code',
      gta: 'Inside the GTA', outGta: 'Outside the GTA', indoor: 'Indoor', outdoor: 'Outdoor', guests: 'Estimated guests',
      musicStyle: 'Preferred music', notes: 'Special requests & notes',
      noEquip: 'No equipment selected. You can browse the catalog and add items.', browse: 'Browse equipment',
      submit: 'SUBMIT QUOTE REQUEST', submitting: 'Submitting…',
      done: 'Quote request received', doneText: 'Your request number is',
      doneNext: 'We will review your event and send a customised quotation. Your date is not reserved until you accept the quote and pay the deposit.',
      dash: 'Go to my dashboard', needFields: 'Please fill in the required fields.',
      eventTypes: { wedding: 'Wedding', engagement: 'Engagement', birthday: 'Birthday', corporate: 'Corporate Event', party: 'Private Party', graduation: 'Graduation', other: 'Other' },
      svcs: { dj: 'DJ Services', sound: 'Sound System', lighting: 'Lighting', led: 'LED Wall', fx: 'Special Effects', rental: 'Equipment Rental', corporate: 'Corporate Event Production' },
      musics: { arabic: 'Arabic', english: 'English', mixed: 'Mixed', other: 'Other' },
      methods: { email: 'Email', phone: 'Phone', whatsapp: 'WhatsApp' },
    },
    footer: 'ONE TEAM. ONE SHOW. TOTAL IMPACT.',
    lang: 'العربية',
  },
  ar: {
    brand: 'إيكو لتنظيم وترفيه الفعاليات',
    tagline: 'ترفيه بتأثير. إنتاج بدقة.',
    nav: { home: 'الرئيسية', about: 'من نحن', equipment: 'المعدات', mixes: 'الميكسات', gallery: 'المعرض', reviews: 'الآراء', live: 'مباشر', meeting: 'احجز اجتماعاً', contact: 'اتصل بنا', quote: 'اطلب عرض سعر', login: 'تسجيل الدخول', dashboard: 'لوحة التحكم' },
    heroLines: ['شغّل القاعة.', 'فعاليتك. إنتاجنا.', 'فريق واحد. عرض واحد. تأثير كامل.', 'دي جي • صوت • إضاءة • شاشات LED • مؤثرات'],
    cta: { book: 'احجز فعاليتك', quote: 'اطلب عرض سعر', services: 'اكتشف خدماتنا', requestDj: 'اطلب دي جي خليل' },
    introTitle: 'دي جي خليل × إيكو',
    intro: 'أكثر من 10 سنوات من الخبرة في الأعراس العربية والشرق أوسطية ومتعددة الثقافات والمناسبات الخاصة وفعاليات الشركات — مدعومة بفريق إنتاج متكامل في تورونتو.',
    servicesTitle: 'إنتاج متكامل للفعاليات',
    services: [
      ['خدمات الدي جي', 'عروض حيّة، ميكسات دخول مخصصة للأعراس، وتقديم الفقرات.'],
      ['أنظمة الصوت', 'من سماعات QSC إلى نظام JBL بمستوى الحفلات.'],
      ['الإضاءة', 'رؤوس متحركة وهياكل وإضاءة لاسلكية للأجواء.'],
      ['شاشات LED', 'شاشات من ست وحدات، مخصصة لفعاليتك.'],
      ['المؤثرات الخاصة', 'دخان، شرارات باردة، ثلج جاف وCO₂.'],
      ['فعاليات الشركات', 'صوت وعرض وتقديم وإنتاج كامل كعرض واحد متكامل.'],
    ],
    finalTitle: 'جاهز لتشغيل القاعة؟',
    finalText: 'أخبرنا عن فعاليتك واحصل على عرض سعر مخصص. إرسال الطلب لا يحجز التاريخ.',
    eqTitle: 'كتالوج المعدات',
    eqIntro: 'اختر المعدات المطلوبة وأضفها إلى عرض السعر. التسعير مخصص لكل فعالية.',
    cats: { all: 'الكل', lighting: 'الإضاءة', sound: 'الصوت', effects: 'المؤثرات', video: 'الفيديو' },
    addToQuote: 'أضف إلى عرض السعر',
    inQuote: 'مضاف',
    remove: 'إزالة',
    qty: 'الكمية',
    minQty: (n) => `الحد الأدنى ${n}`,
    noPhoto: 'الصورة قريباً',
    loadFail: 'تعذر تحميل الكتالوج. حاول مرة أخرى.',
    quoteBar: (n) => `${n} عنصر في عرض السعر`,
    quoteBarCta: 'متابعة',
    q: {
      title: 'اطلب عرض سعر',
      intro: 'أخبرنا عن فعاليتك. سنراجعها ونرسل عرض سعر مخصصاً. هذا لا يحجز التاريخ.',
      signIn: 'يرجى تسجيل الدخول أو إنشاء حساب لإرسال طلب عرض السعر.',
      signInCta: 'تسجيل الدخول / إنشاء حساب',
      customer: 'بياناتك', eventInfo: 'معلومات الفعالية', svc: 'الخدمات المطلوبة',
      equip: 'المعدات المختارة', music: 'الموسيقى والترفيه', extra: 'أي شيء آخر؟',
      phone: 'رقم الهاتف', contact: 'طريقة التواصل المفضلة', company: 'الشركة (لعملاء الشركات)',
      email: 'البريد الإلكتروني', phoneOpt: 'الهاتف', eventType: 'نوع الفعالية', date: 'تاريخ الفعالية', start: 'وقت البدء', end: 'وقت الانتهاء',
      venue: 'اسم المكان', address: 'عنوان المكان', city: 'المدينة', postal: 'الرمز البريدي',
      gta: 'داخل منطقة تورونتو الكبرى', outGta: 'خارج منطقة تورونتو الكبرى', indoor: 'داخلي', outdoor: 'خارجي', guests: 'عدد الضيوف التقريبي',
      musicStyle: 'الموسيقى المفضلة', notes: 'طلبات وملاحظات خاصة',
      noEquip: 'لم يتم اختيار معدات. يمكنك تصفح الكتالوج وإضافة عناصر.', browse: 'تصفح المعدات',
      submit: 'إرسال طلب عرض السعر', submitting: 'جارٍ الإرسال…',
      done: 'تم استلام طلبك', doneText: 'رقم طلبك هو',
      doneNext: 'سنراجع فعاليتك ونرسل عرض سعر مخصصاً. لا يتم حجز التاريخ إلا بعد قبول العرض ودفع العربون.',
      dash: 'الذهاب إلى لوحة التحكم', needFields: 'يرجى تعبئة الحقول المطلوبة.',
      eventTypes: { wedding: 'عرس', engagement: 'خطوبة', birthday: 'عيد ميلاد', corporate: 'فعالية شركة', party: 'حفلة خاصة', graduation: 'تخرج', other: 'أخرى' },
      svcs: { dj: 'خدمات الدي جي', sound: 'نظام صوت', lighting: 'إضاءة', led: 'شاشة LED', fx: 'مؤثرات خاصة', rental: 'تأجير معدات', corporate: 'إنتاج فعاليات الشركات' },
      musics: { arabic: 'عربية', english: 'إنجليزية', mixed: 'مختلطة', other: 'أخرى' },
      methods: { email: 'البريد', phone: 'الهاتف', whatsapp: 'واتساب' },
    },
    footer: 'فريق واحد. عرض واحد. تأثير كامل.',
    lang: 'English',
  },
};

function read() {
  try { return window.localStorage.getItem(KEY) === 'ar' ? 'ar' : 'en'; } catch { return 'en'; }
}

export function useLang() {
  const [lang, setLang] = useState(read);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    try { window.localStorage.setItem(KEY, lang); } catch { /* storage unavailable */ }
    return () => { document.documentElement.dir = 'ltr'; document.documentElement.lang = 'en'; };
  }, [lang]);
  return { lang, t: T[lang], toggle: () => setLang(lang === 'en' ? 'ar' : 'en') };
}
