// Arabic dialect suggestion: transcribe short clips with a Whisper model in the browser, then count dialect marker words.
// This only suggests (singing is hard to transcribe), and says how many marker words it found so the result can be judged.
export const normalizeArabic=text=>String(text||'').replace(/[ً-ٰٟـ]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^ء-ي\s]/g,' ');
// [word, weight]: weight 2 marks a word that mostly belongs to one dialect, 1 a word that is common in several.
const MARKERS={
 Lebanese:[['هلق',2],['هيدا',2],['هيدي',2],['هيك',1],['كتير',1],['شو',1],['منيح',1],['بدي',1],['بدك',1],['عم',1],['ليش',1],['مبلا',2],['هيدول',2],['ايمتى',1],['كيفك',1],['لسا',1]],
 Syrian:[['هلا',1],['هلأ',2],['هلاء',2],['هاد',1],['هاي',1],['شلونك',1],['كتير',1],['شو',1],['هيك',1],['بدي',1],['ليش',1],['عم',1],['لسه',1],['شوفي',1]],
 Palestinian:[['هسا',2],['هسه',2],['كيفك',1],['شو',1],['بدي',1],['هيك',1],['ليش',1],['لسا',1],['اشي',2],['زلمه',2],['يمه',1]],
 Egyptian:[['ده',2],['دي',2],['دا',2],['ازاي',2],['دلوقتي',2],['عايز',2],['عاوز',2],['كده',2],['ليه',1],['فين',1],['مش',1],['بتاع',2],['بقي',1],['خالص',1],['اوي',2],['ايه',1],['علشان',1],['احنا',1],['انتي',1]],
 Gulf:[['شلون',2],['وايد',2],['ابغي',2],['ابي',1],['شنو',1],['هالحين',2],['زين',1],['حق',1],['يالله',1],['وش',2],['ليش',1],['مره',1],['اشوف',1],['گلبي',2],['چذي',2],['شفيك',2]],
 Iraqi:[['اكو',2],['ماكو',2],['شكو',2],['هسه',1],['كلش',2],['شلونك',1],['اني',1],['هواي',2],['شنو',1],['دير',1],['گلب',2],['اشكد',2],['شماله',1]],
 Maghrebi:[['بزاف',2],['واش',2],['دابا',2],['ديال',2],['ديالي',2],['كيفاش',2],['علاش',2],['ماشي',2],['غادي',1],['شحال',2],['والو',2],['مزيان',2],['برشا',2],['باهي',1],['نحب',1],['هاد',1],['فين',1]],
 Sudanese:[['دحين',2],['زول',2],['ياخ',1],['شنو',1],['كدا',2],['حبوبه',1]],
 Yemeni:[['ايش',1],['دحين',1],['بلاش',1],['هيا',1],['يا رجال',2]],
 Standard:[['الذي',2],['التي',2],['سوف',2],['لقد',2],['هذا',1],['هذه',1],['حيث',1],['لماذا',2],['ماذا',2],['كيف',1],['لكن',1],['اليوم',1],['انني',2],['لن',1],['قد',1]],
};
// Distinctive ones first: a dialect only wins when its hits are clearly ahead; ties are reported as mixed.
export function classifyDialect(text){
 const words=normalizeArabic(text).split(/\s+/).filter(Boolean);
 if(words.length<8)return {dialects:[],words:words.length,reason:'Not enough words were understood to judge the dialect.'};
 const counts=new Map();for(const word of words)counts.set(word,(counts.get(word)||0)+1);
 const scores=Object.entries(MARKERS).map(([name,list])=>{
  const found=[];let score=0;
  for(const [marker,weight] of list){const hits=counts.get(normalizeArabic(marker).trim());if(hits){score+=hits*weight;found.push(marker);}}
  return {name,score,found};
 }).filter(item=>item.score>0).sort((a,b)=>b.score-a.score);
 // Standard Arabic only when no dialect word at all stands out.
 const dialects=scores.filter(item=>item.name!=='Standard'),standard=scores.find(item=>item.name==='Standard');
 const total=dialects.reduce((sum,item)=>sum+item.score,0);
 if(total<3)return standard&&standard.score>=3?{dialects:[{name:'Standard',score:standard.score,found:standard.found,share:1}],words:words.length,reason:''}:{dialects:[],words:words.length,reason:'Too few dialect words were found to judge.'};
 const top=dialects[0],kept=dialects.filter(item=>item.score>=top.score*.6&&item.score>=2).map(item=>({...item,share:item.score/total}));
 return {dialects:kept,words:words.length,reason:'',total};
}
import {speechClip} from './speechRemote.js';
// Transcribe a few clips spread over the recording (mono 16 kHz samples) and classify the combined Arabic text.
export async function detectDialect(samples,{token,onStep,clips=5,clipSeconds=30}={}){
 const duration=samples.length/16000,count=Math.max(1,Math.min(clips,Math.ceil(duration/clipSeconds))),texts=[];
 for(let index=0;index<count;index++){
  const from=count===1?0:index*Math.max(0,duration-clipSeconds)/(count-1),clip=samples.slice(Math.floor(from*16000),Math.floor((from+clipSeconds)*16000));
  onStep?.(index+1,count);
  texts.push(String((await speechClip('transcribe',clip,token)).text||''));
 }
 const text=texts.join(' ');
 return {...classifyDialect(text),sample:text.trim().slice(0,160)};
}
