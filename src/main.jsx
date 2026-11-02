import React from 'react';
import {playbackRender} from './lib/playbackProfile';
import ReactDOM from 'react-dom/client';
import App from './App';
import AdministratorVoiceProvider from './echo/AdministratorVoiceProvider';
import AdministratorWorkView from './echo/AdministratorWorkView';
import ArchiveFooter from './components/ArchiveFooter';
import SeasonalSnow from './echo/SeasonalSnow';
import SeasonalPlayerHost from './echo/SeasonalPlayerHost';
import AppPreflight from './components/AppPreflight';
import 'boxicons/css/boxicons.min.css';
import './styles/reset.css';
import './styles/variables.css';
import './styles/global.css';
import './styles/components.css';
import './styles/responsive.css';
import './components/adminWorkspace.css';
import './echo/navigation.css';
import { installSmoothResize } from './lib/smoothResize';
import { installNoAutofill } from './lib/noAutofill';

installSmoothResize();
installNoAutofill();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><React.Profiler id="playback-investigation" onRender={playbackRender}>
    <AppPreflight>
    <SeasonalPlayerHost>
    <AdministratorVoiceProvider>
    <div className="echo-page-surface" id="echo-page-surface"><React.Profiler id="App" onRender={playbackRender}><App /></React.Profiler></div>
    <AdministratorWorkView />
    </AdministratorVoiceProvider>
    <React.Profiler id="ArchiveFooter" onRender={playbackRender}><ArchiveFooter /></React.Profiler>
    <React.Profiler id="Snow" onRender={playbackRender}><SeasonalSnow /></React.Profiler>
    </SeasonalPlayerHost>
    </AppPreflight>
  </React.Profiler></React.StrictMode>,
);
