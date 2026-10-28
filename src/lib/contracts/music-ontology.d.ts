export type RecordingType='MIX'|'REMIX'|'COVER'|'PRODUCTION';
export type WorkType='SONG'|'MUSIC';
export type MetadataState='MISSING'|'UNKNOWN'|'NOT_APPLICABLE'|'SPECIFIED';
export interface Entity {id:string;name:string;kind:string;parentId?:string;revision:number}
export interface Credit {artistId:string;role:'LYRICIST'|'VOCALIST'|'PERFORMER'|'COMPOSER'|'PRODUCER'|'MIX_ENGINEER'|'MASTERING_ENGINEER'|'ARRANGER'|'OTHER';artist?:Entity;detail?:string}
export interface Provenance {source:string;note:string;recordedBy?:string}
export type MusicianCredit=Omit<Credit,'role'>&{role:'PERFORMER'|'COMPOSER'|'ARRANGER'|'OTHER'};
export interface Melody {id:string;bpm:number|null;key:string|null;rhythm:Entity|null;genres:Entity[];instrumentIds:string[];instruments:Entity[];musicianCredits:MusicianCredit[];timeSignature:string;mode:string;description:string;states:Record<string,MetadataState>;provenance:Provenance}
export interface Lyrics {id:string;language:Entity|null;dialect:Entity|null;regions:Entity[];artistCredits:Credit[];primaryConcept:Entity|null;concepts:Entity[];text:string;script:string;translationRefs:string[];completeness:'INCOMPLETE'|'COMPLETE';states:Record<string,MetadataState>;provenance:Provenance}
export type MusicalWork={id:string;title:string;melody:Melody;revision:number;credits:Credit[];provenance:Provenance}&({type:'SONG';lyrics:Lyrics}|{type:'MUSIC';lyrics:null});
export interface Recording {id:string;title:string;recordingType:RecordingType;workId:string;work:MusicalWork;recordingMetadata:{bpm:number|null;key:string|null;states:Record<string,MetadataState>};audio:{assetId:string|null;url:string;durationSeconds:number|null};credits:Credit[];sourceRecordingIds:string[];sourceWorkIds:string[];revision:number;publicationStatus:'DRAFT'|'PUBLISHED'|'WITHDRAWN';archivalStatus:'ACTIVE'|'ARCHIVED';ontologyStatus:'MAPPED'}
export interface UnmappedLegacyRecording {id:string;title:string;recordingType:null;work:null;workId:null;ontologyStatus:'UNMAPPED';audioUrl:string}
export type ArchiveRecording=Recording|UnmappedLegacyRecording;

export type PlaybackRecording=Pick<Recording,'id'|'title'>&{audioUrl:string;coverImage:string;duration:string};
