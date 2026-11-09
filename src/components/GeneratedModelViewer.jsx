import {fitModel} from '../lib/modelViewerFit';
import {loadModelViewer} from '../lib/modelViewer';
import {useEffect,useRef,useState} from 'react';
import {RotateCcw} from 'lucide-react';
import './equipment3D.css';
export default function GeneratedModelViewer({src,name='Equipment',compact=false,ar=false,showInteractionHint=true,showControls=true,fitToBounds=false}){
 const viewer=useRef(null),[ready,setReady]=useState(false),[loaded,setLoaded]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let alive=true;loadModelViewer().then(()=>{if(alive)setReady(true);}).catch(()=>{if(alive)setError(ar?'تعذر فتح العرض ثلاثي الأبعاد.':'The 3D viewer could not load.');});return()=>{alive=false;};},[ar]);
 useEffect(()=>{
  setLoaded(false);setError('');if(!ready)return;
  const node=viewer.current;if(!node)return;
  let fittedSize='';
  const fit=preserveOrbit=>{if(!node.loaded||!node.clientWidth||!node.clientHeight)return;fitModel(node,{preserveOrbit});fittedSize=`${node.clientWidth}x${node.clientHeight}`;};
  const load=()=>{setLoaded(true);if(fitToBounds)fit(false);},fail=()=>setError(ar?'تعذر تحميل المجسم.':'The 3D model could not load.');
  node.addEventListener('load',load);node.addEventListener('error',fail);if(node.loaded)load();
  const observer=fitToBounds?new ResizeObserver(()=>{if(`${node.clientWidth}x${node.clientHeight}`!==fittedSize)fit(true);}):null;observer?.observe(node);
  return()=>{observer?.disconnect();node.removeEventListener('load',load);node.removeEventListener('error',fail);};
 },[src,ready,ar,fitToBounds]);
 return <div className={'generated-model-viewer'+(compact?' is-compact':'')}>
  {ready&&<model-viewer ref={viewer} src={src} alt={name} camera-controls="" min-camera-orbit={fitToBounds?'auto auto 10%':undefined} disable-pan="" touch-action="none" environment-image="neutral" exposure="1.3" shadow-intensity="1" camera-orbit="-25deg 70deg 110%" interaction-prompt={showInteractionHint?'auto':'none'}/>}
  {(!ready||!loaded)&&!error&&<p role="status">{ar?'جارٍ تحميل المجسم…':'Loading 3D model…'}</p>}{error&&<p role="alert">{error}</p>}
  {!compact&&showControls&&<div className="generated-model-toolbar">{showInteractionHint&&<small>{ar?'اسحب للدوران · قرّب للتكبير':'Drag to rotate · Scroll to zoom'}</small>}<button type="button" aria-label={ar?'إعادة ضبط العرض':'Reset 3D view'} onClick={()=>{const node=viewer.current;if(node&&fitToBounds){fitModel(node);}else if(node){node.cameraOrbit='-25deg 70deg 110%';node.cameraTarget='auto auto auto';node.jumpCameraToGoal?.();}}}><RotateCcw size={14}/></button></div>}
 </div>;
}
