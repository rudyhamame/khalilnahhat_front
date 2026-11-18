import {useMemo,useRef,useState} from 'react';
import {Check,Copy,Download,QrCode,X} from 'lucide-react';
import qrcode from 'qrcode-generator';
import {recordingPublicUrl} from '../lib/recordingLink';
import './recordingQr.css';

// Every saved recording is reachable through its own QR code (generated from its public listening URL).
export default function RecordingQr({id,title,published=true}){
 const url=id&&published?recordingPublicUrl(id):'';
 const svg=useMemo(()=>{if(!url)return '';const qr=qrcode(0,'M');qr.addData(url);qr.make();return qr.createSvgTag({cellSize:4,margin:2,scalable:true});},[url]);
 const [copied,setCopied]=useState(false),dialog=useRef(null);
 const available=Boolean(url),pending='Available after publishing this recording';
 const copy=async()=>{try{await navigator.clipboard.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),1600);}catch{/* clipboard blocked */}};
 const download=()=>{
  const qr=qrcode(0,'M');qr.addData(url);qr.make();
  const modules=qr.getModuleCount(),margin=4,cell=Math.ceil(1024/(modules+margin*2));
  const canvas=document.createElement('canvas');canvas.width=canvas.height=(modules+margin*2)*cell;
  const context=canvas.getContext('2d');if(!context)return;
  context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
  context.fillStyle='#000';
  for(let row=0;row<modules;row++)for(let col=0;col<modules;col++)if(qr.isDark(row,col))context.fillRect((col+margin)*cell,(row+margin)*cell,cell,cell);
  const link=document.createElement('a');link.href=canvas.toDataURL('image/jpeg',.98);
  link.download=`${(title||'recording').replace(/[^\w-]+/g,'-').toLowerCase()}-qr.jpg`;link.click();
 };
 return <div className={`recording-qr-tools${available?'':' is-pending'}`} role="group" aria-label="Listen by QR code">
  <button type="button" disabled={!available} aria-label="Show listening QR code" title={available?'Show listening QR code':pending} onClick={()=>dialog.current?.showModal()}><QrCode size={15} aria-hidden="true"/></button>
  <button type="button" disabled={!available} aria-label={copied?'Listening link copied':'Copy listening link'} title={available?(copied?'Copied':'Copy listening link'):pending} onClick={copy}>{copied?<Check size={15} aria-hidden="true"/>:<Copy size={15} aria-hidden="true"/>}</button>
  <button type="button" disabled={!available} aria-label="Download QR code as JPG" title={available?'Download QR code as JPG':pending} onClick={download}><Download size={15} aria-hidden="true"/></button>
  <dialog ref={dialog} className="recording-qr-dialog" aria-labelledby="recording-qr-title"><header><h3 id="recording-qr-title">Listen by QR code</h3><button type="button" aria-label="Close QR code" title="Close" onClick={()=>dialog.current?.close()}><X size={18} aria-hidden="true"/></button></header><div className="recording-qr-code" role="img" aria-label={`QR code for ${title||'this recording'}`} dangerouslySetInnerHTML={{__html:svg}}/><a href={url} target="_blank" rel="noreferrer">Open recording</a></dialog>
 </div>;
}
