import {useMemo,useState} from 'react';
import {Copy,Download,QrCode} from 'lucide-react';
import qrcode from 'qrcode-generator';
import {recordingPublicUrl} from '../lib/recordingLink';
import './recordingQr.css';

// Every saved recording is reachable through its own QR code (generated from its public listening URL).
export default function RecordingQr({id,title,published=true}){
 const url=id&&published?recordingPublicUrl(id):'';
 const svg=useMemo(()=>{if(!url)return '';const qr=qrcode(0,'M');qr.addData(url);qr.make();return qr.createSvgTag({cellSize:4,margin:2,scalable:true});},[url]);
 const [copied,setCopied]=useState(false);
 if(!id||!published)return <div className="recording-qr is-pending"><QrCode size={18} aria-hidden="true"/><span>The listening QR code becomes available when you publish this recording.</span></div>;
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
 return <div className="recording-qr"><div className="recording-qr-code" role="img" aria-label={`QR code for ${title||'this recording'}`} dangerouslySetInnerHTML={{__html:svg}}/><div className="recording-qr-info"><strong>Listen by QR code</strong><a href={url} target="_blank" rel="noreferrer">{url.replace(/^https?:\/\//,'')}</a><div className="recording-qr-actions"><button type="button" onClick={copy}><Copy size={14}/>{copied?'Copied':'Copy link'}</button><button type="button" onClick={download}><Download size={14}/>Download JPG</button></div></div></div>;
}
