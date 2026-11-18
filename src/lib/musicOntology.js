import {apiRequest} from './api';
import contract from './contracts/music-ontology.json';
import {validateRecordingItems} from './recordingItems.js';
export {contract as musicOntologyContract};
export const workTypeLabel=type=>contract.workTypeLabels[type]||type||'Not specified';
export const workKindLabel=kind=>kind==='ORIGINAL'||!kind?'Original':recordingTypeLabel(kind);
export const recordingTypeLabel=type=>contract.recordingTypeLabels[type]||type||'Needs classification';
export const recordingComponents=()=>[];
export function inferRecordingMetadata(contents){
 const bpms=[...new Set(contents.map(w=>w.melody?.bpm).filter(v=>v!=null))];
 const keys=[...new Set(contents.map(w=>w.melody?.key).filter(Boolean))];
 const genres=[...new Map(contents.flatMap(w=>w.melody?.genres||[]).map(g=>[g.id,g])).values()];
 const genreIds=[...new Set(contents.flatMap(w=>w.melody?.genreIds||w.melody?.genres?.map(g=>g.id)||[]))];
 return {bpms,keys,genres,genreIds,bpm:bpms[0]??null,key:keys[0]??null,states:{bpm:bpms.length?'SPECIFIED':'MISSING',key:keys.length?'SPECIFIED':'MISSING',genreIds:genreIds.length?'SPECIFIED':'MISSING'}};
}
export function inferRecordingCredits(contents){return [...new Map(contents.flatMap(w=>w.credits||[]).map(c=>[JSON.stringify([c.artistId,c.role,c.detail||'']),c])).values()];}
export const ontologyPath='/admin/music-ontology';
export function ontologyQuery(filters={}){return new URLSearchParams(Object.entries(filters).filter(([key,value])=>contract.filters.includes(key)&&value!==''&&value!==null&&value!==undefined)).toString();}
export function validateRecording(row){
 // Retired classifications stay playable while an editor chooses a current type.
 if(row?.workType==='PRODUCTION')row={...row,workType:null};
 if(!row||typeof row.id!=='string'||typeof row.name!=='string')throw new Error('Invalid recording response.');
 if(Array.isArray(row.atoms)&&row.atoms.length)validateRecordingItems(row.atoms);
 return row;
}
export async function fetchOntologyRecording(id,options={}){
 const data=await apiRequest(`/music-ontology/recordings/${encodeURIComponent(id)}`,options);
 if(!data.item)throw new Error('Recording not found.');
 return validateRecording(data.item);
}
export async function fetchOntologyRecordings(filters={},options={}){
 const data=await apiRequest(`${options.token?ontologyPath:'/music-ontology'}/recordings?${ontologyQuery(filters)}`,options);
 if(!Array.isArray(data.items))throw new Error('Invalid archive response.');
 return data.items.map(validateRecording);
}
export async function fetchDjWorkTypes({token}={}){
 const data=await apiRequest(`${token?ontologyPath:'/music-ontology'}/work-types`,{token});
 if(!Array.isArray(data.items))throw new Error('Invalid DJ work types response.');
 return data.items;
}
export function announceMusicArchiveChange(){window.dispatchEvent(new CustomEvent('echo:music-archive-changed'));}
export const blankWork=()=>({title:'',type:'SONG',workKind:'ORIGINAL',description:'',credits:[],provenance:{source:'',note:''},melody:{bpm:null,key:null,rhythmId:null,genreIds:[],instrumentIds:[],musicianCredits:[],timeSignature:'',mode:'',description:'',states:{},provenance:{source:'',note:''}},lyrics:{languageId:null,languageIds:[],dialectId:null,regionIds:[],artistCredits:[],releaseYear:null,script:'',translationRefs:[],states:{},provenance:{source:'',note:''}}});
export function editableWork(row){
 const value=blankWork();for(const key of ['title','type','workKind','description','revision','provenance'])if(row[key]!==undefined)value[key]=row[key];
 value.provenance={source:row.provenance?.source||'',note:row.provenance?.note||''};
 value.credits=(row.credits||[]).map(({artistId,role,detail})=>({artistId,role,detail:detail||''}));
 for(const branch of ['melody','lyrics']){const defaults=value[branch];if(!row[branch])continue;for(const key of Object.keys(defaults))if(row[branch][key]!==undefined)defaults[key]=row[branch][key];if(branch==='lyrics'&&row[branch].audioLanguageCodes!==undefined)defaults.audioLanguageCodes=row[branch].audioLanguageCodes;defaults.provenance={source:row[branch].provenance?.source||'',note:row[branch].provenance?.note||''};}
 value.melody.musicianCredits=(row.melody?.musicianCredits||[]).map(({artistId,role,detail})=>({artistId,role,detail:detail||''}));
 value.lyrics.artistCredits=(row.lyrics?.artistCredits||[]).map(({artistId,role,detail})=>({artistId,role,detail:detail||''}));
 return value;
}
export const blankRecording=()=>({sampleStartSec:null,name:'',workType:'',stems:null,audioMetadata:null,audioUrl:'',coverImage:'',durationSeconds:null,description:'',releaseDate:'',status:'DRAFT'});
export function editableRecording(row){const value=blankRecording();if(row.atoms)value.atoms=JSON.parse(JSON.stringify(row.atoms));for(const key of Object.keys(value))if(row[key]!==undefined)value[key]=row[key];value.workType=typeof row.workType==='string'?row.workType:'';value.revision=row.revision||0;value.audioUrl=row.storedAudioUrl||row.audioUrl||'';value.audioMetadata=row.audio?.metadata||row.audioMetadata||null;value.coverImage=row.storedCoverImage||row.coverImage||'';value.durationSeconds=row.audio?.durationSeconds??null;return value;}

// A recording in the older library song shape (the public player and archive library read title, duration and date).
export const asArchiveSong=row=>({...row,title:row.name,duration:row.durationMinutes==null?'':`${Math.floor(row.durationMinutes)}:${String(Math.round((row.durationMinutes%1)*60)%60).padStart(2,'0')}`,date:row.releaseDate||'',published:row.status==='PUBLISHED',sortOrder:0});
