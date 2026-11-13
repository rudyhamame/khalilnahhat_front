// A natural question for a booking field. Labels that already are questions ("How should we reach you?") are used as they are, with the choices
// added ("How should we reach you — Email, Phone or WhatsApp?"); other labels get a "What …" question. Never a doubled question mark.
const QUESTION_START=/^(how|what|which|when|where|who|why|is|are|do|does|will|would|can|could|should|did)\b/i;
const OPTION_NAMES={whatsapp:'WhatsApp',gta:'Inside the GTA',outside_gta:'Outside the GTA',djmc:'DJ and MC',dj_mc:'DJ and MC'};
const optionName=value=>OPTION_NAMES[String(value).toLowerCase()]||String(value).replace(/_/g,' ').replace(/^./,letter=>letter.toUpperCase());
const joinOr=(items,word)=>items.length<2?items.join(''):`${items.slice(0,-1).join(', ')} ${word} ${items[items.length-1]}`;
export function fieldQuestion(definition,ar=false){
  const raw=String((ar?definition?.ar:definition?.label)||definition?.label||definition?.key||'').trim();
  const stem=raw.replace(/[?؟\s]+$/,'');
  const options=Array.isArray(definition?.options)?definition.options:[];
  if(ar){return `${stem}؟`;}
  if(QUESTION_START.test(stem))return options.length?`${stem} — ${joinOr(options.map(optionName),'or')}?`:`${stem}?`;
  return `What would you like for ${stem}?`;
}
