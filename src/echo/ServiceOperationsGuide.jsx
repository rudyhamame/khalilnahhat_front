import {BookOpen,Radio,ArrowRight} from 'lucide-react';
import {liveStreamGuide,operationsGuideRoute} from './docs/liveStreamGuide';
import './serviceOperationsGuide.css';

function GuideLink({href,children}) {
 const external=href.startsWith('https://');
 return <a href={href} {...(external?{target:'_blank',rel:'noreferrer'}:{})}>{children}{external&&<span className="sr-only"> (opens in a new tab)</span>}</a>;
}
function GuideBlock({block}) {
 switch(block.type) {
  case 'paragraph':return <p>{block.text}</p>;
  case 'list':return <ul>{block.items.map(item=><li key={item}>{item}</li>)}</ul>;
  case 'steps':return <ol className="operations-guide-steps">{block.items.map((item,index)=><li key={item}><span aria-hidden="true">{String(index+1).padStart(2,'0')}</span><p>{item}</p></li>)}</ol>;
  case 'links':return <nav className="operations-guide-links" aria-label="Related screens and references">{block.items.map(([label,href])=><GuideLink key={href} href={href}>{label}<ArrowRight size={13} aria-hidden="true"/></GuideLink>)}</nav>;
  case 'table':return <div className="operations-guide-table" role="region" aria-label={block.headers.join(', ')} tabIndex={0}><p className="operations-guide-table-hint">Scroll horizontally to read all columns.</p><table><thead><tr>{block.headers.map(header=><th key={header} scope="col">{header}</th>)}</tr></thead><tbody>{block.rows.map((row,index)=><tr key={index}>{row.map((cell,i)=>i===0?<th key={i} scope="row">{cell}</th>:<td key={i}>{cell}</td>)}</tr>)}</tbody></table></div>;
  case 'details':return <details className="operations-guide-details"><summary>{block.title}</summary><div>{block.blocks.map((item,index)=><GuideBlock key={index} block={item}/>)}</div></details>;
  case 'checklist':return <div className="operations-guide-checklist"><h3>{block.title}</h3><p>Use these prompts during a supervised test. No item is marked complete by the system.</p><ul>{block.items.map(item=><li key={item}><span aria-hidden="true">□</span>{item}</li>)}</ul></div>;
  case 'diagram':return <figure className="operations-guide-diagram"><figcaption>{block.label}</figcaption>{block.paths.map((path,index)=><ol key={index} aria-label={'Path '+(index+1)}>{path.map((node,i)=><li key={node}>{i>0&&<ArrowRight size={14} aria-hidden="true"/>}<span>{node}</span></li>)}</ol>)}<p>{block.caption}</p></figure>;
  default:return null;
 }
}
export default function ServiceOperationsGuide() {
 const guide=liveStreamGuide;
 return <article className="operations-guide" aria-labelledby="operations-guide-title">
  <header className="operations-guide-header"><p className="operations-guide-eyebrow"><BookOpen size={15} aria-hidden="true"/> ECHO DOCS</p><h1 id="operations-guide-title">Service Overview &amp; Operations Guide</h1><p>Practical guidance for running Echo services.</p></header>
  <div className="operations-guide-tabs" role="tablist" aria-label="Service guides"><a href={operationsGuideRoute} role="tab" aria-selected="true" id="live-stream-guide-tab" aria-controls="live-stream-guide-panel"><Radio size={15} aria-hidden="true"/>Live Stream</a></div>
  <div role="tabpanel" id="live-stream-guide-panel" aria-labelledby="live-stream-guide-tab">
   <div className="operations-guide-intro"><div><h2>{guide.title}</h2><p>{guide.introduction}</p></div><p className="operations-guide-review">Documentation reviewed <time dateTime={guide.reviewedOn}>{new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(guide.reviewedOn+'T00:00:00Z'))}</time><span>Source review · deployment not verified</span></p></div>
   <div className="operations-guide-layout">
    <nav className="operations-guide-toc" aria-label="Live Stream guide sections"><p>IN THIS GUIDE</p><ol>{guide.sections.map((section,index)=><li key={section.id}><a href={'#guide-'+section.id}><span>{String(index+1).padStart(2,'0')}</span>{section.title}</a></li>)}</ol></nav>
    <div className="operations-guide-body">{guide.sections.map((section,index)=><section key={section.id} id={'guide-'+section.id} aria-labelledby={'guide-heading-'+section.id}><header><span>{String(index+1).padStart(2,'0')}</span><h2 id={'guide-heading-'+section.id}>{section.title}</h2></header>{section.blocks.map((block,i)=><GuideBlock key={i} block={block}/>)}<a className="operations-guide-top" href="#operations-guide-title">Back to top ↑</a></section>)}</div>
   </div>
  </div>
 </article>;
}
