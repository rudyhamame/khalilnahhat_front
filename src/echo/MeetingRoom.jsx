import {createPortal} from 'react-dom';
import CallChatPanel from './CallChatPanel';

// Scheduled meeting entry point; booking workspaces render CallChatPanel directly.
export default function MeetingRoom({embedded=false,ar=false,...props}){
 if(embedded)return <CallChatPanel {...props} ar={ar}/>;
 return createPortal(<div className="meeting-room" role="dialog" aria-modal="true" aria-label={ar?'غرفة الاجتماع':'Meeting room'} dir={ar?'rtl':'ltr'}><CallChatPanel {...props} ar={ar} embedded={false}/></div>,document.body);
}
