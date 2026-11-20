import {RectangleHorizontal,RectangleVertical} from 'lucide-react';
// The live output ratios, shown as cards like the source choices.
const RATIO_CARDS=[['landscape','Landscape','16:9 · YouTube',RectangleHorizontal],['portrait','Portrait','9:16 · Instagram, TikTok',RectangleVertical]];
export default function RatioCards({format,onChange,locked}){
  return <div className="studio-inputs collab-format"><span className="studio-label">Live output ratio</span>
   <div className="studio-source-grid ratio-grid" role="group" aria-label="Live output ratio">
    {RATIO_CARDS.map(([id,text,description,Icon])=><button key={id} type="button" aria-pressed={format===id} disabled={locked} title={locked?'Stop the live to change the ratio.':text} onClick={()=>onChange(id)}><Icon size={20} aria-hidden="true"/><span><strong>{text}</strong><small>{description}</small></span></button>)}
   </div></div>;
}
