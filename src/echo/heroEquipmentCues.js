export const HERO_EQUIPMENT_TIMELINE='echo:hero-intro-timeline';
const normalize=text=>text.toLowerCase().replace(/[.,،؟!—–-]/g,'');
const sequence=[
 {id:'qsc-k122',phrase:{en:'sound systems',ar:'أنظمة صوت'},label:['Sound systems','أنظمة الصوت'],category:['SOUND','الصوت'],accent:'#90c9db'},
 {id:'shure-mics',phrase:{en:'microphones',ar:'مايكروفونات'},label:['Microphones','المايكروفونات'],category:['SOUND','الصوت'],accent:'#90c9db'},
 {id:'movingheads',phrase:{en:'event lighting',ar:'إضاءة'},after:{ar:'مايكروفونات'},label:['Event lighting','إضاءة المناسبات'],category:['LIGHTING','الإضاءة'],accent:'#c5abed'},
 {id:'led-screen',phrase:{en:'LED screens',ar:'شاشات إل إي دي'},label:['LED screens','شاشات LED'],category:['VISUALS','العرض المرئي'],accent:'#99c8fa'},
 {id:'dry-ice',phrase:{en:'low lying fog',ar:'الدخان الواطي'},label:['Low-lying fog','الدخان الواطي'],category:['SPECIAL EFFECTS','المؤثرات الخاصة'],accent:'#a9dbce'},
 {id:'sparklers',phrase:{en:'cold sparks',ar:'والشرار البارد'},label:['Cold sparks','الشرار البارد'],category:['SPECIAL EFFECTS','المؤثرات الخاصة'],accent:'#e8c68d'},
 {id:'co2-gun',hold:6,phrase:{en:'CO2'},label:['CO₂ effects','مؤثرات CO₂'],category:['SPECIAL EFFECTS','المؤثرات الخاصة'],accent:'#a9dbce'},

 // The 3D Room is introduced near the end of the greeting ("the three dimensional setup simulation").
 {id:'room-3d',hold:7,phrase:{en:'simulation',ar:'محاكاة'},label:['3D Room','الغرفة ثلاثية الأبعاد'],category:['SETUP SIMULATION','محاكاة التجهيز'],accent:'#c8b6f2'},

 // The six music boxes (Mix, Remix, Mashup, Medley, Cover, Reels) are named one after another near the end: one scene shows them all.
 {id:'music-boxes',hold:9,phrase:{en:'mixes',ar:'الميكسات'},label:['DJ Khalil’s work','أعمال دي جي خليل'],category:['MUSIC','الموسيقى'],accent:'#f0b25e'},
];
function phraseIndex(words,phrase,from=0){
 const parts=normalize(phrase).split(/\s+/);
 return words.findIndex((_,i)=>i>=from&&parts.every((part,j)=>normalize(words[i+j]?.text||'')===part));
}
export function equipmentCues(narration,language){
 const cues=sequence.flatMap(item=>{
  const phrase=item.phrase[language];if(!phrase)return [];
  const anchor=item.after?.[language],from=anchor?phraseIndex(narration.words,anchor)+1:0;
  const index=phraseIndex(narration.words,phrase,from);if(index<0)return [];
  return [{...item,start:narration.words[index].start}];
 }).sort((a,b)=>a.start-b.start);
 // A cue ends when the next begins; the last, and any followed by a long unrelated stretch, hold for 6 s.
 return cues.map((cue,index)=>{const next=cues[index+1];return {...cue,end:Math.min(next?.start??Infinity,cue.start+(cue.hold??(next?Infinity:6)),narration.duration)};});
}
// When each music box is spoken (the Live box is the Reels one).
export const MUSIC_BOX_PHRASES=[['MIX',{en:'mixes',ar:'الميكسات'}],['REMIX',{en:'remixes',ar:'والريمكسات'}],['MASHUP',{en:'mashups',ar:'للماش'}],['MEDLEY',{en:'medleys',ar:'والميدلي'}],['COVER',{en:'covers',ar:'إعادة'}],['LIVE',{en:'live',ar:'والعروض'}]];
export function musicBoxStarts(narration,language){
 const out={};let from=0;
 for(const [id,phrase] of MUSIC_BOX_PHRASES){const index=phraseIndex(narration.words,phrase[language],from);if(index<0)continue;out[id]=narration.words[index].start;from=index;}
 return out;
}
export const equipmentCueAt=(cues,time)=>cues.find(cue=>time>=cue.start&&time<cue.end)||null;
