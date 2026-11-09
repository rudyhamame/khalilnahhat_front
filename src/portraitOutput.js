import {Room,RoomEvent} from 'livekit-client';
import {connectPortraitOutput} from './lib/portraitOutput';

// An isolated egress page: no admin UI, browser capture, audio effects or stored sessions.
const room=new Room();
void connectPortraitOutput({room,events:RoomEvent,params:new URLSearchParams(location.search),video:document.getElementById('video'),logo:document.getElementById('logo'),audioRoot:document.getElementById('output')}).catch(()=>{
 void room.disconnect();
 document.getElementById('output').dataset.state='failed';
 // Provider logs must never contain the recorder token or destination credentials.
 console.error('Portrait live output could not start.');
});
