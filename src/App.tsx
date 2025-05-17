import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import Index from "./pages";
import Dashboard from "./pages/Dashboard";
import ActivityLogs from "./pages/ActivityLogs";
import NotFound from "./pages/NotFound";
import { supabase } from "@/integrations/supabase/client";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { Toaster } from "@/components/ui/toaster";
import Trash from "./pages/Trash"; // Import the new Trash page

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  return (
    <Router>
      <div className="container" style={{ padding: "50px 0 100px 0" }}>
        {!session ? (
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            session={session}
            providers={["google"]}
            redirectTo={`${window.location.origin}/dashboard`}
          />
        ) : (
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/activity-logs" element={<ActivityLogs />} />
            <Route path="/trash" element={<Trash />} /> {/* Add the new Trash route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        )}
      </div>
      <Toaster />
    </Router>
  );
}

export default App;
