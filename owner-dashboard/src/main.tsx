import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { App } from './App';
import './styles.css';

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {convexUrl ? (
      <ConvexProvider client={new ConvexReactClient(convexUrl)}>
        <App />
      </ConvexProvider>
    ) : (
      <div className="missing-config">
        <h1>MUSINSA Owner Dashboard</h1>
        <p>VITE_CONVEX_URL is not configured. Deploy Convex and set the Vercel environment variable.</p>
      </div>
    )}
  </React.StrictMode>
);
