import {capturePresentationSource} from './livePresentationSource.js';
// Audio taken on its own, with no picture: the sound of a shared tab/window, or of a media file. Same shape as a presentation source.
export async function captureAudioSource({kind,file,onEnded=()=>{},media=globalThis.navigator?.mediaDevices,capture=capturePresentationSource}){
  if(kind==='tab'){
    if(!media?.getDisplayMedia)throw new Error('Tab/window audio is unavailable in this browser.');
    // The browser always asks for a picture too; it is dropped at once and only the sound is kept.
    const shared=await media.getDisplayMedia({video:true,audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
    const audio=shared.getAudioTracks();
    shared.getVideoTracks().forEach(track=>track.stop());
    if(!audio.length){shared.getTracks().forEach(track=>track.stop());throw new Error('No audio was shared. Choose a tab and turn on "Share tab audio".');}
    audio[0].addEventListener('ended',onEnded,{once:true});
    const stream=new MediaStream(audio);
    return {stream,cleanup:()=>shared.getTracks().forEach(track=>track.stop())};
  }
  if(kind==='file'){
    if(!file||!file.type?.startsWith('video/')&&!file.type?.startsWith('audio/'))throw new Error('Choose an audio or video file first.');
    // A video file gives its sound; its picture is not used (a tiny canvas keeps the cost low).
    const source=await capture({kind:'video',file,width:16,height:16,onEnded});
    const audio=source.stream.getAudioTracks();
    if(!audio.length){source.cleanup();throw new Error('This file has no audio.');}
    source.stream.getVideoTracks().forEach(track=>track.stop());
    return {stream:new MediaStream(audio),cleanup:source.cleanup,pause:source.pause,play:source.play,restart:source.restart,element:source.element,load:source.load};
  }
  throw new Error('Unknown audio source.');
}
