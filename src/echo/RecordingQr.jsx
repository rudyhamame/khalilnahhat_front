import {useMemo,useState} from 'react';
import {Copy,Download,QrCode} from 'lucide-react';
import qrcode from 'qrcode-generator';
import {recordingPublicUrl} from '../lib/recordingLink';
import './recordingQr.css';

// Every saved recording is reachable through its own QR code (generated from its public listening URL).
export default function RecordingQr({id,title}){
 const url=id?recordingPublicUrl(id):'';
 const svg=useMemo(()=>{if(!url)return '';const qr=qrcode(0,'M');qr.addData(url);qr.make();return qr.createSvgTag({cellSize:4,margin:2,scalable:true});},[url]);
 const [copied,setCopied]=useState(false);
 if(!id)return <div className="recording-qr is-pending"><QrCode size={18} aria-hidden="true"/><span>The QR code is generated automatically as soon as you save this recording.</span></div>;
 const copy=async()=>{try{await navigator.clipboard.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),1600);}catch{/* clipboard blocked */}};
 const download=()=>{const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));link.download=`${(title||'recording').replace(/[^\w-]+/g,'-').toLowerCase()}-qr.svg`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);};
 return <div className="recording-qr"><div className="recording-qr-code" role="img" aria-label={`QR code for ${title||'this recording'}`} dangerouslySetInnerHTML={{__html:svg}}/><div className="recording-qr-info"><strong>Listen by QR code</strong><a href={url} target="_blank" rel="noreferrer">{url.replace(/^https?:\/\//,'')}</a><div className="recording-qr-actions"><button type="button" onClick={copy}><Copy size={14}/>{copied?'Copied':'Copy link'}</button><button type="button" onClick={download}><Download size={14}/>Download</button></div></div></div>;
}
