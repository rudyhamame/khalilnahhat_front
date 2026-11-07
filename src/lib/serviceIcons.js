import {AudioLines,Box,Disc3,Monitor,Sparkles,WandSparkles,Building2,Mic2} from 'lucide-react';
export const serviceIconOptions={microphone:{label:'Microphone',Icon:Mic2},audio:{label:'Sound',Icon:AudioLines},disc:{label:'DJ / music',Icon:Disc3},monitor:{label:'Screen',Icon:Monitor},sparkles:{label:'Effects',Icon:Sparkles},lighting:{label:'Lighting',Icon:WandSparkles},building:{label:'Venue / corporate',Icon:Building2},box:{label:'Equipment',Icon:Box}};
const legacy={dj:Disc3,sound:AudioLines,lighting:Sparkles,led:Monitor,fx:WandSparkles,corporate:Building2};
export const serviceIcon=service=>serviceIconOptions[service?.icon]?.Icon||legacy[service?.id]||Box;
