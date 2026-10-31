import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
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

installSmoothResize();

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
