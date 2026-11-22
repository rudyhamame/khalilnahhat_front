import {buildEidosTree,splitMapBranches} from '../lib/edenConceptMap';
import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {AudioLines,Bot,CalendarDays,ChevronDown,DollarSign,Layers,Network,Sparkles,Minus,Plus,X} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {buildTreeNodes,stepsOf,treeAtoms,withServiceIds} from '../lib/treeCore';
import {loadWorkVocabulary} from '../lib/workVocabulary';
import {fieldName} from '../lib/eventOrderCore.mjs';
import {fieldCode} from '../lib/eventPageModel';
import {useConceptMapNavigation} from '../echo/useConceptMapNavigation';
import EidosAside from './EidosAside';
import './adminTreeOfTruth.css';

const MAP_GOALS=[{id:'booking',label:'Booking'},{id:'music-work',label:'Music Work'},{id:'contact-us',label:'Contact Us'}];
const STEP_NAMES=['Personal info','Event info','DJ','Rental','Additional info'];
const childPath=(path,node,index)=>path==='root'?node.branch:`${path}/${node.key??index}`;
const ICONS={services:Layers,events:CalendarDays,music:AudioLines,prices:DollarSign,booking:Network,ai:Bot,eidos:Sparkles};

function TreeNode({node,path,parent='root',branch,focus,selectedPath,onSelect,side='right',expansion}){
 const [expanded,setExpanded]=useState(true),hasChildren=Boolean(node.children?.length),Icon=ICONS[node.branch];
 useEffect(()=>{if(expansion?.revision)setExpanded(expansion.expanded);},[expansion]);
 useEffect(()=>{if(selectedPath===path||selectedPath?.startsWith(path+'/'))setExpanded(true);},[selectedPath,path]);
 return <div data-side={side} className={`tot-subtree${node.branch?' tot-branch tot-branch-'+node.branch:''}`}>
  <div className={`tot-node-card${node.branch?' tot-concept':''}${node.removed?' is-removed':''}${node.disabled?' is-off':''}${selectedPath===path?' is-selected':''}${(node.branch&&focus===node.branch)||(node.source&&focus===node.source)?' is-fed':''}`} data-node={path} data-parent={parent} data-branch={branch} data-side={side}>
   <button className="tot-node-select" type="button" onClick={()=>onSelect(path)} aria-pressed={selectedPath===path} aria-controls="tot-node-inspector">
    {node.identityOnly?<code title={node.id}>{node.id}</code>:<><span className="tot-node-title">{Icon&&<Icon size={17}/>}<strong>{node.label}</strong></span>{node.id&&<code title={String(node.id)}>{node.id}</code>}{node.note&&<small>{node.note}</small>}{node.data?.eidosId&&<code className="tot-atom-seed" title={node.data.eidosId}>Eidos · {node.data.eidosId}</code>}</>}
   </button>
   {hasChildren&&<button type="button" className="tot-expand" aria-label={`${expanded?'Collapse':'Expand'} ${node.label}`} aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>{node.children.length}<ChevronDown size={12}/></button>}
  </div>
  {hasChildren&&expanded&&<div className="tot-children">{node.children.map((child,index)=><TreeNode key={child.key||child.id||index} node={child} path={childPath(path,child,index)} parent={path} branch={branch} focus={focus} selectedPath={selectedPath} onSelect={onSelect} side={side} expansion={expansion}/>)}</div>}
 </div>;
}

function TreeCanvas({nodes,focus,selectedPath,onSelect,identityOnly=false,rootVisible=true,rootLabel='Booking',rootNote='Catalogue → booking → AI'}){
 const viewport=useRef(null),frame=useRef(null),graph=useRef(null);
 const [scale,setScale]=useState(.75),[size,setSize]=useState({width:1600,height:1600}),[edges,setEdges]=useState([]),[viewportSize,setViewportSize]=useState({width:0,height:0}),[previewNodes,setPreviewNodes]=useState([]),[visible,setVisible]=useState({x:0,y:0,width:0,height:0});
 const [layout,setLayout]=useState('around'),[expansion,setExpansion]=useState({expanded:true,revision:0});
 const wings=splitMapBranches(nodes,layout);
 const centerNode=useCallback((path='root')=>{
  const node=[...(graph.current?.querySelectorAll('[data-node]')||[])].find(element=>element.dataset.node===path);
  const view=viewport.current;if(!node||!view)return;
  const a=view.getBoundingClientRect(),b=node.getBoundingClientRect();
  view.scrollBy({left:b.left+b.width/2-a.left-view.clientWidth/2,top:b.top+b.height/2-a.top-view.clientHeight/2});
 },[]);
 const {zoomTo,panning,onClickCapture}=useConceptMapNavigation({viewport,frame,scale,onZoom:setScale,minScale:.02,maxScale:1.75});
 useLayoutEffect(()=>{
  const element=viewport.current;
  const update=()=>setViewportSize(previous=>{
   const width=element.clientWidth,height=element.clientHeight;
   return previous.width===width&&previous.height===height?previous:{width,height};
  });
  const observer=new ResizeObserver(update);observer.observe(element);update();
  return()=>observer.disconnect();
 },[]);
 useLayoutEffect(()=>{
  const element=graph.current;
  const update=()=>{
   const width=element.offsetWidth,height=element.offsetHeight;
   setSize(previous=>previous.width===width&&previous.height===height?previous:{width,height});
   // Convert every visible node to graph coordinates, independent of nesting and zoom.
   const bounds=element.getBoundingClientRect(),ratio=bounds.width/width;
   const boxes=new Map([...element.querySelectorAll('[data-node]')].map(node=>{const rect=node.getBoundingClientRect();return[node.dataset.node,{x:(rect.left-bounds.left)/ratio,y:(rect.top-bounds.top+rect.height/2)/ratio,width:rect.width/ratio,height:rect.height/ratio,parent:node.dataset.parent,branch:node.dataset.branch,side:node.dataset.side}];}));
   const mini=[...boxes].map(([id,box])=>({id,...box}));
   setPreviewNodes(previous=>JSON.stringify(previous)===JSON.stringify(mini)?previous:mini);
   const next=[];
   for(const [id,box] of boxes){const parent=boxes.get(box.parent);if(!parent)continue;next.push({id,x0:box.side==='left'?parent.x:parent.x+parent.width,y0:parent.y,x1:box.side==='left'?box.x+box.width:box.x,y1:box.y,branch:box.branch});}
   setEdges(previous=>JSON.stringify(previous)===JSON.stringify(next)?previous:next);
  };
  const observer=new ResizeObserver(update);observer.observe(element);
  const mutations=new MutationObserver(update);mutations.observe(element,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});update();
  return()=>{observer.disconnect();mutations.disconnect();};
 },[]);
 const updateVisible=useCallback(()=>{
  const view=viewport.current,content=frame.current;if(!view||!content)return;
  const a=view.getBoundingClientRect(),b=content.getBoundingClientRect();
  setVisible({x:(a.left-b.left)/scale,y:(a.top-b.top)/scale,width:view.clientWidth/scale,height:view.clientHeight/scale});
 },[scale]);
 useLayoutEffect(()=>{updateVisible();},[updateVisible,size,viewportSize]);
 useLayoutEffect(()=>{
  const id=requestAnimationFrame(()=>centerNode(selectedPath||'root'));
  return()=>cancelAnimationFrame(id);
 },[selectedPath,layout,nodes.length,viewportSize.width,viewportSize.height,centerNode]);
 const navigatePreview=event=>{
  const svg=event.currentTarget.querySelector('svg'),matrix=svg.getScreenCTM();if(!matrix)return;
  const point=event.detail===0?{x:size.width/2,y:size.height/2}:new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
  const view=viewport.current,a=view.getBoundingClientRect(),b=frame.current.getBoundingClientRect();
  view.scrollBy({left:b.left-a.left+point.x*scale-view.clientWidth/2,top:b.top-a.top+point.y*scale-view.clientHeight/2});
 };
 const fit=()=>{const view=viewport.current;zoomTo(Math.max(.02,Math.min(1,(view.clientWidth-64)/size.width,(view.clientHeight-64)/size.height)));requestAnimationFrame(()=>view.scrollTo(0,0));};
 return <div className="tot-map">
  <div className="tot-map-controls"><span>Drag to pan · Scroll or pinch to zoom · Collapse any branch</span><div className="tot-layout-controls"><label>Branches <select aria-label="Branch layout" value={layout} onChange={event=>setLayout(event.target.value)}><option value="around">Around root</option><option value="right">To the right</option><option value="left">To the left</option></select></label><button type="button" onClick={()=>centerNode()}>Center</button><button type="button" onClick={()=>setExpansion(current=>({expanded:!current.expanded,revision:current.revision+1}))}>{expansion.expanded?'Collapse all':'Expand all'}</button></div><div role="group" aria-label="Concept map zoom"><button type="button" className="tot-map-icon-button" aria-label="Zoom out" onClick={()=>zoomTo(scale/1.2)}><Minus size={16}/></button><output>{Math.round(scale*100)}%</output><button type="button" className="tot-map-icon-button" aria-label="Zoom in" onClick={()=>zoomTo(scale*1.2)}><Plus size={16}/></button><button type="button" onClick={fit}>Fit tree</button><button type="button" onClick={()=>zoomTo(1)}>100%</button></div></div>
  <div className={`tot-viewport${panning?' is-panning':''}`} ref={viewport} onScroll={updateVisible} onClickCapture={onClickCapture} tabIndex={0} aria-label="Eden of Eide. Drag to pan, scroll or pinch to zoom.">
   <div className="tot-canvas" style={{width:Math.max(viewportSize.width,size.width*scale+64),height:Math.max(viewportSize.height,size.height*scale+64)}}><div ref={frame} className="tot-frame" style={{width:size.width*scale,height:size.height*scale}}>
    <div ref={graph} className="tot-graph" style={{transform:`scale(${scale})`}}>
     <svg className="tot-edges" width={size.width} height={size.height} aria-hidden="true">{edges.map(edge=>{const middle=(edge.x0+edge.x1)/2;return <g key={edge.id} className={`tot-branch-${edge.branch}`} style={{opacity:focus&&focus!==edge.branch? .35: .8}}><path d={`M ${edge.x0} ${edge.y0} C ${middle} ${edge.y0}, ${middle} ${edge.y1}, ${edge.x1} ${edge.y1}`}/><circle cx={edge.x1} cy={edge.y1} r="3"/></g>;})}</svg>
     {wings.left.length>0&&<div className="tot-branches tot-wing-left">{wings.left.map(node=><TreeNode key={node.key||node.branch} node={node} path={node.key||node.branch} branch={node.branch} focus={focus} selectedPath={selectedPath} onSelect={onSelect} side="left" expansion={expansion}/>)}</div>}
     {rootVisible&&<button type="button" className={`tot-tree-root${selectedPath==='root'?' is-selected':''}`} data-node="root" onClick={()=>onSelect('root')} aria-pressed={selectedPath==='root'} aria-controls="tot-node-inspector">{identityOnly?<code>booking</code>:<><Sparkles size={24}/><small>ECHO / SHARED SOURCE</small><strong>{rootLabel}</strong><span>{rootNote}</span></>}</button>}
     {!rootVisible&&!nodes.length&&<p className="tot-no-seeds">No identity seeds. Add Eidos to create one.</p>}
     {wings.right.length>0&&<div className="tot-branches tot-wing-right">{wings.right.map(node=><TreeNode key={node.key||node.branch} node={node} path={node.key||node.branch} branch={node.branch} focus={focus} selectedPath={selectedPath} onSelect={onSelect} side="right" expansion={expansion}/>)}</div>}
    </div>
   </div></div>
  </div>
  <button type="button" className="tot-minimap" aria-label="Tree preview. Click to navigate; use arrow keys to pan." onClick={navigatePreview} onKeyDown={event=>{const movement={ArrowLeft:[-160,0],ArrowRight:[160,0],ArrowUp:[0,-160],ArrowDown:[0,160]}[event.key];if(movement){event.preventDefault();viewport.current.scrollBy(...movement);}}}>
   <span>Tree preview</span><svg viewBox={`0 0 ${size.width} ${size.height}`} preserveAspectRatio="none" aria-hidden="true">
    {edges.map(edge=><path key={edge.id} className={`tot-branch-${edge.branch}`} d={`M ${edge.x0} ${edge.y0} L ${edge.x1} ${edge.y1}`}/>)}
    {previewNodes.map(node=><rect key={node.id} className={`tot-mini-node tot-branch-${node.branch||'events'}`} x={node.x} y={node.y-node.height/2} width={node.width} height={node.height}/>)}
    <rect className="tot-mini-visible" x={Math.max(0,visible.x)} y={Math.max(0,visible.y)} width={Math.max(0,Math.min(size.width,visible.x+visible.width)-Math.max(0,visible.x))} height={Math.max(0,Math.min(size.height,visible.y+visible.height)-Math.max(0,visible.y))}/>
   </svg>
  </button>
 </div>;
}

function DataValue({value,uiLabelPaths=[],path=''}){
 if(value===null||value===undefined)return <span className="tot-data-empty">Not set</span>;
 if(typeof value==='boolean')return <span>{value?'Yes':'No'}</span>;
 if(typeof value!=='object')return <span>{String(value)||'—'}</span>;
 const entries=Object.entries(value);
 if(!entries.length)return <span className="tot-data-empty">{Array.isArray(value)?'No entries':'No properties'}</span>;
 return <dl className="tot-data-properties">{entries.map(([key,item])=><div key={key}><dt>{Array.isArray(value)?Number(key)+1:key==='fourthGoal'?'fourth goal':key}</dt><dd><DataValue value={item} uiLabelPaths={uiLabelPaths} path={path?`${path}.${key}`:key}/>{uiLabelPaths.includes(path?`${path}.${key}`:key)&&<small className="tot-ui-label-note">UI label only · not stored in the Eidos seed</small>}</dd></div>)}</dl>;
}

export function NodeInspector({selection,onSelect,onClear}){
 const node=selection?.node;
 const uiLabelPaths=node?.uiLabelOnly?['name']:node?.data?.bookingAtom?['bookingAtom.label']:[];
 const displayName=node?.uiLabelOnly?node.label:node?.data?.bookingAtom?.label;
 return <aside className="tot-inspector" id="tot-node-inspector" aria-label="Tree item details">
  <header><span>Item details</span>{node&&<button type="button" onClick={onClear} aria-label="Clear selected item"><X size={15}/></button>}</header>
  {!node?<div className="tot-inspector-empty"><Network size={26}/><strong>Select a tree item</strong><p>Click any item to view its data and connections here.</p></div>:<div className="tot-inspector-scroll" key={selection.path}>
   <div className="tot-inspector-heading"><small>{selection.trail.join(' / ')}</small><h2>{node.label}</h2>{node.note&&<p>{node.note}</p>}</div>
   <dl className="tot-inspector-meta">{displayName&&<div><dt>Display name</dt><dd>{displayName}<small className="tot-ui-label-note">UI label only · not stored in the Eidos seed. The Eidos ID is its identity.</small></dd></div>}{node.id&&<div><dt>ID</dt><dd><code>{node.id}</code></dd></div>}{node.source&&<div><dt>Source</dt><dd>{node.source}</dd></div>}{node.removed&&<div><dt>Status</dt><dd>Removed</dd></div>}{node.disabled&&<div><dt>Status</dt><dd>Not mounted</dd></div>}</dl>
   {node.data!==undefined&&<section><h3>Data</h3><DataValue value={node.data} uiLabelPaths={uiLabelPaths}/></section>}
   {node.children?.length>0&&<section><h3>Connected items <span>{node.children.length}</span></h3><div className="tot-inspector-children">{node.children.map((child,index)=><button type="button" key={child.key||child.id||index} onClick={()=>onSelect(childPath(selection.path,child,index))}><strong>{child.label}</strong>{child.id&&<code>{child.id}</code>}</button>)}</div></section>}
   {node.data===undefined&&!node.children?.length&&<p className="tot-inspector-note">{node.note||'This is a reference node in the tree.'}</p>}
  </div>}
 </aside>;
}

export default function AdminTreeOfTruth({token}){
 const [data,setData]=useState(null),[vocab,setVocab]=useState(null),[error,setError]=useState(''),[focus,setFocus]=useState(''),[selectedPath,setSelectedPath]=useState(''),[eidos,setEidos]=useState([]),[bookingAtomSeeds,setBookingAtomSeeds]=useState([]),[goal,setGoal]=useState('booking');
 const load=useCallback(()=>Promise.all([
  apiRequest('/admin/setup-catalog',{token}),apiRequest('/equipment/admin',{token}),
  apiRequest('/admin/setup-catalog/deleted',{token}).catch(()=>({items:[],equipment:[]})),
  apiRequest('/prices',{token}).catch(()=>({items:[]})),
 ]).then(([catalog,equipment,removed,prices])=>{setData({catalog:catalog.items||[],equipment:equipment.items||[],removed:{items:removed.items||[],equipment:removed.equipment||[]},prices:prices.items||[]});setError('');})
  .catch(failure=>setError(failure.message||'Could not load the tree.')),[token]);
 useEffect(()=>{load();loadWorkVocabulary().then(setVocab).catch(()=>setVocab({}));const changed=()=>load();window.addEventListener('echo:administrator-data-changed',changed);window.addEventListener('echo:setup-catalog-changed',changed);return()=>{window.removeEventListener('echo:administrator-data-changed',changed);window.removeEventListener('echo:setup-catalog-changed',changed);};},[load]);

 const atomBySeed=useMemo(()=>{
  const active=new Set(eidos.map(item=>item.id));
  return Object.fromEntries(bookingAtomSeeds.filter(link=>active.has(link.eidosId)).map(link=>[link.eidosId,{...link,label:fieldName(link.atomId)||link.atomId,code:fieldCode(link.atomId)}]));
 },[bookingAtomSeeds,eidos]);
 const seedByAtom=useMemo(()=>Object.fromEntries(Object.values(atomBySeed).map(link=>[link.atomId,link.eidosId])),[atomBySeed]);
 const view=useMemo(()=>{
  if(!data)return null;
  const services=data.catalog.filter(row=>row.kind==='service'),events=data.catalog.filter(row=>row.kind==='event'),equipment=withServiceIds(data.catalog,data.equipment),steps=stepsOf(data.catalog);
  const {nodes,orphans}=buildTreeNodes({services,equipment,removed:data.removed});
  const priced=new Set(data.prices.map(price=>price.serviceId||price.id));
  const unpriced=services.filter(row=>!priced.has(row.priceId||'service-'+row.id)).map(row=>row.id);
  const atoms=new Map();
  for(const atom of treeAtoms(steps,{includeMetadata:true})){if(!atoms.has(atom.step))atoms.set(atom.step,new Map());const bySection=atoms.get(atom.step);if(!bySection.has(atom.section))bySection.set(atom.section,[]);bySection.get(atom.section).push({...atom,name:fieldName(atom.id)||atom.id.split('.').pop(),eidosId:seedByAtom[atom.id]||null});}
  return {services,events,equipment,steps,nodes,orphans,atoms,prices:data.prices,unpriced};
 },[data,seedByAtom]);

 const {steps,nodes,atoms,services,events,equipment,prices,unpriced}=view||{steps:stepsOf([]),nodes:[],atoms:new Map(),services:[],events:[],equipment:[],prices:[],unpriced:[]},music=vocab||{};
 const present=[true,true,steps.dj,steps.rental,true],allAtoms=[...atoms.values()].flatMap(sections=>[...sections.values()].flat());
 const leaf=row=>typeof row==='string'?{id:row,label:row,data:row}:{id:row.id,label:row.name||row.id,data:row};
 const group=(label,rows)=>({label,children:rows.length?rows:[{label:'No entries'}]});
 const languageById=new Map((music.languages||[]).map(row=>[row.id,row.name]));
 const tree=[
  {branch:'services',label:'Services & equipment',note:`${services.length} services · ${equipment.length} equipment items`,children:[
   ...nodes.map(node=>({...leaf(node),data:data.catalog.find(row=>row.id===node.id)||node,removed:node.removed,note:node.removed?'Removed service':`${node.items.length} equipment items`,children:[...node.items.map(leaf),...node.removedItems.map(item=>({...leaf(item),removed:true,note:'Removed equipment'}))]})),
   ...(view?.orphans.length?[group('Removed equipment without a service',view.orphans.map(item=>({...leaf(item),removed:true})))]:[]),
  ]},
  {branch:'events',label:'Events',note:`${events.length} event types`,children:[group('Event types',events.map(leaf))]},
  {branch:'music',label:'Music preferences',note:'Work Elements · music vocabulary',children:[
   group('Languages',(music.languages||[]).map(language=>({...leaf(language),children:(music.dialects||[]).filter(dialect=>dialect.languageIds.includes(language.id)).map(leaf)}))),
   group('Dialects',(music.dialects||[]).map(dialect=>({...leaf(dialect),children:dialect.languageIds.map(id=>({id,label:languageById.get(id)||id}))}))),
   group('Genres',(music.genreCards||[]).map(genre=>({...leaf(genre),note:genre.description}))),
   group('Artists / vocalists',(music.vocalists||[]).map(artist=>({...leaf(artist),children:[...(artist.languages||[]).map(name=>({label:name,note:'Language'})),...(artist.dialects||[]).map(name=>({label:name,note:'Dialect'}))]}))),
   group('Event moments',(music.moments||[]).map(leaf)),
  ]},
  {branch:'prices',label:'Prices',note:`${prices.length} price rows`,children:[group('Price rows',prices.map(price=>({...leaf(price),note:`${(Number(price.amountCents||0)/100).toFixed(2)} ${price.currency||'CAD'}`,children:[{label:'Linked catalogue ID',id:price.serviceId||price.equipmentId||price.id,data:data.catalog.find(row=>row.id===price.serviceId)||equipment.find(row=>row.id===price.equipmentId)}]}))),...(unpriced.length?[group('Services without a price row',unpriced.map(leaf))]:[]),{label:'Booking quotes',note:'Prices feed the quote'}]},
  {branch:'ai',label:'Echo AI',note:'Connected reader of the tree',children:[{label:'Available services',children:[{id:'dj',label:'DJ',note:steps.dj?'Offered':'Not offered'},{id:'rental',label:'Rental',note:steps.rental?'Offered':'Not offered'}]},group('Booking steps',STEP_NAMES.filter((_,index)=>present[index]).map(label=>({label}))),{label:'Client conversations',note:'Uses the tree to understand services and booking steps'}]},
 ];
 // Every seed owns its visible tree; shared catalogues remain available in this same canvas.
 const sourceTree=tree;
 const displayTree=buildEidosTree({eidos,atomBySeed,atoms:allAtoms,sources:sourceTree});
 const currentGoal=MAP_GOALS.find(item=>item.id===goal);
 const goalTree=goal==='booking'?displayTree:goal==='music-work'?sourceTree.filter(node=>node.branch==='music'):[];
 const goalNote=goal==='booking'?'Eidos → Booking → sources':goal==='music-work'?'Shared Work Elements · Eidos links not configured':'No Eidos connections yet';
 const rootNode=goal==='booking'?{label:'Booking',id:'booking',data:{...eidos.find(item=>item.id==='booking'),services:services.length,equipment:equipment.length,eventTypes:events.length,priceRows:prices.length,dataAtoms:allAtoms.length,steps},children:displayTree}:{label:currentGoal.label,note:goalNote,children:goalTree};
 const resolveSelection=path=>{
  if(!path)return null;
  if(path==='root')return{node:rootNode,path,trail:[]};
  const [branch,...indices]=path.split('/');let node=goalTree.find(item=>(item.key||item.branch)===branch);const trail=[currentGoal.label];
  for(const index of indices){if(!node)return null;trail.push(node.label);node=node.children?.find(child=>String(child.key)===index)||node.children?.[Number(index)];}
  return node?{node,path,trail,branch:node.branch||branch}:null;
 };
 const selection=resolveSelection(selectedPath);
 const selectNode=path=>{const item=resolveSelection(path);if(!item)return;setSelectedPath(path);setFocus(item.node.branch||item.node.source||item.branch||'');};
 const changeGoal=next=>{setGoal(next);setSelectedPath('');setFocus('');};
 const goalKeys=(event,index)=>{
  const next=event.key==='ArrowRight'?(index+1)%MAP_GOALS.length:event.key==='ArrowLeft'?(index+MAP_GOALS.length-1)%MAP_GOALS.length:event.key==='Home'?0:event.key==='End'?MAP_GOALS.length-1:null;
  if(next===null)return;event.preventDefault();changeGoal(MAP_GOALS[next].id);document.getElementById(`tot-goal-${MAP_GOALS[next].id}`)?.focus();
 };
 return <section className="tot" aria-label="Eden of Eide concept map"><div className="tot-workbench">
  <EidosAside atomBySeed={atomBySeed} onBookingAtoms={setBookingAtomSeeds} onClear={()=>{setSelectedPath('');setFocus('');}} token={token} items={eidos} onItems={setEidos} selectedId={selectedPath==='root'?'booking':selection?.node.data?.eidosId||selection?.node.id} onSelect={item=>{setGoal('booking');setSelectedPath(item.id==='booking'?'root':item.id);setFocus(item.id==='booking'?'':'eidos');}}/>
  <div className="tot-stage">
  <header className="tot-mode-header"><h1>Eden of Eide</h1><div className="tot-goal-tabs" role="tablist" aria-label="Concept map goals">{MAP_GOALS.map((item,index)=><button type="button" role="tab" key={item.id} id={`tot-goal-${item.id}`} aria-selected={goal===item.id} aria-controls={`tot-goal-panel-${item.id}`} tabIndex={goal===item.id?0:-1} onClick={()=>changeGoal(item.id)} onKeyDown={event=>goalKeys(event,index)}>{item.label}</button>)}</div></header>
  <div className="tot-toolbar"><span>{selection?selection.node.label:'Select an item to view its data'}</span>{selection&&<button type="button" onClick={()=>{setFocus('');setSelectedPath('');}}><X size={13}/>Clear selection</button>}</div>
  {error&&<p className="tot-error" role="alert">{error}</p>}
  {!view&&!error&&<p className="tot-loading" role="status">Loading Booking sources…</p>}
  <div className="tot-mode-panel" role="tabpanel" id={`tot-goal-panel-${goal}`} aria-labelledby={`tot-goal-${goal}`}><TreeCanvas key={goal} nodes={goalTree} rootLabel={currentGoal.label} rootNote={goalNote} focus={focus} selectedPath={selectedPath} onSelect={selectNode}/></div>
 </div><NodeInspector selection={selection} onSelect={selectNode} onClear={()=>{setSelectedPath('');setFocus('');}}/></div></section>;
}
