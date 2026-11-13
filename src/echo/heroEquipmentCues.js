export const HERO_EQUIPMENT_TIMELINE='echo:hero-intro-timeline';
const normalize=text=>text.toLowerCase().replace(/[.,،؟!—–-]/g,'');
const sequence=[
 {id:'qsc-k122',phrase:{en:'sound systems',ar:'أنظمة صوت'},label:['Sound systems','أنظمة الصوت'],category:['SOUND','الصوت'],accent:'#90c9db'},
 {id:'shure-mics',phrase:{en:'microphones',ar:'مايكروفونات'},label:['Microphones','المايكروفونات'],category:['SOUND','الصوت'],accent:'#90c9db'},
 {id:'movingheads',phrase:{en:'event lighting',ar:'إضاءة'},after:{ar:'مايكروفونات'},label:['Event lighting','إضاءة المناسبات'],category:['LIGHTING','الإضاءة'],accent:'#c5abed'},
 {id:'led-screen',phrase:{en:'LED screens',ar:'شاشات إل إي دي'},label:['LED screens','شاشات LED'],category:['VISUALS','العرض المرئي'],accent:'#99c8fa'},
 {id:'dry-ice',phrase:{en:'low lying fog',ar:'الدخان الواطي'},label:['Low-lying fog','الدخان الواطي'],category:['SPECIAL EFFECTS','المؤثرات الخاصة'],accent:'#a9dbce'},
 {id:'sparklers',phrase:{en:'cold sparks',ar:'والشرار البارد'},label:['Cold sparks','الشرار البارد'],category:['SPECIAL EFFECTS','المؤثرات الخاصة'],accent:'#e8c68d'},
 {id:'co2-gun',phrase:{en:'CO2'},label:['CO₂ effects','مؤثرات CO₂'],category:['SPECIAL EFFECTS','المؤثرات الخاصة'],accent:'#a9dbce'},
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
 return cues.map((cue,index)=>({...cue,end:cues[index+1]?.start??Math.min(cue.start+6,narration.duration)}));
}
export const equipmentCueAt=(cues,time)=>cues.find(cue=>time>=cue.start&&time<cue.end)||null;
