import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ArchiveFooter from './components/ArchiveFooter';
import AppPreflight from './components/AppPreflight';
import 'boxicons/css/boxicons.min.css';
import './styles/reset.css';
import './styles/variables.css';
import './styles/global.css';
import './styles/components.css';
import './styles/responsive.css';
import './components/adminWorkspace.css';
import './echo/navigation.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppPreflight>
    <div className="echo-page-surface" id="echo-page-surface"><App /></div>
    <ArchiveFooter />
    </AppPreflight>
  </React.StrictMode>,
);
