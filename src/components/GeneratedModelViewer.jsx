import {loadModelViewer} from '../lib/modelViewer';
import {useEffect,useRef,useState} from 'react';
import {RotateCcw} from 'lucide-react';
import './equipment3D.css';
function fitModel(node){
 const size=node.getDimensions(),center=node.getBoundingBoxCenter();
 const width=node.clientWidth,height=node.clientHeight;
 if(!width||!height)return;
 const theta=-15*Math.PI/180,phi=75*Math.PI/180;
 const tan=Math.tan(node.getFieldOfView()*Math.PI/360),aspect=width/height;
 const insetX=Math.max(.5,(width-48)/width),insetY=Math.max(.5,(height-48)/height);
 let distance=0;
 for(const x of [-size.x/2,size.x/2])for(const y of [-size.y/2,size.y/2])for(const z of [-size.z/2,size.z/2]){
  const horizontal=x*Math.cos(theta)-z*Math.sin(theta);
  const vertical=-x*Math.cos(phi)*Math.sin(theta)+y*Math.sin(phi)-z*Math.cos(phi)*Math.cos(theta);
  const depth=x*Math.sin(phi)*Math.sin(theta)+y*Math.cos(phi)+z*Math.sin(phi)*Math.cos(theta);
  distance=Math.max(distance,depth+Math.abs(horizontal)/(tan*aspect*insetX),depth+Math.abs(vertical)/(tan*insetY));
 }
 node.resetTurntableRotation?.(0);node.cameraTarget=`${center.x}m ${center.y}m ${center.z}m`;
 node.cameraOrbit=`-15deg 75deg ${distance}m`;node.jumpCameraToGoal?.();
}
export default function GeneratedModelViewer({src,name='Equipment',compact=false,ar=false,showInteractionHint=true,showControls=true,fitToBounds=false}){
 const viewer=useRef(null),[ready,setReady]=useState(false),[loaded,setLoaded]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let alive=true;loadModelViewer().then(()=>{if(alive)setReady(true);}).catch(()=>{if(alive)setError(ar?'تعذر فتح العرض ثلاثي الأبعاد.':'The 3D viewer could not load.');});return()=>{alive=false;};},[ar]);
 useEffect(()=>{
  setLoaded(false);setError('');if(!ready)return;
  const node=viewer.current;if(!node)return;
  const load=()=>{setLoaded(true);if(fitToBounds)fitModel(node);},fail=()=>setError(ar?'تعذر تحميل المجسم.':'The 3D model could not load.');
  node.addEventListener('load',load);node.addEventListener('error',fail);if(node.loaded)load();
  const observer=fitToBounds?new ResizeObserver(()=>{if(node.loaded)fitModel(node);}):null;observer?.observe(node);
  return()=>{observer?.disconnect();node.removeEventListener('load',load);node.removeEventListener('error',fail);};
 },[src,ready,ar,fitToBounds]);
 return <div className={'generated-model-viewer'+(compact?' is-compact':'')}>
  {ready&&<model-viewer ref={viewer} src={src} alt={name} camera-controls="" min-camera-orbit={fitToBounds?'auto auto 10%':undefined} disable-pan="" touch-action="pan-y" environment-image="neutral" exposure="1.3" shadow-intensity="1" camera-orbit="-25deg 70deg 110%" interaction-prompt={showInteractionHint?'auto':'none'}/>}
  {(!ready||!loaded)&&!error&&<p role="status">{ar?'جارٍ تحميل المجسم…':'Loading 3D model…'}</p>}{error&&<p role="alert">{error}</p>}
  {!compact&&showControls&&<div className="generated-model-toolbar">{showInteractionHint&&<small>{ar?'اسحب للدوران · قرّب للتكبير':'Drag to rotate · Scroll to zoom'}</small>}<button type="button" aria-label={ar?'إعادة ضبط العرض':'Reset 3D view'} onClick={()=>{const node=viewer.current;if(node&&fitToBounds){fitModel(node);}else if(node){node.cameraOrbit='-25deg 70deg 110%';node.cameraTarget='auto auto auto';node.jumpCameraToGoal?.();}}}><RotateCcw size={14}/></button></div>}
 </div>;
}
