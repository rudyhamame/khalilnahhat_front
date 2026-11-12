// Spoken / sung language of an audio clip with a small multilingual Whisper model that runs in the browser (nothing is uploaded).
// Only the first decoder step is evaluated: the probabilities Whisper assigns to its language tokens.
export const WHISPER_LANGUAGES=['en','zh','de','es','ru','ko','fr','ja','pt','tr','pl','ca','nl','ar','sv','it','id','hi','fi','vi','he','uk','el','ms','cs','ro','da','hu','ta','no','th','ur','hr','bg','lt','la','mi','ml','cy','sk','te','fa','lv','bn','sr','az','sl','kn','et','mk','br','eu','is','hy','ne','mn','bs','kk','sq','sw','gl','mr','pa','si','km','sn','yo','so','af','oc','ka','be','tg','sd','gu','am','yi','lo','uz','fo','ht','ps','tk','nn','mt','sa','lb','my','bo','tl','mg','as','tt','haw','ln','ha','ba','jw','su'];
const MODEL='onnx-community/whisper-tiny';
let loading;
async function load(onProgress){
 if(!loading)loading=(async()=>{
  const lib=await import('@huggingface/transformers');
  const [tokenizer,processor,model]=await Promise.all([
   lib.AutoTokenizer.from_pretrained(MODEL),lib.AutoProcessor.from_pretrained(MODEL),
   lib.WhisperForConditionalGeneration.from_pretrained(MODEL,{dtype:'q8',progress_callback:onProgress}),
  ]);
  return {lib,tokenizer,processor,model};
 })().catch(error=>{loading=undefined;throw error;});
 return loading;
}
// samples: mono Float32Array at 16 kHz. Returns the languages ranked by probability: [{code,probability}].
export async function detectLanguages(samples,{onProgress,seconds=30,from=0}={}){
 const {lib,tokenizer,processor,model}=await load(onProgress),clip=samples.slice(Math.floor(from*16000),Math.floor((from+seconds)*16000));
 const inputs=await processor(clip),start=tokenizer.convert_tokens_to_ids(['<|startoftranscript|>'])[0];
 const ids=WHISPER_LANGUAGES.map(code=>tokenizer.convert_tokens_to_ids([`<|${code}|>`])[0]);
 const decoder=new lib.Tensor('int64',BigInt64Array.from([BigInt(start)]),[1,1]);
 const {logits}=await model({input_features:inputs.input_features,decoder_input_ids:decoder});
 const row=logits.data,scores=ids.map(id=>row[id]),top=Math.max(...scores),exp=scores.map(value=>Math.exp(value-top)),sum=exp.reduce((a,b)=>a+b,0);
 return WHISPER_LANGUAGES.map((code,index)=>({code,probability:exp[index]/sum})).sort((a,b)=>b.probability-a.probability);
}

// Whole-recording check: several 30 s clips spread across the recording, each classified; reports every language that takes a real share
// (so a recording that switches between Arabic and English says both) and flags audio with no clear voice (instrumental).
export async function detectLanguageSegments(samples,{onProgress,clips=8,clipSeconds=30,minConfidence=.45,minShare=.2}={}){
 const duration=samples.length/16000,count=Math.max(1,Math.min(clips,Math.ceil(duration/clipSeconds))),results=[];
 for(let index=0;index<count;index++){
  const from=count===1?0:index*Math.max(0,duration-clipSeconds)/(count-1);
  const rms=(()=>{let sum=0;const a=Math.floor(from*16000),b=Math.min(samples.length,a+clipSeconds*16000);for(let i=a;i<b;i+=16)sum+=samples[i]*samples[i];return Math.sqrt(sum/Math.max(1,(b-a)/16));})();
  if(rms<.005)continue; // silence
  const ranked=await detectLanguages(samples,{onProgress,from,seconds:clipSeconds});
  results.push({from,top:ranked[0],second:ranked[1]});
 }
 const confident=results.filter(item=>item.top.probability>=minConfidence),tally=new Map();
 for(const item of confident)tally.set(item.top.code,(tally.get(item.top.code)||0)+1);
 const languages=[...tally.entries()].map(([code,hits])=>({code,share:hits/confident.length,clips:hits})).filter(item=>item.share>=minShare||confident.length<3).sort((a,b)=>b.clips-a.clips);
 return {languages,multiple:languages.length>1,instrumental:!confident.length,analysed:results.length};
}
