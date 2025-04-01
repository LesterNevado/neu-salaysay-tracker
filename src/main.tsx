
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupSalaysayStorageBucket } from './integrations/supabase/setupStorage';
import { checkSupabaseConnection } from './utils/supabase/checkConnection';

// Check Supabase connection on app start
checkSupabaseConnection().then(isConnected => {
  if (isConnected) {
    console.log("Supabase connection is working properly");
    
    // Try to set up the storage bucket on application start
    setupSalaysayStorageBucket().then(result => {
      if (result.success) {
        console.log("Supabase storage setup:", result.message);
      } else {
        console.error("Failed to set up Supabase storage:", result.error);
      }
    });
  } else {
    console.error("Supabase connection failed. Please check your configuration.");
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
