import {createContext,useContext} from 'react';
export const AdministratorVoiceContext=createContext(null);
export function useAdministratorCall(){
 const context=useContext(AdministratorVoiceContext);
 if(!context)throw Error('Administrator voice requires the application voice provider.');
 return context;
}
