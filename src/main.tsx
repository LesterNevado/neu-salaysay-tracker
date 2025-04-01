
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupSalaysayStorageBucket } from './integrations/supabase/setupStorage';

// Try to set up the storage bucket on application start
setupSalaysayStorageBucket().then(result => {
  if (result.success) {
    console.log("Supabase storage setup:", result.message);
  } else {
    console.error("Failed to set up Supabase storage:", result.error);
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
