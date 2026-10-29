import {apiRequest} from './api';
import contract from './contracts/music-ontology.json';
export {contract as musicOntologyContract};
export const workTypeLabel=type=>contract.workTypeLabels[type]||type||'Not specified';
export const recordingTypeLabel=type=>contract.recordingTypeLabels[type]||type||'Needs classification';
export const recordingAmount=type=>Object.keys(contract.recordingTypeGroups).find(key=>contract.recordingTypeGroups[key].includes(type))||'';
export const recordingComponents=row=>row.componentWorks?.length?row.componentWorks:row.work?[row.work]:[];
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
 if(row?.recordingType==='PRODUCTION')row={...row,recordingType:null};
 if(!row||typeof row.id!=='string'||typeof row.title!=='string')throw new Error('Invalid recording response.');
 if(row.ontologyStatus==='UNMAPPED'){if(row.work||row.recordingType)throw new Error('Invalid legacy recording classification.');return row;}
 if((row.recordingType!==null&&!contract.recordingTypes.includes(row.recordingType))||!row.workId||row.work?.id!==row.workId||!contract.workTypes.includes(row.work.type)||!row.work.melody)throw new Error('Invalid musical work response.');
 if(row.work.type==='MUSIC'&&row.work.lyrics)throw new Error('Instrumental Music cannot contain Lyrics.');
 if(row.work.type==='SONG'&&!row.work.lyrics)throw new Error('Lyrical Music must expose its Lyrics metadata.');
 for(const component of row.componentWorks||[]){if(!contract.workTypes.includes(component.type)||!component.melody||(component.type==='MUSIC'&&component.lyrics)||(component.type==='SONG'&&!component.lyrics))throw new Error('Invalid recording component response.');}
 return {...row,recordingMetadata:inferRecordingMetadata(recordingComponents(row)),credits:inferRecordingCredits(recordingComponents(row))};
}
export async function fetchOntologyRecordings(filters={},options={}){
 const data=await apiRequest(`${options.token?ontologyPath:'/music-ontology'}/recordings?${ontologyQuery(filters)}`,options);
 if(!Array.isArray(data.items))throw new Error('Invalid archive response.');
 return data.items.map(validateRecording);
}
export function announceMusicArchiveChange(){window.dispatchEvent(new CustomEvent('echo:music-archive-changed'));}
export const blankWork=()=>({title:'',type:'SONG',description:'',credits:[],provenance:{source:'',note:''},melody:{bpm:null,key:null,rhythmId:null,genreIds:[],instrumentIds:[],musicianCredits:[],timeSignature:'',mode:'',description:'',influences:[],states:{},provenance:{source:'',note:''}},lyrics:{languageId:null,dialectId:null,regionIds:[],artistCredits:[],primaryConceptId:null,conceptIds:[],text:'',script:'',translationRefs:[],notes:'',completeness:'INCOMPLETE',states:{},provenance:{source:'',note:''}}});
export function editableWork(row){
 const value=blankWork();for(const key of ['title','type','description','revision','provenance'])if(row[key]!==undefined)value[key]=row[key];
 value.provenance={source:row.provenance?.source||'',note:row.provenance?.note||''};
 value.credits=(row.credits||[]).map(({artistId,role,detail})=>({artistId,role,detail:detail||''}));
 for(const branch of ['melody','lyrics']){const defaults=value[branch];if(!row[branch])continue;for(const key of Object.keys(defaults))if(row[branch][key]!==undefined)defaults[key]=row[branch][key];defaults.provenance={source:row[branch].provenance?.source||'',note:row[branch].provenance?.note||''};}
 value.melody.musicianCredits=(row.melody?.musicianCredits||[]).map(({artistId,role,detail})=>({artistId,role,detail:detail||''}));
 value.lyrics.artistCredits=(row.lyrics?.artistCredits||[]).map(({artistId,role,detail})=>({artistId,role,detail:detail||''}));
 return value;
}
export const blankRecording=()=>({title:'',recordingType:'',recordingAmount:'INDIVIDUAL',componentWorkIds:[],workId:'',audioUrl:'',coverImage:'',durationSeconds:null,description:'',releaseDate:'',recordingMetadata:{bpm:null,key:null,bpms:[],keys:[],genreIds:[],states:{}},credits:[],sourceRecordingIds:[],sourceWorkIds:[],publicationStatus:'DRAFT',archivalStatus:'ACTIVE',versionLabel:'',productionNotes:'',provenance:{source:'',note:''}});
export function editableRecording(row){const value=blankRecording();for(const key of Object.keys(value))if(row[key]!==undefined)value[key]=row[key];value.recordingType=contract.recordingTypes.includes(row.recordingType)?row.recordingType:'';value.recordingAmount=row.recordingAmount||recordingAmount(row.recordingType)||'INDIVIDUAL';value.componentWorkIds=row.componentWorkIds||[row.workId].filter(Boolean);value.revision=row.revision||0;value.audioUrl=row.storedAudioUrl||row.audioUrl||'';value.coverImage=row.storedCoverImage||row.coverImage||'';value.durationSeconds=row.audio?.durationSeconds??null;value.recordingMetadata={bpm:row.recordingMetadata?.bpm??null,key:row.recordingMetadata?.key??null,bpms:row.recordingMetadata?.bpms??(row.recordingMetadata?.bpm==null?[]:[row.recordingMetadata.bpm]),keys:row.recordingMetadata?.keys??(row.recordingMetadata?.key?[row.recordingMetadata.key]:[]),genreIds:row.recordingMetadata?.genreIds||[],states:row.recordingMetadata?.states||{}};value.provenance={source:row.provenance?.source||'',note:row.provenance?.note||''};value.credits=(row.credits||[]).map(({artistId,role,detail})=>({artistId,role,detail:detail||''}));return value;}
