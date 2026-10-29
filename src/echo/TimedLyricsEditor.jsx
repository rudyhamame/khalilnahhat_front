import {Plus,Trash2} from 'lucide-react';

export default function TimedLyricsEditor({value,onChange,expanded=false}){
 if(!value?.lines?.length)return null;
 const edit=(index,key,entry)=>onChange({...value,lines:value.lines.map((line,i)=>i===index?{...line,[key]:entry}:line)});
 const add=index=>{
  const lines=[...value.lines],start=lines[index]?.end||0,end=lines[index+1]?.start;
  lines.splice(index+1,0,{start,end:end>start?end:start+1,text:''});
  onChange({...value,lines});
 };
 const content=<><p>One row per timed lyric. Edit the words and start/end seconds independently.</p><div className="timed-lyrics-lines">{value.lines.map((line,index)=><div key={index} className="timed-lyric-row"><span className="timed-lyric-number">{index+1}</span><label>Start · seconds<input aria-label={'Line '+(index+1)+' start seconds'} type="number" min="0" max="86400" step="0.01" required value={line.start} onChange={e=>edit(index,'start',e.target.value===''?'':Number(e.target.value))}/></label><label>End · seconds<input aria-label={'Line '+(index+1)+' end seconds'} type="number" min={Number(line.start)+0.01} max="86400" step="0.01" required value={line.end} onChange={e=>edit(index,'end',e.target.value===''?'':Number(e.target.value))}/></label><label className="timed-lyric-text">Lyrics<textarea dir="auto" rows={2} maxLength={4000} required value={line.text} onChange={e=>edit(index,'text',e.target.value)}/></label><div className="timed-lyric-actions"><button type="button" title="Insert lyric row below" aria-label={'Insert row after line '+(index+1)} disabled={value.lines.length>=3000} onClick={()=>add(index)}><Plus size={15}/></button><button type="button" title="Delete lyric row" aria-label={'Delete line '+(index+1)} disabled={value.lines.length===1} onClick={()=>onChange({...value,lines:value.lines.filter((_,i)=>i!==index)})}><Trash2 size={15}/></button></div></div>)}</div><button type="button" onClick={()=>onChange(null)}>Remove timestamps</button></>;
 return expanded?<section className="timed-lyrics-editor"><header><h4>Lyrics text</h4><small>{value.lines.length} timed rows · {value.model}</small></header>{content}</section>:<details className="timed-lyrics-editor"><summary>Timed lyrics · {value.lines.length} rows</summary>{content}</details>;
}
