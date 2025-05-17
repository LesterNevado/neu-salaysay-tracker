
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupSalaysayStorageBucket } from './integrations/supabase/setupStorage';
import { checkSupabaseConnection } from './utils/supabase/checkConnection';

// Check Supabase connection on app start
const initializeSupabase = async () => {
  const isConnected = await checkSupabaseConnection();
  
  if (isConnected) {
    console.log("Supabase connection is working properly");
    
    // Try to set up the storage bucket on application start
    try {
      const result = await setupSalaysayStorageBucket();
      if (result.success) {
        console.log("Supabase storage setup:", result.message);
      } else {
        console.error("Failed to set up Supabase storage:", result.error);
      }
    } catch (err) {
      console.error("Error setting up storage:", err);
    }
  } else {
    console.error("Supabase connection failed. Please check your configuration.");
  }
};

// Initialize Supabase in background
initializeSupabase().catch(err => {
  console.error("Failed to initialize Supabase:", err);
});

// Make sure to create the ReactDOM root with the proper element
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Root element not found. Make sure there is an element with id 'root' in the HTML.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
