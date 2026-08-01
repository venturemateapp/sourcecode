import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { installStudioBridge } from './runtime/studioBridge';
import App from './App';
import './styles.css';
installStudioBridge();
createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><BrowserRouter><App/></BrowserRouter></ErrorBoundary></StrictMode>);
