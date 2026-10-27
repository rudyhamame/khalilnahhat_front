export const SPEECH_MORPHS=['V_Open','V_Wide','V_Tight_O','V_Dental_Lip','V_Affricate','V_Explosive','V_Tight','V_Lip_Open','Jaw_Open'];
const clamp=(value,low=0,high=1)=>Math.min(high,Math.max(low,Number.isFinite(value)?value:0));
export function isAssistantAudible(state,call){
  const audio=state?.audio;
  return !!(call==='active'&&state.outputPlaying===true&&!state.listening&&state.analyser&&audio&&!audio.paused&&!audio.muted&&audio.volume>0);
}

// This is an audio-feature viseme estimate, not a phoneme recognizer. It never
// synthesizes speech motion from elapsed time or the caller's microphone.
export function speechFeatures(pcm, spectrum, sampleRate=48000, playing=true){
  const neutral={level:0,open:0,round:0,wide:0,fricative:0};
  if(!playing||!pcm?.length)return neutral;
  let energy=0;for(const sample of pcm)energy+=sample*sample;
  const rms=Math.sqrt(energy/pcm.length);
  if(!Number.isFinite(rms)||rms<.008)return neutral;
  const band=(low,high)=>{
    if(!spectrum?.length)return 0;
    const binHz=sampleRate/(spectrum.length*2);
    const from=Math.max(0,Math.floor(low/binHz)),to=Math.min(spectrum.length,Math.ceil(high/binHz));
    let sum=0;for(let i=from;i<to;i++)sum+=(spectrum[i]/255)**2;
    return to>from?sum/(to-from):0;
  };
  const low=band(150,650),mid=band(650,1800),high=band(1800,4200),air=band(4200,8000);
  const total=low+mid+high+air+.00001;
  const level=clamp((rms-.008)*7.5);
  return {level,open:clamp(level*(.65+mid/total)),round:clamp(level*low/total*.7),wide:clamp(level*(mid+high)/total*.6),fricative:clamp(level*(high+air)/total*.85)};
}

export function speechMorphs(features){
  return {V_Open:features.open*.65,V_Lip_Open:features.open*.18,V_Tight_O:features.round*.45,V_Wide:features.wide*.45,V_Dental_Lip:features.fricative*.25,V_Affricate:features.fricative*.18,V_Explosive:0,V_Tight:0,Jaw_Open:features.open*.12};
}

export function conversationGesture(text=''){
  // Deliberately modest conversational cues, not claimed emotion recognition.
  const content=String(text).slice(-1200).toLowerCase();
  if(/[?؟]/.test(content))return 'question';
  if(/welcome|hello|hi there|أهلاً|أهلا|مرحب/.test(content))return 'welcome';
  if(/review|details|services|option|مراجعة|تفاصيل|خدمات|خيارات/.test(content))return 'explain';
  return 'neutral';
}

export function handleAvatarVoiceEvent(state,event){
  if(event.type==='input_audio_buffer.speech_started'){state.listening=true;state.outputPlaying=false;}
  if(event.type==='input_audio_buffer.speech_stopped')state.listening=false;
  if(event.type==='output_audio_buffer.started'){state.outputPlaying=true;state.listening=false;}
  if(['output_audio_buffer.stopped','output_audio_buffer.cleared'].includes(event.type))state.outputPlaying=false;
  if(event.type==='response.created')state.utterance='';
  if(event.type==='response.output_audio_transcript.delta')state.utterance=(state.utterance||'').concat(event.delta||'').slice(-2000);
  if(event.type==='response.output_audio_transcript.done')state.utterance=String(event.transcript||'').slice(-2000);
  state.gesture=conversationGesture(state.utterance);
}
