import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import {prepareHeroHeadphoneFrames} from './echo/heroHeadphoneFrames';
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

// iPadOS can identify as a Mac when desktop browsing is enabled.
document.documentElement.classList.toggle('echo-ipad',
  /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

installSmoothResize();
installNoAutofill();

// Start the complete intro sequence before mounting the homepage UI.
if(window.location.pathname==='/')void prepareHeroHeadphoneFrames();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppPreflight>
    <SeasonalPlayerHost>
    <div className="echo-page-surface" id="echo-page-surface"><App /></div>
    <AdministratorWorkView />
    <ArchiveFooter />
    <SeasonalSnow />
    </SeasonalPlayerHost>
    </AppPreflight>
  </React.StrictMode>,
);
