// The draft stores the event type as an id ("wedding"); people should see its name ("Wedding").
import {optionName} from './eventOrderCore.mjs';
export const eventTypeLabel=(type,ar=false)=>type?optionName('event.type',type,ar):'';
