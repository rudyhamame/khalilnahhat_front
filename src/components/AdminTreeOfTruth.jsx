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

const MAP_MODES=[{id:'eidos',label:'Eidos'},{id:'booking',label:'Booking'}];
const STEP_NAMES=['Personal info','Event info','DJ','Rental','Additional info'];
const childPath=(path,node,index)=>path==='root'?node.branch:`${path}/${node.key??index}`;
const ICONS={services:Layers,events:CalendarDays,music:AudioLines,prices:DollarSign,booking:Network,ai:Bot,eidos:Sparkles};

function TreeNode({node,path,parent='root',branch,focus,selectedPath,onSelect}){
 const [expanded,setExpanded]=useState(true),hasChildren=Boolean(node.children?.length),Icon=ICONS[node.branch];
 return <div className={`tot-subtree${node.branch?' tot-branch tot-branch-'+node.branch:''}`}>
  <div className={`tot-node-card${node.branch?' tot-concept':''}${node.removed?' is-removed':''}${node.disabled?' is-off':''}${selectedPath===path?' is-selected':''}${(node.branch&&focus===node.branch)||(node.source&&focus===node.source)?' is-fed':''}`} data-node={path} data-parent={parent} data-branch={branch}>
   <button className="tot-node-select" type="button" onClick={()=>onSelect(path)} aria-pressed={selectedPath===path} aria-controls="tot-node-inspector">
    {node.identityOnly?<code title={node.id}>{node.id}</code>:<><span className="tot-node-title">{Icon&&<Icon size={17}/>}<strong>{node.label}</strong></span>{node.id&&<code title={String(node.id)}>{node.id}</code>}{node.note&&<small>{node.note}</small>}{node.data?.eidosId&&<code className="tot-atom-seed" title={node.data.eidosId}>Eidos · {node.data.eidosId}</code>}</>}
   </button>
   {hasChildren&&<button type="button" className="tot-expand" aria-label={`${expanded?'Collapse':'Expand'} ${node.label}`} aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>{node.children.length}<ChevronDown size={12}/></button>}
  </div>
  {hasChildren&&expanded&&<div className="tot-children">{node.children.map((child,index)=><TreeNode key={child.key||child.id||index} node={child} path={childPath(path,child,index)} parent={path} branch={branch} focus={focus} selectedPath={selectedPath} onSelect={onSelect}/>)}</div>}
 </div>;
}

function TreeCanvas({nodes,focus,selectedPath,onSelect,identityOnly=false,rootVisible=true}){
 const viewport=useRef(null),frame=useRef(null),graph=useRef(null),initialFit=useRef(false);
 const [scale,setScale]=useState(.75),[size,setSize]=useState({width:1600,height:1600}),[edges,setEdges]=useState([]),[viewportSize,setViewportSize]=useState({width:0,height:0}),[previewNodes,setPreviewNodes]=useState([]),[visible,setVisible]=useState({x:0,y:0,width:0,height:0});
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
   if(!initialFit.current&&height>0){initialFit.current=true;requestAnimationFrame(()=>{const view=viewport.current;if(view)view.scrollTop=Math.max(0,height*.75/2-view.clientHeight/2);});}
   setSize(previous=>previous.width===width&&previous.height===height?previous:{width,height});
   // Convert every visible node to graph coordinates, independent of nesting and zoom.
   const bounds=element.getBoundingClientRect(),ratio=bounds.width/width;
   const boxes=new Map([...element.querySelectorAll('[data-node]')].map(node=>{const rect=node.getBoundingClientRect();return[node.dataset.node,{x:(rect.left-bounds.left)/ratio,y:(rect.top-bounds.top+rect.height/2)/ratio,width:rect.width/ratio,height:rect.height/ratio,parent:node.dataset.parent,branch:node.dataset.branch}];}));
   const mini=[...boxes].map(([id,box])=>({id,...box}));
   setPreviewNodes(previous=>JSON.stringify(previous)===JSON.stringify(mini)?previous:mini);
   const next=[];
   for(const [id,box] of boxes){const parent=boxes.get(box.parent);if(!parent)continue;next.push({id,x0:parent.x+parent.width,y0:parent.y,x1:box.x,y1:box.y,branch:box.branch});}
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
 const navigatePreview=event=>{
  const svg=event.currentTarget.querySelector('svg'),matrix=svg.getScreenCTM();if(!matrix)return;
  const point=event.detail===0?{x:size.width/2,y:size.height/2}:new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
  const view=viewport.current,a=view.getBoundingClientRect(),b=frame.current.getBoundingClientRect();
  view.scrollBy({left:b.left-a.left+point.x*scale-view.clientWidth/2,top:b.top-a.top+point.y*scale-view.clientHeight/2});
 };
 const fit=()=>{const view=viewport.current;zoomTo(Math.max(.02,Math.min(1,(view.clientWidth-64)/size.width,(view.clientHeight-64)/size.height)));requestAnimationFrame(()=>view.scrollTo(0,0));};
 return <div className="tot-map">
  <div className="tot-map-controls"><span>Drag to pan · Scroll or pinch to zoom · Collapse any branch</span><div role="group" aria-label="Concept map zoom"><button type="button" className="tot-map-icon-button" aria-label="Zoom out" onClick={()=>zoomTo(scale/1.2)}><Minus size={16}/></button><output>{Math.round(scale*100)}%</output><button type="button" className="tot-map-icon-button" aria-label="Zoom in" onClick={()=>zoomTo(scale*1.2)}><Plus size={16}/></button><button type="button" onClick={fit}>Fit tree</button><button type="button" onClick={()=>zoomTo(1)}>100%</button></div></div>
  <div className={`tot-viewport${panning?' is-panning':''}`} ref={viewport} onScroll={updateVisible} onClickCapture={onClickCapture} tabIndex={0} aria-label="Eden of Eide. Drag to pan, scroll or pinch to zoom.">
   <div className="tot-canvas" style={{width:Math.max(viewportSize.width,size.width*scale+64),height:Math.max(viewportSize.height,size.height*scale+64)}}><div ref={frame} className="tot-frame" style={{width:size.width*scale,height:size.height*scale}}>
    <div ref={graph} className="tot-graph" style={{transform:`scale(${scale})`}}>
     <svg className="tot-edges" width={size.width} height={size.height} aria-hidden="true">{edges.map(edge=>{const middle=(edge.x0+edge.x1)/2;return <g key={edge.id} className={`tot-branch-${edge.branch}`} style={{opacity:focus&&focus!==edge.branch? .35: .8}}><path d={`M ${edge.x0} ${edge.y0} C ${middle} ${edge.y0}, ${middle} ${edge.y1}, ${edge.x1} ${edge.y1}`}/><circle cx={edge.x1} cy={edge.y1} r="3"/></g>;})}</svg>
     {rootVisible&&<button type="button" className={`tot-tree-root${selectedPath==='root'?' is-selected':''}`} data-node="root" onClick={()=>onSelect('root')} aria-pressed={selectedPath==='root'} aria-controls="tot-node-inspector">{identityOnly?<code>booking</code>:<><Sparkles size={24}/><small>ECHO / SHARED SOURCE</small><strong>Booking</strong><span>Catalogue → booking → AI</span></>}</button>}
     {!rootVisible&&!nodes.length&&<p className="tot-no-seeds">No identity seeds. Add Eidos to create one.</p>}
     <div className="tot-branches">{nodes.map(node=><TreeNode key={node.branch} node={node} path={node.branch} branch={node.branch} focus={focus} selectedPath={selectedPath} onSelect={onSelect}/>)}</div>
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

function DataValue({value}){
 if(value===null||value===undefined)return <span className="tot-data-empty">Not set</span>;
 if(typeof value==='boolean')return <span>{value?'Yes':'No'}</span>;
 if(typeof value!=='object')return <span>{String(value)||'—'}</span>;
 const entries=Object.entries(value);
 if(!entries.length)return <span className="tot-data-empty">{Array.isArray(value)?'No entries':'No properties'}</span>;
 return <dl className="tot-data-properties">{entries.map(([key,item])=><div key={key}><dt>{Array.isArray(value)?Number(key)+1:key==='fourthGoal'?'fourth goal':key}</dt><dd><DataValue value={item}/></dd></div>)}</dl>;
}

function NodeInspector({selection,onSelect,onClear}){
 const node=selection?.node;
 return <aside className="tot-inspector" id="tot-node-inspector" aria-label="Tree item details">
  <header><span>Item details</span>{node&&<button type="button" onClick={onClear} aria-label="Clear selected item"><X size={15}/></button>}</header>
  {!node?<div className="tot-inspector-empty"><Network size={26}/><strong>Select a tree item</strong><p>Click any item to view its data and connections here.</p></div>:<div className="tot-inspector-scroll" key={selection.path}>
   <div className="tot-inspector-heading"><small>{selection.trail.join(' / ')}</small><h2>{node.label}</h2>{node.note&&<p>{node.note}</p>}</div>
   <dl className="tot-inspector-meta">{node.id&&<div><dt>ID</dt><dd><code>{node.id}</code></dd></div>}{node.source&&<div><dt>Source</dt><dd>{node.source}</dd></div>}{node.removed&&<div><dt>Status</dt><dd>Removed</dd></div>}{node.disabled&&<div><dt>Status</dt><dd>Not mounted</dd></div>}</dl>
   {node.data!==undefined&&<section><h3>Data</h3><DataValue value={node.data}/></section>}
   {node.children?.length>0&&<section><h3>Connected items <span>{node.children.length}</span></h3><div className="tot-inspector-children">{node.children.map((child,index)=><button type="button" key={child.key||child.id||index} onClick={()=>onSelect(childPath(selection.path,child,index))}><strong>{child.label}</strong>{child.id&&<code>{child.id}</code>}</button>)}</div></section>}
   {node.data===undefined&&!node.children?.length&&<p className="tot-inspector-note">{node.note||'This is a reference node in the tree.'}</p>}
  </div>}
 </aside>;
}

export default function AdminTreeOfTruth({token}){
 const [data,setData]=useState(null),[vocab,setVocab]=useState(null),[error,setError]=useState(''),[focus,setFocus]=useState(''),[selectedPath,setSelectedPath]=useState(''),[eidos,setEidos]=useState([]),[bookingAtomSeeds,setBookingAtomSeeds]=useState([]),[mode,setMode]=useState('eidos');
 const load=useCallback(()=>Promise.all([
  apiRequest('/admin/setup-catalog',{token}),apiRequest('/equipment/admin',{token}),
  apiRequest('/admin/setup-catalog/deleted',{token}).catch(()=>({items:[],equipment:[]})),
  apiRequest('/prices',{token}).catch(()=>({items:[]})),
 ]).then(([catalog,equipment,removed,prices])=>{setData({catalog:catalog.items||[],equipment:equipment.items||[],removed:{items:removed.items||[],equipment:removed.equipment||[]},prices:prices.items||[]});setError('');})
  .catch(failure=>setError(failure.message||'Could not load the tree.')),[token]);
 useEffect(()=>{if(mode!=='booking')return;load();loadWorkVocabulary().then(setVocab).catch(()=>setVocab({}));const changed=()=>load();window.addEventListener('echo:administrator-data-changed',changed);window.addEventListener('echo:setup-catalog-changed',changed);return()=>{window.removeEventListener('echo:administrator-data-changed',changed);window.removeEventListener('echo:setup-catalog-changed',changed);};},[load,mode]);

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
 const references=source=>allAtoms.filter(atom=>atom.branch===source).map(atom=>({id:atom.id,label:atom.name,note:`Step ${atom.step} · ${atom.code}`,source,data:atom}));
 const languageById=new Map((music.languages||[]).map(row=>[row.id,row.name]));
 const tree=[
  {branch:'eidos',label:'Eidos',note:`${eidos.filter(item=>item.id!=='booking').length} identity seeds`,children:eidos.filter(item=>item.id!=='booking').map(item=>({key:item.id,id:item.id,label:'Eidos',data:{id:item.id,fourthGoal:item.fourthGoal||'',...(atomBySeed[item.id]?{bookingAtom:atomBySeed[item.id]}:{})}}))},
  {branch:'services',label:'Services & equipment',note:`${services.length} services · ${equipment.length} equipment items`,children:[
   ...nodes.map(node=>({...leaf(node),data:data.catalog.find(row=>row.id===node.id)||node,removed:node.removed,note:node.removed?'Removed service':`${node.items.length} equipment items`,children:[...node.items.map(leaf),...node.removedItems.map(item=>({...leaf(item),removed:true,note:'Removed equipment'}))]})),
   ...(view?.orphans.length?[group('Removed equipment without a service',view.orphans.map(item=>({...leaf(item),removed:true})))]:[]),
   group('Connected booking fields',references('services')),
  ]},
  {branch:'events',label:'Events',note:`${events.length} event types`,children:[group('Event types',events.map(leaf)),group('Connected booking fields',references('events'))]},
  {branch:'music',label:'Music preferences',note:'Work Elements · music vocabulary',children:[
   group('Languages',(music.languages||[]).map(language=>({...leaf(language),children:(music.dialects||[]).filter(dialect=>dialect.languageIds.includes(language.id)).map(leaf)}))),
   group('Dialects',(music.dialects||[]).map(dialect=>({...leaf(dialect),children:dialect.languageIds.map(id=>({id,label:languageById.get(id)||id}))}))),
   group('Genres',(music.genreCards||[]).map(genre=>({...leaf(genre),note:genre.description}))),
   group('Artists / vocalists',(music.vocalists||[]).map(artist=>({...leaf(artist),children:[...(artist.languages||[]).map(name=>({label:name,note:'Language'})),...(artist.dialects||[]).map(name=>({label:name,note:'Dialect'}))]}))),
   group('Event moments',(music.moments||[]).map(leaf)),group('Connected booking fields',references('music')),
  ]},
  {branch:'booking',label:'Booking structure',note:`${present.filter(Boolean).length} active steps · ${allAtoms.length} data atoms`,children:STEP_NAMES.map((name,index)=>({label:`${String(index+1).padStart(2,'0')} / ${index===2&&steps.djName?steps.djName:name}`,disabled:!present[index],note:present[index]?'Booking step':'Not mounted',children:[...(atoms.get(index+1)||new Map())].map(([section,list])=>({label:`Section ${section}`,children:list.map(atom=>({id:atom.id,label:atom.name,note:atom.code,source:atom.branch,data:atom,children:[{label:atom.branch,note:atom.ref||'Field source',source:atom.branch}]}))}))}))},
  {branch:'prices',label:'Prices',note:`${prices.length} price rows`,children:[group('Price rows',prices.map(price=>({...leaf(price),note:`${(Number(price.amountCents||0)/100).toFixed(2)} ${price.currency||'CAD'}`,children:[{label:'Linked catalogue ID',id:price.serviceId||price.equipmentId||price.id,data:data.catalog.find(row=>row.id===price.serviceId)||equipment.find(row=>row.id===price.equipmentId)}]}))),...(unpriced.length?[group('Services without a price row',unpriced.map(leaf))]:[]),{label:'Booking quotes',note:'Prices feed the quote'}]},
  {branch:'ai',label:'Echo AI',note:'Connected reader of the tree',children:[{label:'Available services',children:[{id:'dj',label:'DJ',note:steps.dj?'Offered':'Not offered'},{id:'rental',label:'Rental',note:steps.rental?'Offered':'Not offered'}]},group('Booking steps',STEP_NAMES.filter((_,index)=>present[index]).map(label=>({label}))),{label:'Client conversations',note:'Uses the tree to understand services and booking steps'}]},
 ];
 const displayTree=mode==='eidos'?eidos.filter(item=>item.id!=='booking').map(item=>({branch:item.id,key:item.id,id:item.id,label:item.id,identityOnly:true,data:{id:item.id,fourthGoal:item.fourthGoal||'',...(atomBySeed[item.id]?{bookingAtom:atomBySeed[item.id]}:{})}})):tree;
 const rootNode=mode==='eidos'?{label:'booking',id:'booking',data:{id:'booking',fourthGoal:eidos.find(item=>item.id==='booking')?.fourthGoal||''},children:displayTree}:{label:'Booking',id:'booking',data:{...eidos.find(item=>item.id==='booking'),services:services.length,equipment:equipment.length,eventTypes:events.length,priceRows:prices.length,dataAtoms:allAtoms.length,steps},children:tree};
 const resolveSelection=path=>{
  if(!path)return null;
  if(path==='root')return{node:rootNode,path,trail:[]};
  if(mode==='eidos'){const node=displayTree.find(item=>item.id===path);return node?{node,path,trail:['booking'],branch:node.branch}:null;}
  const [branch,...indices]=path.split('/');let node=tree.find(item=>item.branch===branch);const trail=['Booking'];
  for(const index of indices){if(!node)return null;trail.push(node.label);node=node.children?.find(child=>String(child.key)===index)||node.children?.[Number(index)];}
  return node?{node,path,trail,branch}:null;
 };
 const selection=resolveSelection(selectedPath);
 const selectNode=path=>{const item=resolveSelection(path);if(!item)return;setSelectedPath(path);setFocus(item.node.branch||item.node.source||item.branch||'');};
 const changeMode=next=>{setMode(next);setSelectedPath('');setFocus('');};
 const tabKeys=(event,index)=>{
  let next;
  if(event.key==='ArrowRight')next=(index+1)%MAP_MODES.length;
  else if(event.key==='ArrowLeft')next=(index+MAP_MODES.length-1)%MAP_MODES.length;
  else if(event.key==='Home')next=0;
  else if(event.key==='End')next=MAP_MODES.length-1;
  if(next!==undefined){event.preventDefault();changeMode(MAP_MODES[next].id);document.getElementById(`tot-tab-${MAP_MODES[next].id}`)?.focus();}
 };
 return <section className="tot" aria-label="Eden of Eide concept map"><div className="tot-workbench">
  <EidosAside atomBySeed={atomBySeed} onBookingAtoms={setBookingAtomSeeds} onClear={()=>{setSelectedPath('');setFocus('');}} token={token} items={eidos} onItems={setEidos} selectedId={selectedPath==='root'?'booking':selection?.node.id} onSelect={item=>{setSelectedPath(item.id==='booking'?'root':mode==='eidos'?item.id:`eidos/${item.id}`);setFocus(item.id==='booking'?'':mode==='eidos'?item.id:'eidos');}}/>
  <div className="tot-stage">
  <header className="tot-mode-header"><h1>Eden of Eide</h1><div role="tablist" aria-label="Concept map modes">{MAP_MODES.map((item,index)=><button key={item.id} id={`tot-tab-${item.id}`} type="button" role="tab" aria-selected={mode===item.id} aria-controls={`tot-panel-${item.id}`} tabIndex={mode===item.id?0:-1} onClick={()=>changeMode(item.id)} onKeyDown={event=>tabKeys(event,index)}>{item.label}</button>)}</div></header>
  <div className="tot-toolbar"><span>{selection?selection.node.label:'Select an item to view its data'}</span>{selection&&<button type="button" onClick={()=>{setFocus('');setSelectedPath('');}}><X size={13}/>Clear selection</button>}</div>
  <div className="tot-mode-panel" role="tabpanel" id={`tot-panel-${mode}`} aria-labelledby={`tot-tab-${mode}`}><>{mode==='booking'&&error?<p className="tot-error" role="alert">{error}</p>:mode==='booking'&&!view?<p className="tot-loading" role="status">Loading Booking…</p>:<TreeCanvas key={mode} nodes={displayTree} focus={focus} selectedPath={selectedPath} onSelect={selectNode} identityOnly={mode==='eidos'} rootVisible={eidos.some(item=>item.id==='booking')}/>}</></div>
 </div><NodeInspector selection={selection} onSelect={selectNode} onClear={()=>{setSelectedPath('');setFocus('');}}/></div></section>;
}
