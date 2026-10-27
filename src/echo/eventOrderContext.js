import { createContext, useContext } from 'react';
export const EventOrderContext=createContext(null);
export const useEventOrder=()=>useContext(EventOrderContext);
