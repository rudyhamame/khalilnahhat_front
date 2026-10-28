import {createContext,useContext} from 'react';
export const SeasonalPlayerContext=createContext(null);
export const useSeasonalPlayer=()=>useContext(SeasonalPlayerContext);
