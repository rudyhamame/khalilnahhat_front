// Spoken / sung language of an audio clip with a small multilingual Whisper model that runs in the browser (nothing is uploaded).
// Only the first decoder step is evaluated: the probabilities Whisper assigns to its language tokens.
export const WHISPER_LANGUAGES=['en','zh','de','es','ru','ko','fr','ja','pt','tr','pl','ca','nl','ar','sv','it','id','hi','fi','vi','he','uk','el','ms','cs','ro','da','hu','ta','no','th','ur','hr','bg','lt','la','mi','ml','cy','sk','te','fa','lv','bn','sr','az','sl','kn','et','mk','br','eu','is','hy','ne','mn','bs','kk','sq','sw','gl','mr','pa','si','km','sn','yo','so','af','oc','ka','be','tg','sd','gu','am','yi','lo','uz','fo','ht','ps','tk','nn','mt','sa','lb','my','bo','tl','mg','as','tt','haw','ln','ha','ba','jw','su'];
import {speechClip} from './speechRemote.js';
// samples: mono Float32Array at 16 kHz. The model runs on the server. Returns the languages ranked by probability: [{code,probability}].
export async function detectLanguages(samples,{token,seconds=30,from=0}={}){
 const clip=samples.slice(Math.floor(from*16000),Math.floor((from+seconds)*16000));
 return (await speechClip('language',clip,token)).ranked;
}

// Whole-recording check: several 30 s clips spread across the recording, each classified; reports every language that takes a real share
// (so a recording that switches between Arabic and English says both) and flags audio with no clear voice (instrumental).
export async function detectLanguageSegments(samples,{token,onStep,clips=8,clipSeconds=30,minConfidence=.45,minShare=.2}={}){
 const duration=samples.length/16000,count=Math.max(1,Math.min(clips,Math.ceil(duration/clipSeconds))),results=[];
 for(let index=0;index<count;index++){
  const from=count===1?0:index*Math.max(0,duration-clipSeconds)/(count-1);
  const rms=(()=>{let sum=0;const a=Math.floor(from*16000),b=Math.min(samples.length,a+clipSeconds*16000);for(let i=a;i<b;i+=16)sum+=samples[i]*samples[i];return Math.sqrt(sum/Math.max(1,(b-a)/16));})();
  if(rms<.005)continue; // silence
  onStep?.(results.length+1,count);
  const ranked=await detectLanguages(samples,{token,from,seconds:clipSeconds});
  results.push({from,top:ranked[0],second:ranked[1]});
 }
 const confident=results.filter(item=>item.top.probability>=minConfidence),tally=new Map();
 for(const item of confident)tally.set(item.top.code,(tally.get(item.top.code)||0)+1);
 const languages=[...tally.entries()].map(([code,hits])=>({code,share:hits/confident.length,clips:hits})).filter(item=>item.share>=minShare||confident.length<3).sort((a,b)=>b.clips-a.clips);
 return {languages,multiple:languages.length>1,instrumental:!confident.length,analysed:results.length};
}
